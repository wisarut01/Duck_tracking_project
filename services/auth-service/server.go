package main

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	"github.com/duck/tracking_board/services/internal/svc"
)

// User is the users table in auth_db.
// Emails are unique ignoring case ("Duck@Example.com" == "duck@example.com").
type User struct {
	ID           string `gorm:"type:uuid;primaryKey"`
	Email        string `gorm:"not null;index:idx_users_email_lower,unique,expression:lower(email)"`
	PasswordHash string `gorm:"not null"`
	DisplayName  string `gorm:"not null"`
	AvatarURL    *string
	CreatedAt    time.Time
}

const tokenTTL = 24 * time.Hour

type server struct {
	authv1.UnimplementedAuthServiceServer
	db        *gorm.DB
	jwtSecret []byte
	now       func() time.Time
}

func newServer(db *gorm.DB, jwtSecret string) *server {
	return &server{db: db, jwtSecret: []byte(jwtSecret), now: time.Now}
}

func (s *server) Register(ctx context.Context, req *authv1.RegisterRequest) (*authv1.RegisterResponse, error) {
	email := strings.TrimSpace(req.GetEmail())
	displayName := strings.TrimSpace(req.GetDisplayName())
	if _, err := mail.ParseAddress(email); err != nil {
		return nil, status.Error(codes.InvalidArgument, "email: must be a valid email address")
	}
	if len(req.GetPassword()) < 8 {
		return nil, status.Error(codes.InvalidArgument, "password: must be at least 8 characters")
	}
	if displayName == "" || len([]rune(displayName)) > 50 {
		return nil, status.Error(codes.InvalidArgument, "displayName: must be 1 to 50 characters")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.GetPassword()), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user := User{ID: uuid.NewString(), Email: email, PasswordHash: string(hash), DisplayName: displayName}
	if err := s.db.WithContext(ctx).Create(&user).Error; err != nil {
		if svc.IsUniqueViolation(err) {
			return nil, status.Errorf(codes.AlreadyExists, "email %s already registered", email)
		}
		return nil, err
	}

	token, err := s.signToken(user)
	if err != nil {
		return nil, err
	}
	return &authv1.RegisterResponse{AccessToken: token, User: toProto(user)}, nil
}

func (s *server) Login(ctx context.Context, req *authv1.LoginRequest) (*authv1.LoginResponse, error) {
	// Same message for "no such user" and "wrong password" — don't leak which one.
	invalid := status.Error(codes.Unauthenticated, "invalid email or password")

	var user User
	err := s.db.WithContext(ctx).Where("lower(email) = lower(?)", strings.TrimSpace(req.GetEmail())).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, invalid
	}
	if err != nil {
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.GetPassword())) != nil {
		return nil, invalid
	}

	token, err := s.signToken(user)
	if err != nil {
		return nil, err
	}
	return &authv1.LoginResponse{AccessToken: token, User: toProto(user)}, nil
}

func (s *server) ValidateToken(ctx context.Context, req *authv1.ValidateTokenRequest) (*authv1.ValidateTokenResponse, error) {
	claims := jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(req.GetAccessToken(), &claims,
		func(*jwt.Token) (any, error) { return s.jwtSecret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithTimeFunc(s.now),
	)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid or expired token")
	}

	user, err := s.findUser(ctx, claims.Subject)
	if status.Code(err) == codes.NotFound {
		return nil, status.Error(codes.Unauthenticated, "user for this token no longer exists")
	}
	if err != nil {
		return nil, err
	}
	return &authv1.ValidateTokenResponse{User: toProto(user)}, nil
}

func (s *server) GetUser(ctx context.Context, req *authv1.GetUserRequest) (*authv1.GetUserResponse, error) {
	user, err := s.findUser(ctx, req.GetId())
	if err != nil {
		return nil, err
	}
	return &authv1.GetUserResponse{User: toProto(user)}, nil
}

func (s *server) ListUsers(ctx context.Context, req *authv1.ListUsersRequest) (*authv1.ListUsersResponse, error) {
	query := s.db.WithContext(ctx).Order("created_at, id")
	if len(req.GetIds()) > 0 {
		// Unknown ids are skipped — and so are ids that aren't even UUIDs
		// (Postgres would reject them for the uuid column).
		ids := make([]string, 0, len(req.GetIds()))
		for _, id := range req.GetIds() {
			if uuid.Validate(id) == nil {
				ids = append(ids, id)
			}
		}
		if len(ids) == 0 {
			return &authv1.ListUsersResponse{}, nil
		}
		query = query.Where("id IN ?", ids)
	}

	var users []User
	if err := query.Find(&users).Error; err != nil {
		return nil, err
	}
	resp := &authv1.ListUsersResponse{Users: make([]*authv1.User, len(users))}
	for i, u := range users {
		resp.Users[i] = toProto(u)
	}
	return resp, nil
}

func (s *server) findUser(ctx context.Context, id string) (User, error) {
	var user User
	if uuid.Validate(id) != nil {
		return user, status.Errorf(codes.NotFound, "user %s not found", id)
	}
	err := s.db.WithContext(ctx).First(&user, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return user, status.Errorf(codes.NotFound, "user %s not found", id)
	}
	return user, err
}

func (s *server) signToken(user User) (string, error) {
	now := s.now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   user.ID,
		"email": user.Email,
		"iat":   now.Unix(),
		"exp":   now.Add(tokenTTL).Unix(),
	})
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return signed, nil
}

func toProto(u User) *authv1.User {
	return &authv1.User{Id: u.ID, Email: u.Email, DisplayName: u.DisplayName, AvatarUrl: u.AvatarURL}
}

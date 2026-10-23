package main

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	"github.com/duck/tracking_board/services/internal/svc"
)

// supabaseAuth is AUTH_MODE=supabase (production): people sign in with Google
// through Supabase Auth in the browser, and the access token Supabase gives
// them is what the gateway sends to ValidateToken. We check it, check the
// email is allowed, and keep our own row in users (created on first sign-in).
type supabaseAuth struct {
	keys     jwt.Keyfunc // Supabase's public keys (JWKS)
	issuer   string      // https://<ref>.supabase.co/auth/v1
	allowed  allowlist
	audience string
}

// supabaseClaims is the part of a Supabase access token we use.
type supabaseClaims struct {
	jwt.RegisteredClaims
	Email        string `json:"email"`
	UserMetadata struct {
		FullName  string `json:"full_name"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
	} `json:"user_metadata"`
}

// newSupabaseAuth loads Supabase's public signing keys (JWKS). They are
// refreshed in the background, so key rotation in Supabase just works.
func newSupabaseAuth(supabaseURL, allowedEmails string) (*supabaseAuth, error) {
	supabaseURL = strings.TrimRight(supabaseURL, "/")
	if !strings.HasPrefix(supabaseURL, "https://") {
		return nil, fmt.Errorf("SUPABASE_URL must be https://<ref>.supabase.co, got %q", supabaseURL)
	}
	allowed := parseAllowlist(allowedEmails)
	if len(allowed) == 0 {
		return nil, errors.New(`ALLOWED_EMAILS is empty: nobody could sign in (use "*" to let every Google account in)`)
	}
	keys, err := keyfunc.NewDefault([]string{supabaseURL + "/auth/v1/.well-known/jwks.json"})
	if err != nil {
		return nil, fmt.Errorf("load Supabase signing keys: %w", err)
	}
	return &supabaseAuth{keys: keys.Keyfunc, issuer: supabaseURL + "/auth/v1", allowed: allowed, audience: "authenticated"}, nil
}

// allowlist is ALLOWED_EMAILS: "me@gmail.com, friend@gmail.com, @mycompany.com".
// An entry starting with "@" allows the whole domain, "*" allows every
// signed-in account. Empty = nobody.
type allowlist []string

func parseAllowlist(s string) allowlist {
	var out allowlist
	for _, entry := range strings.Split(s, ",") {
		if entry = strings.ToLower(strings.TrimSpace(entry)); entry != "" {
			out = append(out, entry)
		}
	}
	return out
}

func (a allowlist) allows(email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return false
	}
	for _, entry := range a {
		if entry == "*" || entry == email || (strings.HasPrefix(entry, "@") && strings.HasSuffix(email, entry)) {
			return true
		}
	}
	return false
}

// validateSupabase checks a Supabase access token and returns our user for it.
func (s *server) validateSupabase(ctx context.Context, token string) (*authv1.User, error) {
	claims := supabaseClaims{}
	_, err := jwt.ParseWithClaims(token, &claims, s.supabase.keys,
		jwt.WithValidMethods([]string{"ES256", "RS256"}), // Supabase's asymmetric signing keys
		jwt.WithIssuer(s.supabase.issuer),
		jwt.WithAudience(s.supabase.audience),
		jwt.WithExpirationRequired(),
		jwt.WithTimeFunc(s.now),
	)
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid or expired token")
	}
	if !s.supabase.allowed.allows(claims.Email) {
		// 403, not 401: the sign-in worked, this account just isn't on the list.
		return nil, status.Errorf(codes.PermissionDenied, "%s is not allowed to use this app — ask the owner to add it", claims.Email)
	}

	user, err := s.upsertSupabaseUser(ctx, claims)
	if err != nil {
		return nil, err
	}
	return toProto(user), nil
}

// upsertSupabaseUser finds the user by email, or creates them on their first
// sign-in (id = the Supabase user id, name and picture from Google).
func (s *server) upsertSupabaseUser(ctx context.Context, claims supabaseClaims) (User, error) {
	db := s.db.WithContext(ctx)
	var user User
	err := db.Where("lower(email) = lower(?)", claims.Email).First(&user).Error
	if err == nil || !errors.Is(err, gorm.ErrRecordNotFound) {
		return user, err
	}

	id := claims.Subject
	if uuid.Validate(id) != nil {
		id = uuid.NewString()
	}
	name := claims.UserMetadata.FullName
	if name == "" {
		name = claims.UserMetadata.Name
	}
	if name == "" {
		name, _, _ = strings.Cut(claims.Email, "@")
	}
	if len([]rune(name)) > 50 {
		name = string([]rune(name)[:50])
	}
	var avatar *string
	if claims.UserMetadata.AvatarURL != "" {
		avatar = &claims.UserMetadata.AvatarURL
	}

	user = User{ID: id, Email: claims.Email, DisplayName: name, AvatarURL: avatar, PasswordHash: ""}
	if err := db.Create(&user).Error; err != nil {
		if svc.IsUniqueViolation(err) { // two first requests at the same moment
			err = db.Where("lower(email) = lower(?)", claims.Email).First(&user).Error
			return user, err
		}
		return user, fmt.Errorf("create user %s: %w", claims.Email, err)
	}
	return user, nil
}

var errPasswordLoginDisabled = status.Error(codes.PermissionDenied, "password sign-in is turned off here — sign in with Google")

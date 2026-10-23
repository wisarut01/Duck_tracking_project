package main

import (
	"context"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	"github.com/duck/tracking_board/services/internal/svctest"
)

func newTestServer(t *testing.T) *server {
	return newServer(svctest.DB(t, &User{}), "test-secret")
}

func wantCode(t *testing.T, err error, want codes.Code) {
	t.Helper()
	if got := status.Code(err); got != want {
		t.Fatalf("got %v (%v), want %v", got, err, want)
	}
}

func register(t *testing.T, s *server, email string) *authv1.RegisterResponse {
	t.Helper()
	resp, err := s.Register(context.Background(), &authv1.RegisterRequest{Email: email, Password: "password123", DisplayName: " Duck "})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	return resp
}

func TestRegisterLoginValidate(t *testing.T) {
	s := newTestServer(t)
	ctx := context.Background()

	reg := register(t, s, "duck@example.com")
	if reg.User.DisplayName != "Duck" {
		t.Errorf("displayName = %q, want trimmed %q", reg.User.DisplayName, "Duck")
	}
	if reg.User.AvatarUrl != nil {
		t.Errorf("avatarUrl = %v, want unset", *reg.User.AvatarUrl)
	}

	// Email is matched ignoring case.
	login, err := s.Login(ctx, &authv1.LoginRequest{Email: "DUCK@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	got, err := s.ValidateToken(ctx, &authv1.ValidateTokenRequest{AccessToken: login.AccessToken})
	if err != nil {
		t.Fatalf("validate: %v", err)
	}
	if got.User.Id != reg.User.Id {
		t.Errorf("token user = %s, want %s", got.User.Id, reg.User.Id)
	}
}

func TestRegisterErrors(t *testing.T) {
	s := newTestServer(t)
	ctx := context.Background()
	register(t, s, "duck@example.com")

	_, err := s.Register(ctx, &authv1.RegisterRequest{Email: "Duck@Example.com", Password: "password123", DisplayName: "x"})
	wantCode(t, err, codes.AlreadyExists)

	for name, req := range map[string]*authv1.RegisterRequest{
		"bad email":      {Email: "nope", Password: "password123", DisplayName: "x"},
		"short password": {Email: "a@example.com", Password: "short", DisplayName: "x"},
		"blank name":     {Email: "a@example.com", Password: "password123", DisplayName: "   "},
	} {
		_, err := s.Register(ctx, req)
		if status.Code(err) != codes.InvalidArgument {
			t.Errorf("%s: got %v, want InvalidArgument", name, err)
		}
	}
}

func TestLoginWrongPassword(t *testing.T) {
	s := newTestServer(t)
	register(t, s, "duck@example.com")

	_, err := s.Login(context.Background(), &authv1.LoginRequest{Email: "duck@example.com", Password: "wrong-password"})
	wantCode(t, err, codes.Unauthenticated)
	_, err = s.Login(context.Background(), &authv1.LoginRequest{Email: "nobody@example.com", Password: "password123"})
	wantCode(t, err, codes.Unauthenticated)
}

func TestValidateTokenRejects(t *testing.T) {
	s := newTestServer(t)
	ctx := context.Background()
	reg := register(t, s, "duck@example.com")

	_, err := s.ValidateToken(ctx, &authv1.ValidateTokenRequest{AccessToken: "not.a.jwt"})
	wantCode(t, err, codes.Unauthenticated)

	// Signed with another secret.
	other := newServer(s.db, "another-secret")
	forged, _ := other.signToken(User{ID: reg.User.Id})
	_, err = s.ValidateToken(ctx, &authv1.ValidateTokenRequest{AccessToken: forged})
	wantCode(t, err, codes.Unauthenticated)

	// Expired: issue a token "25 hours ago".
	old := newServer(s.db, "test-secret")
	old.now = func() time.Time { return time.Now().Add(-25 * time.Hour) }
	expired, _ := old.signToken(User{ID: reg.User.Id})
	_, err = s.ValidateToken(ctx, &authv1.ValidateTokenRequest{AccessToken: expired})
	wantCode(t, err, codes.Unauthenticated)
}

func TestListUsers(t *testing.T) {
	s := newTestServer(t)
	ctx := context.Background()
	a := register(t, s, "a@example.com").User
	b := register(t, s, "b@example.com").User

	all, err := s.ListUsers(ctx, &authv1.ListUsersRequest{})
	if err != nil || len(all.Users) != 2 {
		t.Fatalf("all users = %v, %v", all, err)
	}
	// Unknown and non-UUID ids are skipped, not an error.
	some, err := s.ListUsers(ctx, &authv1.ListUsersRequest{Ids: []string{b.Id, "7f1c2a9e-0000-4000-8000-00000000ffff", "x"}})
	if err != nil || len(some.Users) != 1 || some.Users[0].Id != b.Id {
		t.Fatalf("ListUsers(b) = %v, %v", some, err)
	}

	got, err := s.GetUser(ctx, &authv1.GetUserRequest{Id: a.Id})
	if err != nil || got.User.Email != "a@example.com" {
		t.Fatalf("GetUser = %v, %v", got, err)
	}
	_, err = s.GetUser(ctx, &authv1.GetUserRequest{Id: "not-a-uuid"})
	wantCode(t, err, codes.NotFound)
}

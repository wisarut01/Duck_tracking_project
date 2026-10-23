package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc/codes"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	"github.com/duck/tracking_board/services/internal/svctest"
)

const testIssuer = "https://example.supabase.co/auth/v1"

// fakeSupabase signs tokens like Supabase does (ES256 + kid) and serves the
// matching public key as a JWKS.
type fakeSupabase struct {
	key *ecdsa.PrivateKey
}

func newFakeSupabase(t *testing.T) (*fakeSupabase, jwt.Keyfunc) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	b64 := func(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }
	jwks, _ := json.Marshal(map[string]any{"keys": []map[string]string{{
		"kty": "EC", "crv": "P-256", "kid": "test-key", "alg": "ES256", "use": "sig",
		"x": b64(key.X.FillBytes(make([]byte, 32))), "y": b64(key.Y.FillBytes(make([]byte, 32))),
	}}})
	keys, err := keyfunc.NewJWKSetJSON(jwks)
	if err != nil {
		t.Fatal(err)
	}
	return &fakeSupabase{key: key}, keys.Keyfunc
}

func (f *fakeSupabase) token(t *testing.T, email string, edit func(jwt.MapClaims)) string {
	t.Helper()
	claims := jwt.MapClaims{
		"iss":   testIssuer,
		"aud":   "authenticated",
		"sub":   "11111111-2222-4333-8444-555555555555",
		"exp":   time.Now().Add(time.Hour).Unix(),
		"email": email,
		"user_metadata": map[string]any{
			"full_name": "Duck Tester", "avatar_url": "https://lh3.googleusercontent.com/a/duck",
		},
	}
	if edit != nil {
		edit(claims)
	}
	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = "test-key"
	signed, err := token.SignedString(f.key)
	if err != nil {
		t.Fatal(err)
	}
	return signed
}

func newSupabaseTestServer(t *testing.T, allowed string) (*server, *fakeSupabase) {
	fake, keys := newFakeSupabase(t)
	s := newServer(svctest.DB(t, &User{}), "unused")
	s.supabase = &supabaseAuth{keys: keys, issuer: testIssuer, audience: "authenticated", allowed: parseAllowlist(allowed)}
	return s, fake
}

func TestAllowlist(t *testing.T) {
	list := parseAllowlist(" Me@Gmail.com, , @team.co ")
	for email, want := range map[string]bool{
		"me@gmail.com":      true,
		"ME@GMAIL.COM":      true,
		"anyone@team.co":    true,
		"other@gmail.com":   false,
		"me@gmail.com.evil": false,
		"x@evilteam.co":     false, // "@team.co" must match the whole domain
		"":                  false,
	} {
		if got := list.allows(email); got != want {
			t.Errorf("allows(%q) = %v, want %v", email, got, want)
		}
	}

	everyone := parseAllowlist("*")
	if !everyone.allows("anyone@gmail.com") || everyone.allows("") {
		t.Error(`"*" should allow every account (but not a token without an email)`)
	}
}

func TestSupabaseSignIn(t *testing.T) {
	s, fake := newSupabaseTestServer(t, "duck@gmail.com")
	ctx := context.Background()

	first, err := s.ValidateToken(ctx, &authv1.ValidateTokenRequest{AccessToken: fake.token(t, "Duck@gmail.com", nil)})
	if err != nil {
		t.Fatalf("first sign-in: %v", err)
	}
	u := first.User
	if u.Id != "11111111-2222-4333-8444-555555555555" || u.DisplayName != "Duck Tester" || u.GetAvatarUrl() == "" {
		t.Errorf("created user = %v", u)
	}

	// Signing in again finds the same user, it doesn't create another one.
	again, err := s.ValidateToken(ctx, &authv1.ValidateTokenRequest{AccessToken: fake.token(t, "duck@gmail.com", nil)})
	if err != nil || again.User.Id != u.Id {
		t.Fatalf("second sign-in = %v, %v", again, err)
	}
	all, _ := s.ListUsers(ctx, &authv1.ListUsersRequest{})
	if len(all.Users) != 1 {
		t.Errorf("%d users, want 1", len(all.Users))
	}
}

func TestSupabaseRejects(t *testing.T) {
	s, fake := newSupabaseTestServer(t, "duck@gmail.com")
	other, _ := newFakeSupabase(t)
	ctx := context.Background()
	validate := func(token string) error {
		_, err := s.ValidateToken(ctx, &authv1.ValidateTokenRequest{AccessToken: token})
		return err
	}

	wantCode(t, validate(fake.token(t, "stranger@gmail.com", nil)), codes.PermissionDenied)
	wantCode(t, validate(other.token(t, "duck@gmail.com", nil)), codes.Unauthenticated) // signed by someone else
	wantCode(t, validate(fake.token(t, "duck@gmail.com", func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Minute).Unix() })), codes.Unauthenticated)
	wantCode(t, validate(fake.token(t, "duck@gmail.com", func(c jwt.MapClaims) { c["iss"] = "https://evil.supabase.co/auth/v1" })), codes.Unauthenticated)
	wantCode(t, validate(fake.token(t, "duck@gmail.com", func(c jwt.MapClaims) { c["aud"] = "anon" })), codes.Unauthenticated)

	// Our own password tokens don't work in supabase mode.
	local, _ := newServer(s.db, "unused").signToken(User{ID: "11111111-2222-4333-8444-555555555555"})
	wantCode(t, validate(local), codes.Unauthenticated)

	// And register / login are turned off.
	_, err := s.Register(ctx, &authv1.RegisterRequest{Email: "duck@gmail.com", Password: "password123", DisplayName: "x"})
	wantCode(t, err, codes.PermissionDenied)
	_, err = s.Login(ctx, &authv1.LoginRequest{Email: "duck@gmail.com", Password: "password123"})
	wantCode(t, err, codes.PermissionDenied)
}

// auth-service — users, passwords (bcrypt) and JWT. gRPC: proto/auth/v1/auth.proto
//
// Env:
//
//	DATABASE_URL    postgres://tb:tb@localhost:5432/auth_db?sslmode=disable
//	DB_SCHEMA       "" = tables in the default schema; set = tables in that schema (Supabase)
//	AUTH_MODE       "password" (default: register/login with our own JWT) or
//	                "supabase" (Google sign-in through Supabase Auth; register/login are off)
//	JWT_SECRET      password mode: HS256 secret for access tokens (set your own outside dev!)
//	SUPABASE_URL    supabase mode: https://<ref>.supabase.co (tokens are checked with its public keys)
//	ALLOWED_EMAILS  supabase mode: who may use the app, e.g. "me@gmail.com,friend@gmail.com,@team.com",
//	                or "*" for every Google account
//	GRPC_ADDR       :50051
//	SEED_DEMO_DATA  "true" = add the demo users (duck/mint/ploy) when the table is empty
package main

import (
	"log"
	"os"

	"google.golang.org/grpc"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	"github.com/duck/tracking_board/services/internal/svc"
)

const devJWTSecret = "dev-secret-do-not-use-in-prod"

func main() {
	db, err := svc.OpenDB(svc.Env("DATABASE_URL", "postgres://tb:tb@localhost:5432/auth_db?sslmode=disable"), svc.Env("DB_SCHEMA", ""))
	if err != nil {
		log.Fatal(err)
	}
	if err := db.AutoMigrate(&User{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if svc.Env("SEED_DEMO_DATA", "false") == "true" {
		if err := seed(db); err != nil {
			log.Fatalf("seed: %v", err)
		}
	}

	srv := newServer(db, svc.Env("JWT_SECRET", devJWTSecret))
	switch mode := svc.Env("AUTH_MODE", "password"); mode {
	case "password":
		if string(srv.jwtSecret) == devJWTSecret {
			log.Print("WARNING: JWT_SECRET is not set, using the dev secret")
		}
	case "supabase":
		if srv.supabase, err = newSupabaseAuth(os.Getenv("SUPABASE_URL"), os.Getenv("ALLOWED_EMAILS")); err != nil {
			log.Fatal(err)
		}
		log.Printf("auth: Google sign-in via %s, %d allowed email(s)/domain(s)", srv.supabase.issuer, len(srv.supabase.allowed))
	default:
		log.Fatalf("AUTH_MODE must be password or supabase, not %q", mode)
	}

	svc.Serve("auth-service", svc.Env("GRPC_ADDR", ":50051"), func(s *grpc.Server) {
		authv1.RegisterAuthServiceServer(s, srv)
	})
}

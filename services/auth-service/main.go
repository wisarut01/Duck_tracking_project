// auth-service — users, passwords (bcrypt) and JWT. gRPC: proto/auth/v1/auth.proto
//
// Env:
//
//	DATABASE_URL    postgres://tb:tb@localhost:5432/auth_db?sslmode=disable
//	JWT_SECRET      HS256 secret for access tokens (set your own outside dev!)
//	GRPC_ADDR       :50051
//	SEED_DEMO_DATA  "true" = add the demo users (duck/mint/ploy) when the table is empty
package main

import (
	"log"

	"google.golang.org/grpc"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	"github.com/duck/tracking_board/services/internal/svc"
)

const devJWTSecret = "dev-secret-do-not-use-in-prod"

func main() {
	db, err := svc.OpenDB(svc.Env("DATABASE_URL", "postgres://tb:tb@localhost:5432/auth_db?sslmode=disable"))
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

	secret := svc.Env("JWT_SECRET", devJWTSecret)
	if secret == devJWTSecret {
		log.Print("WARNING: JWT_SECRET is not set, using the dev secret")
	}

	svc.Serve("auth-service", svc.Env("GRPC_ADDR", ":50051"), func(s *grpc.Server) {
		authv1.RegisterAuthServiceServer(s, newServer(db, secret))
	})
}

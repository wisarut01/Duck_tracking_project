// tracker-service — projects, issues, comments and issue↔page links.
// gRPC: proto/tracker/v1/tracker.proto
//
// Env:
//
//	DATABASE_URL    postgres://tb:tb@localhost:5432/tracker_db?sslmode=disable
//	GRPC_ADDR       :50052
//	SEED_DEMO_DATA  "true" = add the demo project TB when there are no projects
package main

import (
	"log"

	"google.golang.org/grpc"

	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
	"github.com/duck/tracking_board/services/internal/svc"
)

func main() {
	db, err := svc.OpenDB(svc.Env("DATABASE_URL", "postgres://tb:tb@localhost:5432/tracker_db?sslmode=disable"))
	if err != nil {
		log.Fatal(err)
	}
	if err := db.AutoMigrate(allModels...); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if svc.Env("SEED_DEMO_DATA", "false") == "true" {
		if err := seed(db); err != nil {
			log.Fatalf("seed: %v", err)
		}
	}

	svc.Serve("tracker-service", svc.Env("GRPC_ADDR", ":50052"), func(s *grpc.Server) {
		trackerv1.RegisterTrackerServiceServer(s, &server{db: db})
	})
}

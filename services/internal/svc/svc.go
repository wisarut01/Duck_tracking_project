// Package svc holds the small bits every Go gRPC service needs:
// reading env vars, connecting to Postgres, and running the gRPC server.
package svc

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Env returns the env var, or def when it is empty.
func Env(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// OpenDB connects to Postgres. It retries for a while because in Docker the
// service often starts before Postgres is ready.
func OpenDB(dsn string) (*gorm.DB, error) {
	var lastErr error
	for attempt := 0; attempt < 30; attempt++ {
		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
			// Silent: expected errors (duplicate key → AlreadyExists) aren't worth a
			// log line, and unexpected ones are logged by logUnary below.
			Logger:  logger.Default.LogMode(logger.Silent),
			NowFunc: func() time.Time { return time.Now().UTC() },
		})
		if err == nil {
			sqlDB, _ := db.DB()
			if err = sqlDB.Ping(); err == nil {
				return db, nil
			}
		}
		lastErr = err
		log.Printf("database not ready (%v), retrying…", err)
		time.Sleep(time.Second)
	}
	return nil, fmt.Errorf("connect to database: %w", lastErr)
}

// IsUniqueViolation reports whether err is Postgres "duplicate key" (23505).
func IsUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

// Serve starts a gRPC server on addr and blocks until SIGINT/SIGTERM.
// register is called with the server so the caller can attach its service.
func Serve(name, addr string, register func(*grpc.Server)) {
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("%s: listen %s: %v", name, addr, err)
	}
	server := grpc.NewServer(grpc.UnaryInterceptor(logUnary))
	register(server)

	go func() {
		stop := make(chan os.Signal, 1)
		signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
		<-stop
		log.Printf("%s: shutting down", name)
		server.GracefulStop()
	}()

	log.Printf("%s: gRPC listening on %s", name, addr)
	if err := server.Serve(lis); err != nil {
		log.Fatalf("%s: serve: %v", name, err)
	}
}

// logUnary logs one line per call: "/tracker.v1.TrackerService/GetIssue NotFound 2ms".
// Unexpected errors (not a gRPC status) are logged in full and hidden from the caller.
func logUnary(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
	started := time.Now()
	resp, err := handler(ctx, req)
	if err != nil {
		if _, ok := status.FromError(err); !ok {
			log.Printf("%s internal error: %v", info.FullMethod, err)
			err = status.Error(codes.Internal, "internal error")
		}
	}
	log.Printf("%s %s %s", info.FullMethod, status.Code(err), time.Since(started).Round(time.Millisecond))
	return resp, err
}

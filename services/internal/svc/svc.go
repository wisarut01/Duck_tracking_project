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
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/stdlib"
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

// OpenDB connects to Postgres. It retries for about a minute (1s, 2s, 4s, …
// up to 10s apart) because in Docker the service often starts before Postgres
// is ready. A wrong password is NOT retried: Supabase's pooler blocks
// everyone for a while after too many failed logins.
//
// schema "" = use the database as is (one database per service, docker compose).
// Otherwise the service's tables live in that schema, which is created if
// needed — that is how the services share one Supabase database without
// sharing tables (and stay out of "public", which Supabase exposes over HTTP).
func OpenDB(dsn, schema string) (*gorm.DB, error) {
	config, err := pgx.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	var lastErr error
	delay := time.Second
	for deadline := time.Now().Add(time.Minute); time.Now().Before(deadline); {
		sqlDB := stdlib.OpenDB(*config, stdlib.OptionAfterConnect(func(ctx context.Context, conn *pgx.Conn) error {
			return useSchema(ctx, conn, schema)
		}))
		db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{
			// Silent: expected errors (duplicate key → AlreadyExists) aren't worth a
			// log line, and unexpected ones are logged by logUnary below.
			Logger:  logger.Default.LogMode(logger.Silent),
			NowFunc: func() time.Time { return time.Now().UTC() },
		})
		if err == nil {
			if err = sqlDB.Ping(); err == nil {
				return db, nil
			}
		}
		sqlDB.Close()
		if isLoginRejected(err) {
			return nil, fmt.Errorf("database rejected the login — check the user and password in DATABASE_URL (not retrying): %w", err)
		}
		lastErr = err
		log.Printf("database not ready (%v), retrying in %s…", err, delay)
		time.Sleep(delay)
		delay = min(delay*2, 10*time.Second)
	}
	return nil, fmt.Errorf("connect to database: %w", lastErr)
}

// isLoginRejected: wrong user/password, or Supabase's pooler already blocking
// us for too many of those. Retrying only makes the block last longer.
func isLoginRejected(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && (pgErr.Code == "28P01" || pgErr.Code == "28000") {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "password authentication failed") ||
		strings.Contains(msg, "ECIRCUITBREAKER") ||
		strings.Contains(msg, "Tenant or user not found")
}

// useSchema runs on every new connection: create the schema and make it the
// only one unqualified table names resolve to.
func useSchema(ctx context.Context, conn *pgx.Conn, schema string) error {
	if schema == "" {
		return nil
	}
	name := pgx.Identifier{schema}.Sanitize()
	if _, err := conn.Exec(ctx, "CREATE SCHEMA IF NOT EXISTS "+name); err != nil {
		return fmt.Errorf("create schema %s: %w", schema, err)
	}
	_, err := conn.Exec(ctx, "SET search_path TO "+name)
	return err
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

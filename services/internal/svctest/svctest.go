// Package svctest gives each test its own empty Postgres schema.
//
// Tests that need a database are skipped unless TEST_DATABASE_URL is set, e.g.
//
//	TEST_DATABASE_URL='postgres://tb:tb@localhost:5432/tb?sslmode=disable' go test ./services/...
package svctest

import (
	"fmt"
	"net/url"
	"os"
	"testing"

	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB returns a connection whose search_path is a brand-new schema with the
// given models migrated. The schema is dropped when the test ends.
func DB(t *testing.T, models ...any) *gorm.DB {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	schema := "test_" + uuid.NewString()[:8]
	if err := admin.Exec(fmt.Sprintf("CREATE SCHEMA %q", schema)).Error; err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		admin.Exec(fmt.Sprintf("DROP SCHEMA %q CASCADE", schema))
		if sqlDB, err := admin.DB(); err == nil {
			sqlDB.Close()
		}
	})

	u, err := url.Parse(dsn)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()

	db, err := gorm.Open(postgres.Open(u.String()), &gorm.Config{Logger: logger.Discard})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() {
		if sqlDB, err := db.DB(); err == nil {
			sqlDB.Close()
		}
	})
	if err := db.AutoMigrate(models...); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

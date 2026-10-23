package main

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Demo users — same ids as the mock (services/mock-api/src/seed.js), so the
// seed data in tracker-service and docs-service points at them.
var demoUsers = []struct{ id, email, name string }{
	{"7f1c2a9e-0000-4000-8000-000000000001", "duck@example.com", "Duck"},
	{"7f1c2a9e-0000-4000-8000-000000000002", "mint@example.com", "Mint"},
	{"7f1c2a9e-0000-4000-8000-000000000003", "ploy@example.com", "Ploy"},
}

// seed adds the demo users (password "password123") if there are no users yet.
func seed(db *gorm.DB) error {
	var count int64
	if err := db.Model(&User{}).Count(&count).Error; err != nil || count > 0 {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	created := time.Date(2026, 10, 1, 9, 0, 0, 0, time.UTC)
	users := make([]User, len(demoUsers))
	for i, u := range demoUsers {
		users[i] = User{
			ID: u.id, Email: u.email, PasswordHash: string(hash), DisplayName: u.name,
			CreatedAt: created.Add(time.Duration(i) * time.Minute), // keeps ListUsers in this order
		}
	}
	return db.Create(&users).Error
}

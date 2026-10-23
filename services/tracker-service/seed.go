package main

import (
	"fmt"
	"time"

	"github.com/lib/pq"
	"gorm.io/gorm"
)

// Demo data — the same rows as the mock (services/mock-api/src/seed.js), with
// the same ids, so links from docs-service and users from auth-service match.

func seedID(prefix string, n int) string { return fmt.Sprintf("%s-0000-4000-8000-%012d", prefix, n) }

func day(d, hour, minute int) time.Time { return time.Date(2026, 10, d, hour, minute, 0, 0, time.UTC) }

var (
	userDuck = seedID("7f1c2a9e", 1)
	userMint = seedID("7f1c2a9e", 2)
	userPloy = seedID("7f1c2a9e", 3)
)

func seedPage(n int) string  { return seedID("5e6f7081", n) }
func seedIssue(n int) string { return seedID("3c4d5e6f", n) }

// seed adds the demo project TB (TB-1..TB-12, comments, links) if there are no projects yet.
func seed(db *gorm.DB) error {
	var count int64
	if err := db.Model(&Project{}).Count(&count).Error; err != nil || count > 0 {
		return err
	}
	desc := func(s string) *string { return &s }

	project := Project{
		ID: seedID("2b3c4d5e", 1), Key: "TB", Name: "Tracking Board", Description: desc("Jira + Confluence สำหรับทีมเล็ก"),
		LeadID: userDuck, NextIssueNumber: 13, CreatedAt: day(1, 9, 0),
	}

	type row struct {
		n                            int
		title, typ, status, priority string
		assignee                     *string
		labels                       []string
		description                  *string
	}
	rows := []row{
		{1, "ตั้งค่า monorepo และ CI", "TASK", "DONE", "HIGH", &userDuck, []string{"infra"}, desc("ดูรายละเอียดที่หน้า **Engineering Home**")},
		{2, "ออกแบบ architecture gateway + gRPC", "STORY", "DONE", "HIGHEST", &userDuck, []string{"backend"}, nil},
		{3, "Drag & drop การ์ดข้ามคอลัมน์", "STORY", "IN_PROGRESS", "HIGH", &userMint, []string{"frontend"}, desc("ใช้ dnd-kit ดู **Board Spec**")},
		{4, "Design system: สี ตัวอักษร spacing", "TASK", "IN_REVIEW", "MEDIUM", &userMint, []string{"frontend", "design"}, nil},
		{5, "Login / register ด้วย JWT", "STORY", "IN_PROGRESS", "HIGH", &userDuck, []string{"backend", "auth"}, nil},
		{6, "เขียน proto ของ tracker-service", "TASK", "TODO", "MEDIUM", &userDuck, []string{"backend"}, desc("ดู **gRPC Contracts**")},
		{7, "Schema ตาราง issue_page_links", "TASK", "TODO", "MEDIUM", &userPloy, []string{"backend", "db"}, nil},
		{8, "ปุ่ม Create issue กดสองครั้งแล้วสร้างซ้ำ", "BUG", "TODO", "HIGH", nil, []string{"frontend"}, desc("กดเร็วๆ สองครั้ง ได้ issue 2 ใบ")},
		{9, "คู่มือ setup เครื่อง dev", "TASK", "IN_REVIEW", "LOW", &userPloy, []string{"docs"}, nil},
		{10, "Search รวม issue + page", "STORY", "TODO", "MEDIUM", nil, []string{"backend", "search"}, nil},
		{11, "Markdown render TB-xx เป็นลิงก์ไม่ได้ใน code block", "BUG", "IN_PROGRESS", "LOWEST", &userMint, []string{"frontend"}, nil},
		{12, "ทำหน้า Kanban board", "STORY", "IN_PROGRESS", "HIGHEST", &userMint, []string{"frontend"}, desc("ลากการ์ดข้ามคอลัมน์ได้ ดู spec ที่หน้า **Board Spec**")},
	}
	positions := map[string]float64{}
	issues := make([]Issue, len(rows))
	for i, r := range rows {
		positions[r.status] += positionGap
		issues[i] = Issue{
			ID: seedIssue(r.n), Key: fmt.Sprintf("TB-%d", r.n), ProjectKey: "TB",
			Title: r.title, Description: r.description, Type: r.typ, Status: r.status, Priority: r.priority,
			AssigneeID: r.assignee, ReporterID: userDuck, Position: positions[r.status], Labels: pq.StringArray(r.labels),
			CreatedAt: day(2, 8+r.n%10, 0), UpdatedAt: day(3+r.n%5, 8, 30),
		}
	}

	comments := []Comment{
		{ID: seedID("4d5e6f70", 1), IssueID: seedIssue(12), AuthorID: userMint, Body: "เริ่มทำแล้ว ใช้ dnd-kit", CreatedAt: day(3, 8, 30)},
		{ID: seedID("4d5e6f70", 2), IssueID: seedIssue(12), AuthorID: userDuck, Body: "อย่าลืมเรียก `POST /issues/{key}/move` ตอน drop นะ", CreatedAt: day(3, 9, 15)},
		{ID: seedID("4d5e6f70", 3), IssueID: seedIssue(8), AuthorID: userPloy, Body: "เจอใน Chrome และ Firefox", CreatedAt: day(4, 13, 0)},
		{ID: seedID("4d5e6f70", 4), IssueID: seedIssue(5), AuthorID: userDuck, Body: "mock ใช้ JWT จริงแล้ว (HS256)", CreatedAt: day(5, 10, 0)},
	}

	links := []IssuePageLink{
		{IssueID: seedIssue(12), PageID: seedPage(1), CreatedAt: day(4, 9, 0)}, // Board Spec
		{IssueID: seedIssue(3), PageID: seedPage(1), CreatedAt: day(4, 9, 0)},
		{IssueID: seedIssue(6), PageID: seedPage(4), CreatedAt: day(4, 9, 0)}, // gRPC Contracts
		{IssueID: seedIssue(7), PageID: seedPage(5), CreatedAt: day(4, 9, 0)}, // Database Schema
		{IssueID: seedIssue(4), PageID: seedPage(7), CreatedAt: day(5, 9, 0)}, // Design System
		{IssueID: seedIssue(2), PageID: seedPage(3), CreatedAt: day(3, 9, 0)}, // Architecture
	}

	return db.Transaction(func(tx *gorm.DB) error {
		for _, rows := range []any{&project, &issues, &comments, &links} {
			if err := tx.Create(rows).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

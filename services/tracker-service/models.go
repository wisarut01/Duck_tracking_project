package main

import (
	"strings"
	"time"

	"github.com/lib/pq"
	"google.golang.org/protobuf/types/known/timestamppb"

	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
)

// Tables in tracker_db. Users and pages live in other services, so they are
// stored as plain ids (no foreign keys across services).

type Project struct {
	ID              string `gorm:"type:uuid;primaryKey"`
	Key             string `gorm:"not null;uniqueIndex"`
	Name            string `gorm:"not null"`
	Description     *string
	LeadID          string `gorm:"type:uuid;not null"`
	NextIssueNumber int    `gorm:"not null;default:1"` // TB-1, TB-2, … (never reused)
	CreatedAt       time.Time
}

// Issue.Type/Status/Priority hold the REST names ("TODO", "BUG", …) so the
// table is easy to read in psql.
type Issue struct {
	ID          string `gorm:"type:uuid;primaryKey"`
	Key         string `gorm:"not null;uniqueIndex"`
	ProjectKey  string `gorm:"not null;index"`
	Title       string `gorm:"not null"`
	Description *string
	Type        string         `gorm:"not null"`
	Status      string         `gorm:"not null"`
	Priority    string         `gorm:"not null"`
	AssigneeID  *string        `gorm:"type:uuid"`
	ReporterID  string         `gorm:"type:uuid;not null"`
	Position    float64        `gorm:"not null"` // order inside the column, smaller = higher
	Labels      pq.StringArray `gorm:"type:text[];not null;default:'{}'"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Comment struct {
	ID        string `gorm:"type:uuid;primaryKey"`
	IssueID   string `gorm:"type:uuid;not null;index"`
	AuthorID  string `gorm:"type:uuid;not null"`
	Body      string `gorm:"not null"`
	CreatedAt time.Time
}

// IssuePageLink is one issue ↔ page link. It is read from both sides.
type IssuePageLink struct {
	IssueID   string `gorm:"type:uuid;primaryKey"`
	PageID    string `gorm:"type:uuid;primaryKey;index"`
	CreatedAt time.Time
}

var allModels = []any{&Project{}, &Issue{}, &Comment{}, &IssuePageLink{}}

// boardOrder sorts issues like the board: by column, then top → bottom.
// Columns are qualified so it also works when joined with issue_page_links.
const boardOrder = "CASE issues.status WHEN 'TODO' THEN 1 WHEN 'IN_PROGRESS' THEN 2 WHEN 'IN_REVIEW' THEN 3 ELSE 4 END, issues.position, issues.created_at"

// ---- enums: proto ISSUE_STATUS_IN_REVIEW <-> stored "IN_REVIEW" ----

func enumName(names map[int32]string, prefix string, v int32) string {
	return strings.TrimPrefix(names[v], prefix)
}

func enumValue(values map[string]int32, prefix, name string) int32 {
	return values[prefix+name]
}

func statusName(s trackerv1.IssueStatus) string {
	return enumName(trackerv1.IssueStatus_name, "ISSUE_STATUS_", int32(s))
}

func typeName(t trackerv1.IssueType) string {
	return enumName(trackerv1.IssueType_name, "ISSUE_TYPE_", int32(t))
}

func priorityName(p trackerv1.IssuePriority) string {
	return enumName(trackerv1.IssuePriority_name, "ISSUE_PRIORITY_", int32(p))
}

// ---- rows → proto ----

func projectProto(p Project, issueCount int32) *trackerv1.Project {
	return &trackerv1.Project{
		Id: p.ID, Key: p.Key, Name: p.Name, Description: p.Description, LeadId: p.LeadID,
		IssueCount: issueCount, CreateTime: timestamppb.New(p.CreatedAt),
	}
}

func issueProto(i Issue, linkedPageCount int32) *trackerv1.Issue {
	labels := []string(i.Labels)
	if labels == nil {
		labels = []string{}
	}
	return &trackerv1.Issue{
		Id:              i.ID,
		Key:             i.Key,
		ProjectKey:      i.ProjectKey,
		Title:           i.Title,
		Description:     i.Description,
		Type:            trackerv1.IssueType(enumValue(trackerv1.IssueType_value, "ISSUE_TYPE_", i.Type)),
		Status:          trackerv1.IssueStatus(enumValue(trackerv1.IssueStatus_value, "ISSUE_STATUS_", i.Status)),
		Priority:        trackerv1.IssuePriority(enumValue(trackerv1.IssuePriority_value, "ISSUE_PRIORITY_", i.Priority)),
		AssigneeId:      i.AssigneeID,
		ReporterId:      i.ReporterID,
		Position:        i.Position,
		Labels:          labels,
		LinkedPageCount: linkedPageCount,
		CreateTime:      timestamppb.New(i.CreatedAt),
		UpdateTime:      timestamppb.New(i.UpdatedAt),
	}
}

func commentProto(c Comment, issueKey string) *trackerv1.Comment {
	return &trackerv1.Comment{
		Id: c.ID, IssueKey: issueKey, AuthorId: c.AuthorID, Body: c.Body, CreateTime: timestamppb.New(c.CreatedAt),
	}
}

package main

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/fieldmaskpb"

	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
	"github.com/duck/tracking_board/services/internal/svctest"
)

const (
	userA = "7f1c2a9e-0000-4000-8000-0000000000a1"
	userB = "7f1c2a9e-0000-4000-8000-0000000000b2"
	pageX = "5e6f7081-0000-4000-8000-0000000000aa"
	pageY = "5e6f7081-0000-4000-8000-0000000000bb"
)

var ctx = context.Background()

func newTestServer(t *testing.T) *server {
	s := &server{db: svctest.DB(t, allModels...)}
	if _, err := s.CreateProject(ctx, &trackerv1.CreateProjectRequest{Key: "TB", Name: " Tracking Board ", LeadId: userA}); err != nil {
		t.Fatalf("create project: %v", err)
	}
	return s
}

func wantCode(t *testing.T, err error, want codes.Code) {
	t.Helper()
	if got := status.Code(err); got != want {
		t.Fatalf("got %v (%v), want %v", got, err, want)
	}
}

func createIssue(t *testing.T, s *server, title string) *trackerv1.Issue {
	t.Helper()
	resp, err := s.CreateIssue(ctx, &trackerv1.CreateIssueRequest{
		ProjectKey: "TB", Title: title, Type: trackerv1.IssueType_ISSUE_TYPE_TASK, ReporterId: userA,
	})
	if err != nil {
		t.Fatalf("create issue: %v", err)
	}
	return resp.Issue
}

func move(t *testing.T, s *server, key string, st trackerv1.IssueStatus, after, before *string) *trackerv1.Issue {
	t.Helper()
	resp, err := s.MoveIssue(ctx, &trackerv1.MoveIssueRequest{Key: key, Status: st, AfterKey: after, BeforeKey: before})
	if err != nil {
		t.Fatalf("move %s: %v", key, err)
	}
	return resp.Issue
}

func keys(issues []*trackerv1.Issue) []string {
	out := make([]string, len(issues))
	for i, issue := range issues {
		out[i] = issue.Key
	}
	return out
}

func equal(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestProjects(t *testing.T) {
	s := newTestServer(t)
	_, err := s.CreateProject(ctx, &trackerv1.CreateProjectRequest{Key: "TB", Name: "dup", LeadId: userA})
	wantCode(t, err, codes.AlreadyExists)
	_, err = s.CreateProject(ctx, &trackerv1.CreateProjectRequest{Key: "tb", Name: "x", LeadId: userA})
	wantCode(t, err, codes.InvalidArgument)
	_, err = s.GetProject(ctx, &trackerv1.GetProjectRequest{Key: "NOPE"})
	wantCode(t, err, codes.NotFound)

	createIssue(t, s, "one")
	got, err := s.GetProject(ctx, &trackerv1.GetProjectRequest{Key: "TB"})
	if err != nil || got.Project.Name != "Tracking Board" || got.Project.IssueCount != 1 {
		t.Fatalf("GetProject = %v, %v", got, err)
	}
	list, err := s.ListProjects(ctx, &trackerv1.ListProjectsRequest{})
	if err != nil || len(list.Projects) != 1 || list.Projects[0].IssueCount != 1 {
		t.Fatalf("ListProjects = %v, %v", list, err)
	}
}

func TestCreateIssue(t *testing.T) {
	s := newTestServer(t)
	a := createIssue(t, s, "  first  ")
	b := createIssue(t, s, "second")

	if a.Key != "TB-1" || b.Key != "TB-2" {
		t.Errorf("keys = %s, %s; want TB-1, TB-2", a.Key, b.Key)
	}
	if a.Title != "first" {
		t.Errorf("title = %q, want trimmed", a.Title)
	}
	if a.Status != trackerv1.IssueStatus_ISSUE_STATUS_TODO || a.Priority != trackerv1.IssuePriority_ISSUE_PRIORITY_MEDIUM {
		t.Errorf("defaults: status %v priority %v", a.Status, a.Priority)
	}
	if a.Position != 1024 || b.Position != 2048 {
		t.Errorf("positions = %v, %v", a.Position, b.Position)
	}
	if a.AssigneeId != nil || a.Labels == nil {
		t.Errorf("assignee %v labels %v", a.AssigneeId, a.Labels)
	}

	_, err := s.CreateIssue(ctx, &trackerv1.CreateIssueRequest{ProjectKey: "NOPE", Title: "x", Type: trackerv1.IssueType_ISSUE_TYPE_BUG, ReporterId: userA})
	wantCode(t, err, codes.NotFound)
	_, err = s.CreateIssue(ctx, &trackerv1.CreateIssueRequest{ProjectKey: "TB", Title: "   ", Type: trackerv1.IssueType_ISSUE_TYPE_BUG, ReporterId: userA})
	wantCode(t, err, codes.InvalidArgument)
	_, err = s.CreateIssue(ctx, &trackerv1.CreateIssueRequest{ProjectKey: "TB", Title: "x", ReporterId: userA})
	wantCode(t, err, codes.InvalidArgument)

	// A deleted number is never reused.
	if _, err := s.DeleteIssue(ctx, &trackerv1.DeleteIssueRequest{Key: "TB-2"}); err != nil {
		t.Fatal(err)
	}
	if c := createIssue(t, s, "third"); c.Key != "TB-3" {
		t.Errorf("after delete got %s, want TB-3", c.Key)
	}
}

func TestListIssuesBoardOrderAndPaging(t *testing.T) {
	s := newTestServer(t)
	for _, title := range []string{"a", "b", "c", "d"} {
		createIssue(t, s, title)
	}
	move(t, s, "TB-1", trackerv1.IssueStatus_ISSUE_STATUS_DONE, nil, nil)
	move(t, s, "TB-4", trackerv1.IssueStatus_ISSUE_STATUS_TODO, nil, ptr("TB-2")) // top of TODO

	all, err := s.ListIssues(ctx, &trackerv1.ListIssuesRequest{ProjectKey: "TB"})
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"TB-4", "TB-2", "TB-3", "TB-1"}; !equal(keys(all.Issues), want) {
		t.Errorf("order = %v, want %v", keys(all.Issues), want)
	}
	if all.Page != 1 || all.PageSize != 50 || all.Total != 4 {
		t.Errorf("paging = %d/%d/%d", all.Page, all.PageSize, all.Total)
	}

	page2, err := s.ListIssues(ctx, &trackerv1.ListIssuesRequest{ProjectKey: "TB", Page: 2, PageSize: 3})
	if err != nil || !equal(keys(page2.Issues), []string{"TB-1"}) || page2.Total != 4 {
		t.Errorf("page 2 = %v (%v)", page2, err)
	}

	todo := trackerv1.IssueStatus_ISSUE_STATUS_TODO
	q := "B"
	filtered, err := s.ListIssues(ctx, &trackerv1.ListIssuesRequest{ProjectKey: "TB", Status: &todo, Q: &q})
	if err != nil || !equal(keys(filtered.Issues), []string{"TB-2"}) {
		t.Errorf("filtered = %v (%v)", filtered, err)
	}
}

func TestMoveIssue(t *testing.T) {
	s := newTestServer(t)
	for _, title := range []string{"a", "b", "c"} {
		createIssue(t, s, title)
	}
	inProgress := trackerv1.IssueStatus_ISSUE_STATUS_IN_PROGRESS
	move(t, s, "TB-1", inProgress, nil, nil)
	move(t, s, "TB-2", inProgress, nil, nil)
	got := move(t, s, "TB-3", inProgress, ptr("TB-1"), ptr("TB-2"))
	if got.Position != 1024+512 || got.Status != inProgress {
		t.Errorf("between: position %v status %v", got.Position, got.Status)
	}

	_, err := s.MoveIssue(ctx, &trackerv1.MoveIssueRequest{Key: "TB-1", Status: inProgress, AfterKey: ptr("TB-1")})
	wantCode(t, err, codes.InvalidArgument)
	_, err = s.MoveIssue(ctx, &trackerv1.MoveIssueRequest{Key: "TB-1", Status: trackerv1.IssueStatus_ISSUE_STATUS_DONE, AfterKey: ptr("TB-2")})
	wantCode(t, err, codes.InvalidArgument) // TB-2 is not in DONE
	_, err = s.MoveIssue(ctx, &trackerv1.MoveIssueRequest{Key: "TB-99", Status: inProgress})
	wantCode(t, err, codes.NotFound)
}

func TestMoveRenumbersWhenThereIsNoRoom(t *testing.T) {
	s := newTestServer(t)
	createIssue(t, s, "a") // TB-1 @1024
	createIssue(t, s, "b") // TB-2 @2048
	createIssue(t, s, "c") // TB-3 — keeps dropping between TB-1 and the card above TB-2
	todo := trackerv1.IssueStatus_ISSUE_STATUS_TODO
	for i := 0; i < 70; i++ {
		move(t, s, "TB-3", todo, ptr("TB-1"), ptr("TB-2"))
		move(t, s, "TB-2", todo, ptr("TB-1"), ptr("TB-3"))
	}
	list, err := s.ListIssues(ctx, &trackerv1.ListIssuesRequest{ProjectKey: "TB"})
	if err != nil {
		t.Fatal(err)
	}
	if want := []string{"TB-1", "TB-2", "TB-3"}; !equal(keys(list.Issues), want) {
		t.Errorf("order = %v, want %v", keys(list.Issues), want)
	}
}

func TestUpdateIssue(t *testing.T) {
	s := newTestServer(t)
	issue := createIssue(t, s, "a")
	update := func(in *trackerv1.Issue, paths ...string) (*trackerv1.Issue, error) {
		resp, err := s.UpdateIssue(ctx, &trackerv1.UpdateIssueRequest{Key: issue.Key, Issue: in, UpdateMask: &fieldmaskpb.FieldMask{Paths: paths}})
		return resp.GetIssue(), err
	}

	got, err := update(&trackerv1.Issue{AssigneeId: ptr(userB), Labels: []string{"x"}, Title: "ignored"}, "assignee_id", "labels")
	if err != nil || got.GetAssigneeId() != userB || got.Title != "a" || len(got.Labels) != 1 {
		t.Fatalf("set assignee = %v, %v", got, err)
	}
	got, err = update(&trackerv1.Issue{}, "assignee_id", "description")
	if err != nil || got.AssigneeId != nil || got.Description != nil {
		t.Fatalf("unassign = %v, %v", got, err)
	}

	_, err = update(&trackerv1.Issue{}, "status")
	wantCode(t, err, codes.InvalidArgument)
	_, err = update(&trackerv1.Issue{Title: " "}, "title")
	wantCode(t, err, codes.InvalidArgument)
	_, err = s.UpdateIssue(ctx, &trackerv1.UpdateIssueRequest{Key: "TB-99", UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"title"}}, Issue: &trackerv1.Issue{Title: "x"}})
	wantCode(t, err, codes.NotFound)
}

func TestCommentsAndLinks(t *testing.T) {
	s := newTestServer(t)
	a := createIssue(t, s, "a")
	b := createIssue(t, s, "b")

	for _, body := range []string{" first ", "second"} {
		if _, err := s.CreateComment(ctx, &trackerv1.CreateCommentRequest{IssueKey: a.Key, AuthorId: userB, Body: body}); err != nil {
			t.Fatal(err)
		}
	}
	comments, err := s.ListComments(ctx, &trackerv1.ListCommentsRequest{IssueKey: a.Key})
	if err != nil || len(comments.Comments) != 2 || comments.Comments[0].Body != "first" || comments.Comments[0].IssueKey != "TB-1" {
		t.Fatalf("comments = %v, %v", comments, err)
	}

	link := func(issueKey, pageID string) error {
		_, err := s.CreateIssueLink(ctx, &trackerv1.CreateIssueLinkRequest{IssueKey: issueKey, PageId: pageID})
		return err
	}
	for _, l := range [][2]string{{a.Key, pageX}, {a.Key, pageY}, {b.Key, pageX}} {
		if err := link(l[0], l[1]); err != nil {
			t.Fatal(err)
		}
	}
	wantCode(t, link(a.Key, pageX), codes.AlreadyExists)

	links, _ := s.ListIssueLinks(ctx, &trackerv1.ListIssueLinksRequest{IssueKey: a.Key})
	if !equal(links.PageIds, []string{pageX, pageY}) {
		t.Errorf("links of TB-1 = %v", links.PageIds)
	}
	got, _ := s.GetIssue(ctx, &trackerv1.GetIssueRequest{Key: a.Key})
	if got.Issue.LinkedPageCount != 2 {
		t.Errorf("linked_page_count = %d", got.Issue.LinkedPageCount)
	}
	linked, _ := s.ListPageLinkedIssues(ctx, &trackerv1.ListPageLinkedIssuesRequest{PageId: pageX})
	if !equal(keys(linked.Issues), []string{"TB-1", "TB-2"}) {
		t.Errorf("issues of page X = %v", keys(linked.Issues))
	}

	_, err = s.DeleteIssueLink(ctx, &trackerv1.DeleteIssueLinkRequest{IssueKey: b.Key, PageId: pageY})
	wantCode(t, err, codes.NotFound)

	// Deleting a page (docs-service) → gateway calls DeletePageLinks.
	deleted, err := s.DeletePageLinks(ctx, &trackerv1.DeletePageLinksRequest{PageIds: []string{pageX, "not-a-uuid"}})
	if err != nil || deleted.DeletedCount != 2 {
		t.Fatalf("DeletePageLinks = %v, %v", deleted, err)
	}

	// Deleting an issue removes its comments and links.
	if _, err := s.DeleteIssue(ctx, &trackerv1.DeleteIssueRequest{Key: a.Key}); err != nil {
		t.Fatal(err)
	}
	var left int64
	s.db.Model(&Comment{}).Count(&left)
	if left != 0 {
		t.Errorf("%d comments left", left)
	}
	s.db.Model(&IssuePageLink{}).Count(&left)
	if left != 0 {
		t.Errorf("%d links left", left)
	}
}

func TestSearchIssues(t *testing.T) {
	s := newTestServer(t)
	createIssue(t, s, "Fix login page")
	_, _ = s.CreateIssue(ctx, &trackerv1.CreateIssueRequest{
		ProjectKey: "TB", Title: "other", Type: trackerv1.IssueType_ISSUE_TYPE_BUG, ReporterId: userA,
		Labels: []string{"Backend"}, Description: ptr("100% done"),
	})

	search := func(q string) []string {
		got, err := s.SearchIssues(ctx, &trackerv1.SearchIssuesRequest{Q: q})
		if err != nil {
			t.Fatal(err)
		}
		return keys(got.Issues)
	}
	for q, want := range map[string][]string{
		"LOGIN":   {"TB-1"}, // title, any case
		"tb-2":    {"TB-2"}, // key
		"backend": {"TB-2"}, // label
		"0%":      {"TB-2"}, // % is matched literally
		"_":       {},       // _ is not a wildcard
		"tb":      {"TB-1", "TB-2"},
	} {
		if got := search(q); !equal(got, want) {
			t.Errorf("search %q = %v, want %v", q, got, want)
		}
	}
}

func TestSeed(t *testing.T) {
	db := svctest.DB(t, allModels...)
	if err := seed(db); err != nil {
		t.Fatal(err)
	}
	if err := seed(db); err != nil { // second run is a no-op
		t.Fatal(err)
	}
	s := &server{db: db}
	got, err := s.GetIssue(ctx, &trackerv1.GetIssueRequest{Key: "TB-12"})
	if err != nil || got.Issue.LinkedPageCount != 1 || got.Issue.Status != trackerv1.IssueStatus_ISSUE_STATUS_IN_PROGRESS {
		t.Fatalf("TB-12 = %v, %v", got, err)
	}
	if c := createIssue(t, s, "next"); c.Key != "TB-13" {
		t.Errorf("next key = %s, want TB-13", c.Key)
	}
}

func ptr[T any](v T) *T { return &v }

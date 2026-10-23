package main

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
	"google.golang.org/protobuf/types/known/timestamppb"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	docsv1 "github.com/duck/tracking_board/gen/go/docs/v1"
	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
)

// The gateway is tested against fake services: these tests are about the
// REST side (auth, validation, error mapping, JSON shape, PATCH masks).
// The full stack is covered by the Playwright suite in e2e/.

const (
	duckID = "7f1c2a9e-0000-4000-8000-000000000001"
	mintID = "7f1c2a9e-0000-4000-8000-000000000002"
)

var testUsers = map[string]*authv1.User{
	duckID: {Id: duckID, Email: "duck@example.com", DisplayName: "Duck"},
	mintID: {Id: mintID, Email: "mint@example.com", DisplayName: "Mint"},
}

type fakeAuth struct {
	authv1.UnimplementedAuthServiceServer
}

func (fakeAuth) ValidateToken(_ context.Context, req *authv1.ValidateTokenRequest) (*authv1.ValidateTokenResponse, error) {
	if req.GetAccessToken() != "good-token" {
		return nil, status.Error(codes.Unauthenticated, "invalid or expired token")
	}
	return &authv1.ValidateTokenResponse{User: testUsers[duckID]}, nil
}

func (fakeAuth) ListUsers(_ context.Context, req *authv1.ListUsersRequest) (*authv1.ListUsersResponse, error) {
	resp := &authv1.ListUsersResponse{}
	for _, id := range req.GetIds() {
		if u, ok := testUsers[id]; ok {
			resp.Users = append(resp.Users, u)
		}
	}
	return resp, nil
}

type fakeTracker struct {
	trackerv1.UnimplementedTrackerServiceServer
	lastUpdate *trackerv1.UpdateIssueRequest
}

func testIssue(key string) *trackerv1.Issue {
	created := timestamppb.New(time.Date(2026, 10, 2, 10, 0, 0, 0, time.UTC))
	return &trackerv1.Issue{
		Id: "3c4d5e6f-0000-4000-8000-000000000001", Key: key, ProjectKey: "TB", Title: "Fix login",
		Type: trackerv1.IssueType_ISSUE_TYPE_BUG, Status: trackerv1.IssueStatus_ISSUE_STATUS_IN_REVIEW,
		Priority: trackerv1.IssuePriority_ISSUE_PRIORITY_HIGH, ReporterId: duckID, Position: 1024,
		CreateTime: created, UpdateTime: created,
	}
}

func (f *fakeTracker) GetIssue(_ context.Context, req *trackerv1.GetIssueRequest) (*trackerv1.GetIssueResponse, error) {
	switch req.GetKey() {
	case "TB-1":
		return &trackerv1.GetIssueResponse{Issue: testIssue("TB-1")}, nil
	case "TB-500":
		return nil, status.Error(codes.Unavailable, "connection refused (secret detail)")
	}
	return nil, status.Errorf(codes.NotFound, "issue %s not found", req.GetKey())
}

func (f *fakeTracker) UpdateIssue(_ context.Context, req *trackerv1.UpdateIssueRequest) (*trackerv1.UpdateIssueResponse, error) {
	f.lastUpdate = req
	issue := testIssue(req.GetKey())
	issue.Title = req.GetIssue().GetTitle()
	issue.AssigneeId = req.GetIssue().AssigneeId
	return &trackerv1.UpdateIssueResponse{Issue: issue}, nil
}

type fakeDocs struct {
	docsv1.UnimplementedDocsServiceServer
}

// newTestGateway starts the fakes on in-memory listeners and returns the HTTP app.
func newTestGateway(t *testing.T) (*fakeTracker, func(method, path, token, body string) (int, map[string]any)) {
	t.Helper()
	tracker := &fakeTracker{}
	conn := func(register func(*grpc.Server)) *grpc.ClientConn {
		lis := bufconn.Listen(1 << 20)
		server := grpc.NewServer()
		register(server)
		go server.Serve(lis)
		t.Cleanup(server.Stop)
		cc, err := grpc.NewClient("passthrough:///bufnet",
			grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
			grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			t.Fatal(err)
		}
		return cc
	}
	g := &gateway{
		auth:    authv1.NewAuthServiceClient(conn(func(s *grpc.Server) { authv1.RegisterAuthServiceServer(s, fakeAuth{}) })),
		tracker: trackerv1.NewTrackerServiceClient(conn(func(s *grpc.Server) { trackerv1.RegisterTrackerServiceServer(s, tracker) })),
		docs:    docsv1.NewDocsServiceClient(conn(func(s *grpc.Server) { docsv1.RegisterDocsServiceServer(s, fakeDocs{}) })),
	}
	spec, err := loadSpec("../../api/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	app := newApp(g, spec, []string{"http://localhost:5173"})

	do := func(method, path, token, body string) (int, map[string]any) {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		if body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res, err := app.Test(req)
		if err != nil {
			t.Fatalf("%s %s: %v", method, path, err)
		}
		raw, _ := io.ReadAll(res.Body)
		var parsed map[string]any
		_ = json.Unmarshal(raw, &parsed)
		return res.StatusCode, parsed
	}
	return tracker, do
}

// wantError checks the spec's error body: { "error": { "code", "message" } }.
func wantError(t *testing.T, gotStatus int, body map[string]any, wantStatus int, wantCode string) string {
	t.Helper()
	errObj, _ := body["error"].(map[string]any)
	if gotStatus != wantStatus || errObj["code"] != wantCode || errObj["message"] == "" {
		t.Fatalf("got %d %v, want %d %s", gotStatus, body, wantStatus, wantCode)
	}
	return errObj["message"].(string)
}

func TestAuthRunsFirst(t *testing.T) {
	_, do := newTestGateway(t)
	st, body := do("GET", "/api/v1/projects", "", "")
	wantError(t, st, body, 401, "UNAUTHENTICATED")
	st, body = do("GET", "/api/v1/auth/me", "bad-token", "")
	wantError(t, st, body, 401, "UNAUTHENTICATED")
	// A bad body without a token is still a 401, not a 400.
	st, body = do("POST", "/api/v1/projects", "", "{")
	wantError(t, st, body, 401, "UNAUTHENTICATED")
}

func TestUnknownPathOrMethodIs404(t *testing.T) {
	_, do := newTestGateway(t)
	for _, tc := range [][2]string{{"PUT", "/api/v1/projects"}, {"GET", "/api/v1/nope"}, {"GET", "/nope"}} {
		st, body := do(tc[0], tc[1], "good-token", "")
		wantError(t, st, body, 404, "NOT_FOUND")
	}
}

func TestRequestValidation(t *testing.T) {
	_, do := newTestGateway(t)
	cases := []struct{ method, path, body, wantInMessage string }{
		{"POST", "/api/v1/projects/TB/issues", `{"title": "   ", "type": "TASK"}`, "must not be blank"},
		{"POST", "/api/v1/projects/TB/issues", `{"type": "TASK"}`, "title"},
		{"POST", "/api/v1/projects/TB/issues", `{"title": "x", "type": `, "request body"},
		{"POST", "/api/v1/issues/TB-1/move", `{"status": "NOPE"}`, "status"},
		{"GET", "/api/v1/projects/TB/issues?assigneeId=nope", "", "assigneeId"},
		{"GET", "/api/v1/projects/TB/issues?pageSize=500", "", "pageSize"},
		{"GET", "/api/v1/projects/TB/issues?colour=red", "", "colour"},
		{"GET", "/api/v1/pages/not-a-uuid", "", "pageId"},
		{"GET", "/api/v1/search?q=%20%20", "", "must not be blank"},
		{"PATCH", "/api/v1/issues/TB-1", `{}`, "request body"},
	}
	for _, tc := range cases {
		st, body := do(tc.method, tc.path, "good-token", tc.body)
		msg := wantError(t, st, body, 400, "VALIDATION_FAILED")
		if !strings.Contains(msg, tc.wantInMessage) {
			t.Errorf("%s %s: message %q should mention %q", tc.method, tc.path, msg, tc.wantInMessage)
		}
	}
	// Public endpoints are validated too.
	st, body := do("POST", "/api/v1/auth/register", "", `{"email": "not-an-email", "password": "password123", "displayName": "x"}`)
	wantError(t, st, body, 400, "VALIDATION_FAILED")
}

func TestIssueJSON(t *testing.T) {
	_, do := newTestGateway(t)
	st, body := do("GET", "/api/v1/issues/TB-1", "good-token", "")
	if st != 200 {
		t.Fatalf("status %d %v", st, body)
	}
	want := map[string]any{
		"key": "TB-1", "type": "BUG", "status": "IN_REVIEW", "priority": "HIGH", "assignee": nil,
		"description": nil, "position": 1024.0, "linkedPageCount": 0.0, "createdAt": "2026-10-02T10:00:00.000Z",
	}
	for k, v := range want {
		if got, ok := body[k]; !ok || got != v {
			t.Errorf("%s = %v (present %v), want %v", k, got, ok, v)
		}
	}
	if labels, ok := body["labels"].([]any); !ok || len(labels) != 0 {
		t.Errorf("labels = %v, want []", body["labels"])
	}
	if reporter, _ := body["reporter"].(map[string]any); reporter["displayName"] != "Duck" || reporter["avatarUrl"] != nil {
		t.Errorf("reporter = %v", body["reporter"])
	}
}

func TestGRPCErrorMapping(t *testing.T) {
	_, do := newTestGateway(t)
	st, body := do("GET", "/api/v1/issues/TB-99", "good-token", "")
	if msg := wantError(t, st, body, 404, "NOT_FOUND"); msg != "issue TB-99 not found" {
		t.Errorf("message = %q", msg)
	}
	// A service that is down → 500 INTERNAL, without the details.
	st, body = do("GET", "/api/v1/issues/TB-500", "good-token", "")
	if msg := wantError(t, st, body, 500, "INTERNAL"); strings.Contains(msg, "secret") {
		t.Errorf("leaked details: %q", msg)
	}
	// Unimplemented in the fake → also 500.
	st, body = do("GET", "/api/v1/spaces", "good-token", "")
	wantError(t, st, body, 500, "INTERNAL")
}

func TestPatchBuildsUpdateMask(t *testing.T) {
	tracker, do := newTestGateway(t)
	st, body := do("PATCH", "/api/v1/issues/TB-1", "good-token", `{"title": "  New title  ", "assigneeId": null}`)
	if st != 200 {
		t.Fatalf("status %d %v", st, body)
	}
	req := tracker.lastUpdate
	paths := slices.Sorted(slices.Values(req.GetUpdateMask().GetPaths()))
	if !slices.Equal(paths, []string{"assignee_id", "title"}) {
		t.Errorf("mask = %v", paths)
	}
	if req.GetIssue().GetTitle() != "New title" || req.GetIssue().AssigneeId != nil {
		t.Errorf("issue = %v", req.GetIssue())
	}

	// Assigning someone who doesn't exist is a 400 (tracker can't check users).
	st, body = do("PATCH", "/api/v1/issues/TB-1", "good-token", `{"assigneeId": "7f1c2a9e-0000-4000-8000-0000000000ff"}`)
	wantError(t, st, body, 400, "VALIDATION_FAILED")

	st, body = do("PATCH", "/api/v1/issues/TB-1", "good-token", `{"assigneeId": "`+mintID+`"}`)
	if assignee, _ := body["assignee"].(map[string]any); st != 200 || assignee["displayName"] != "Mint" {
		t.Errorf("assign Mint: %d %v", st, body)
	}
}

func TestHealthNeedsNoToken(t *testing.T) {
	_, do := newTestGateway(t)
	st, body := do("GET", "/health", "", "")
	if st != http.StatusOK || body["status"] != "ok" {
		t.Errorf("health = %d %v", st, body)
	}
}

package main

import (
	"context"
	"strings"

	"google.golang.org/protobuf/types/known/timestamppb"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	docsv1 "github.com/duck/tracking_board/gen/go/docs/v1"
	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
)

// JSON shapes from api/openapi.yaml. Pointer fields without omitempty are
// the spec's nullable fields: nil is sent as null.

type userJSON struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	DisplayName string  `json:"displayName"`
	AvatarURL   *string `json:"avatarUrl"`
}

type projectJSON struct {
	ID          string  `json:"id"`
	Key         string  `json:"key"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	LeadID      string  `json:"leadId"`
	IssueCount  int32   `json:"issueCount"`
	CreatedAt   string  `json:"createdAt"`
}

type issueSummaryJSON struct {
	ID       string    `json:"id"`
	Key      string    `json:"key"`
	Title    string    `json:"title"`
	Type     string    `json:"type"`
	Status   string    `json:"status"`
	Priority string    `json:"priority"`
	Assignee *userJSON `json:"assignee"`
}

type issueJSON struct {
	issueSummaryJSON
	ProjectKey      string    `json:"projectKey"`
	Description     *string   `json:"description"`
	Reporter        *userJSON `json:"reporter"`
	Position        float64   `json:"position"`
	Labels          []string  `json:"labels"`
	LinkedPageCount int32     `json:"linkedPageCount"`
	CreatedAt       string    `json:"createdAt"`
	UpdatedAt       string    `json:"updatedAt"`
}

type issueListJSON struct {
	Items    []issueJSON `json:"items"`
	Page     int32       `json:"page"`
	PageSize int32       `json:"pageSize"`
	Total    int32       `json:"total"`
}

type commentJSON struct {
	ID        string    `json:"id"`
	IssueKey  string    `json:"issueKey"`
	Author    *userJSON `json:"author"`
	Body      string    `json:"body"`
	CreatedAt string    `json:"createdAt"`
}

type spaceJSON struct {
	ID          string  `json:"id"`
	Key         string  `json:"key"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	CreatedAt   string  `json:"createdAt"`
}

type pageSummaryJSON struct {
	ID        string `json:"id"`
	SpaceKey  string `json:"spaceKey"`
	Title     string `json:"title"`
	UpdatedAt string `json:"updatedAt"`
}

type pageTreeNodeJSON struct {
	ID       string             `json:"id"`
	Title    string             `json:"title"`
	Children []pageTreeNodeJSON `json:"children"`
}

type pageJSON struct {
	ID        string    `json:"id"`
	SpaceKey  string    `json:"spaceKey"`
	ParentID  *string   `json:"parentId"`
	Title     string    `json:"title"`
	ContentMd string    `json:"contentMd"`
	Author    *userJSON `json:"author"`
	CreatedAt string    `json:"createdAt"`
	UpdatedAt string    `json:"updatedAt"`
}

type searchResultJSON struct {
	Issues []issueSummaryJSON `json:"issues"`
	Pages  []pageSummaryJSON  `json:"pages"`
}

// ISO-8601 UTC with milliseconds, like the mock: 2026-10-03T08:30:00.000Z
func timeJSON(ts *timestamppb.Timestamp) string {
	return ts.AsTime().UTC().Format("2006-01-02T15:04:05.000Z07:00")
}

// ---- enums: REST "IN_REVIEW" <-> proto ISSUE_STATUS_IN_REVIEW ----

func restEnum(protoName, prefix string) string { return strings.TrimPrefix(protoName, prefix) }

func issueStatus(s string) trackerv1.IssueStatus {
	return trackerv1.IssueStatus(trackerv1.IssueStatus_value["ISSUE_STATUS_"+s])
}
func issueType(s string) trackerv1.IssueType {
	return trackerv1.IssueType(trackerv1.IssueType_value["ISSUE_TYPE_"+s])
}
func issuePriority(s string) trackerv1.IssuePriority {
	return trackerv1.IssuePriority(trackerv1.IssuePriority_value["ISSUE_PRIORITY_"+s])
}

// ---- proto → JSON ----

func toUser(u *authv1.User) *userJSON {
	if u == nil {
		return nil
	}
	return &userJSON{ID: u.GetId(), Email: u.GetEmail(), DisplayName: u.GetDisplayName(), AvatarURL: u.AvatarUrl}
}

func toProject(p *trackerv1.Project) projectJSON {
	return projectJSON{
		ID: p.GetId(), Key: p.GetKey(), Name: p.GetName(), Description: p.Description,
		LeadID: p.GetLeadId(), IssueCount: p.GetIssueCount(), CreatedAt: timeJSON(p.GetCreateTime()),
	}
}

func toSpace(s *docsv1.Space) spaceJSON {
	return spaceJSON{
		ID: s.GetId(), Key: s.GetKey(), Name: s.GetName(), Description: s.Description, CreatedAt: timeJSON(s.GetCreateTime()),
	}
}

func toPageSummary(p *docsv1.PageSummary) pageSummaryJSON {
	return pageSummaryJSON{ID: p.GetId(), SpaceKey: p.GetSpaceKey(), Title: p.GetTitle(), UpdatedAt: timeJSON(p.GetUpdateTime())}
}

func toPageTree(nodes []*docsv1.PageTreeNode) []pageTreeNodeJSON {
	out := make([]pageTreeNodeJSON, len(nodes))
	for i, n := range nodes {
		out[i] = pageTreeNodeJSON{ID: n.GetId(), Title: n.GetTitle(), Children: toPageTree(n.GetChildren())}
	}
	return out
}

// ---- hydration: user ids → full users with ONE auth.ListUsers call ----

type users map[string]*authv1.User

func (g *gateway) loadUsers(ctx context.Context, ids ...string) (users, error) {
	unique := make([]string, 0, len(ids))
	seen := map[string]bool{}
	for _, id := range ids {
		if id != "" && !seen[id] {
			seen[id] = true
			unique = append(unique, id)
		}
	}
	out := users{}
	if len(unique) == 0 {
		return out, nil
	}
	resp, err := g.auth.ListUsers(ctx, &authv1.ListUsersRequest{Ids: unique})
	if err != nil {
		return nil, err
	}
	for _, u := range resp.GetUsers() {
		out[u.GetId()] = u
	}
	return out, nil
}

func (u users) get(id *string) *userJSON {
	if id == nil {
		return nil
	}
	return toUser(u[*id])
}

func issueUserIDs(issues []*trackerv1.Issue) []string {
	ids := make([]string, 0, 2*len(issues))
	for _, i := range issues {
		ids = append(ids, i.GetAssigneeId(), i.GetReporterId())
	}
	return ids
}

func (u users) issueSummary(i *trackerv1.Issue) issueSummaryJSON {
	return issueSummaryJSON{
		ID:       i.GetId(),
		Key:      i.GetKey(),
		Title:    i.GetTitle(),
		Type:     restEnum(i.GetType().String(), "ISSUE_TYPE_"),
		Status:   restEnum(i.GetStatus().String(), "ISSUE_STATUS_"),
		Priority: restEnum(i.GetPriority().String(), "ISSUE_PRIORITY_"),
		Assignee: u.get(i.AssigneeId),
	}
}

func (u users) issue(i *trackerv1.Issue) issueJSON {
	labels := i.GetLabels()
	if labels == nil {
		labels = []string{}
	}
	reporter := i.GetReporterId()
	return issueJSON{
		issueSummaryJSON: u.issueSummary(i),
		ProjectKey:       i.GetProjectKey(),
		Description:      i.Description,
		Reporter:         u.get(&reporter),
		Position:         i.GetPosition(),
		Labels:           labels,
		LinkedPageCount:  i.GetLinkedPageCount(),
		CreatedAt:        timeJSON(i.GetCreateTime()),
		UpdatedAt:        timeJSON(i.GetUpdateTime()),
	}
}

func (u users) comment(c *trackerv1.Comment) commentJSON {
	author := c.GetAuthorId()
	return commentJSON{
		ID: c.GetId(), IssueKey: c.GetIssueKey(), Author: u.get(&author), Body: c.GetBody(), CreatedAt: timeJSON(c.GetCreateTime()),
	}
}

func (u users) page(p *docsv1.Page) pageJSON {
	author := p.GetAuthorId()
	return pageJSON{
		ID: p.GetId(), SpaceKey: p.GetSpaceKey(), ParentID: p.ParentId, Title: p.GetTitle(), ContentMd: p.GetContentMd(),
		Author: u.get(&author), CreatedAt: timeJSON(p.GetCreateTime()), UpdatedAt: timeJSON(p.GetUpdateTime()),
	}
}

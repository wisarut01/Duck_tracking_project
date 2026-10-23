package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"golang.org/x/sync/errgroup"
	"google.golang.org/protobuf/types/known/fieldmaskpb"

	authv1 "github.com/duck/tracking_board/gen/go/auth/v1"
	docsv1 "github.com/duck/tracking_board/gen/go/docs/v1"
	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
)

// routes maps every REST endpoint in api/openapi.yaml to its gRPC call(s).
// proto/README.md has the same table in words.
func (g *gateway) routes(api fiber.Router) {
	api.Post("/auth/register", g.register)
	api.Post("/auth/login", g.login)
	api.Get("/auth/me", g.me)
	api.Get("/users", g.listUsers)

	api.Get("/projects", g.listProjects)
	api.Post("/projects", g.createProject)
	api.Get("/projects/:projectKey", g.getProject)
	api.Get("/projects/:projectKey/issues", g.listIssues)
	api.Post("/projects/:projectKey/issues", g.createIssue)

	api.Get("/issues/:issueKey", g.getIssue)
	api.Patch("/issues/:issueKey", g.updateIssue)
	api.Delete("/issues/:issueKey", g.deleteIssue)
	api.Post("/issues/:issueKey/move", g.moveIssue)
	api.Get("/issues/:issueKey/comments", g.listComments)
	api.Post("/issues/:issueKey/comments", g.createComment)
	api.Get("/issues/:issueKey/links", g.listIssueLinks)
	api.Post("/issues/:issueKey/links", g.createIssueLink)
	api.Delete("/issues/:issueKey/links/:pageId", g.deleteIssueLink)

	api.Get("/spaces", g.listSpaces)
	api.Post("/spaces", g.createSpace)
	api.Get("/spaces/:spaceKey", g.getSpace)
	api.Get("/spaces/:spaceKey/pages", g.getPageTree)
	api.Post("/spaces/:spaceKey/pages", g.createPage)
	api.Get("/pages/:pageId", g.getPage)
	api.Patch("/pages/:pageId", g.updatePage)
	api.Delete("/pages/:pageId", g.deletePage)
	api.Get("/pages/:pageId/linked-issues", g.listPageLinkedIssues)

	api.Get("/search", g.search)
}

// decode reads the JSON body (already checked against the spec) into dst.
func decode(c fiber.Ctx, dst any) error {
	if err := json.Unmarshal(c.Body(), dst); err != nil {
		return badRequest("request body: " + err.Error())
	}
	return nil
}

// updateMask lists the JSON keys that were sent, as proto field names
// (assigneeId → assignee_id). A key sent as null is in the mask too: that is
// how PATCH says "set to null".
func updateMask(c fiber.Ctx, jsonToProto map[string]string) (*fieldmaskpb.FieldMask, error) {
	var sent map[string]json.RawMessage
	if err := decode(c, &sent); err != nil {
		return nil, err
	}
	mask := &fieldmaskpb.FieldMask{}
	for key := range sent {
		if path, ok := jsonToProto[key]; ok {
			mask.Paths = append(mask.Paths, path)
		}
	}
	return mask, nil
}

// trim is applied to the required text fields (title, name, displayName,
// body, q): the spec already rejected blank ones, the stored value is trimmed.
func trim(s *string) {
	if s != nil {
		*s = strings.TrimSpace(*s)
	}
}

// checkAssignee: tracker-service can't see users, so the gateway checks the id.
func (g *gateway) checkAssignee(c fiber.Ctx, id *string) error {
	if id == nil {
		return nil
	}
	found, err := g.loadUsers(c.Context(), *id)
	if err != nil {
		return err
	}
	if found[*id] == nil {
		return badRequest("assigneeId: user " + *id + " not found")
	}
	return nil
}

// ======================= auth / users =======================

func (g *gateway) register(c fiber.Ctx) error {
	var body struct{ Email, Password, DisplayName string }
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.DisplayName)
	resp, err := g.auth.Register(c.Context(), &authv1.RegisterRequest{
		Email: body.Email, Password: body.Password, DisplayName: body.DisplayName,
	})
	if err != nil {
		return err
	}
	return c.Status(http.StatusCreated).JSON(fiber.Map{"accessToken": resp.GetAccessToken(), "user": toUser(resp.GetUser())})
}

func (g *gateway) login(c fiber.Ctx) error {
	var body struct{ Email, Password string }
	if err := decode(c, &body); err != nil {
		return err
	}
	resp, err := g.auth.Login(c.Context(), &authv1.LoginRequest{Email: body.Email, Password: body.Password})
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"accessToken": resp.GetAccessToken(), "user": toUser(resp.GetUser())})
}

func (g *gateway) me(c fiber.Ctx) error {
	resp, err := g.auth.GetUser(c.Context(), &authv1.GetUserRequest{Id: currentUser(c).GetId()})
	if err != nil {
		return err
	}
	return c.JSON(toUser(resp.GetUser()))
}

func (g *gateway) listUsers(c fiber.Ctx) error {
	resp, err := g.auth.ListUsers(c.Context(), &authv1.ListUsersRequest{})
	if err != nil {
		return err
	}
	out := make([]*userJSON, len(resp.GetUsers()))
	for i, u := range resp.GetUsers() {
		out[i] = toUser(u)
	}
	return c.JSON(out)
}

// ======================= projects =======================

func (g *gateway) listProjects(c fiber.Ctx) error {
	resp, err := g.tracker.ListProjects(c.Context(), &trackerv1.ListProjectsRequest{})
	if err != nil {
		return err
	}
	out := make([]projectJSON, len(resp.GetProjects()))
	for i, p := range resp.GetProjects() {
		out[i] = toProject(p)
	}
	return c.JSON(out)
}

func (g *gateway) createProject(c fiber.Ctx) error {
	var body struct {
		Key, Name   string
		Description *string
	}
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.Name)
	resp, err := g.tracker.CreateProject(c.Context(), &trackerv1.CreateProjectRequest{
		Key: body.Key, Name: body.Name, Description: body.Description, LeadId: currentUser(c).GetId(),
	})
	if err != nil {
		return err
	}
	return c.Status(http.StatusCreated).JSON(toProject(resp.GetProject()))
}

func (g *gateway) getProject(c fiber.Ctx) error {
	resp, err := g.tracker.GetProject(c.Context(), &trackerv1.GetProjectRequest{Key: c.Params("projectKey")})
	if err != nil {
		return err
	}
	return c.JSON(toProject(resp.GetProject()))
}

// ======================= issues =======================

// sendIssue answers with one issue, its assignee and reporter filled in.
func (g *gateway) sendIssue(c fiber.Ctx, status int, issue *trackerv1.Issue) error {
	found, err := g.loadUsers(c.Context(), issueUserIDs([]*trackerv1.Issue{issue})...)
	if err != nil {
		return err
	}
	return c.Status(status).JSON(found.issue(issue))
}

func (g *gateway) listIssues(c fiber.Ctx) error {
	req := &trackerv1.ListIssuesRequest{ProjectKey: c.Params("projectKey")}
	if s := c.Query("status"); s != "" {
		status := issueStatus(s)
		req.Status = &status
	}
	if a := c.Query("assigneeId"); a != "" {
		req.AssigneeId = &a
	}
	if q := strings.TrimSpace(c.Query("q")); q != "" {
		req.Q = &q
	}
	// The spec already checked these are integers in range.
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("pageSize", "50"))
	req.Page, req.PageSize = int32(page), int32(pageSize)

	resp, err := g.tracker.ListIssues(c.Context(), req)
	if err != nil {
		return err
	}
	found, err := g.loadUsers(c.Context(), issueUserIDs(resp.GetIssues())...)
	if err != nil {
		return err
	}
	out := issueListJSON{Items: make([]issueJSON, len(resp.GetIssues())), Page: resp.GetPage(), PageSize: resp.GetPageSize(), Total: resp.GetTotal()}
	for i, issue := range resp.GetIssues() {
		out.Items[i] = found.issue(issue)
	}
	return c.JSON(out)
}

func (g *gateway) createIssue(c fiber.Ctx) error {
	var body struct {
		Title, Type, Priority   string
		Description, AssigneeID *string
		Labels                  []string
	}
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.Title)
	if err := g.checkAssignee(c, body.AssigneeID); err != nil {
		return err
	}
	resp, err := g.tracker.CreateIssue(c.Context(), &trackerv1.CreateIssueRequest{
		ProjectKey:  c.Params("projectKey"),
		Title:       body.Title,
		Type:        issueType(body.Type),
		Description: body.Description,
		Priority:    issuePriority(body.Priority), // not sent = UNSPECIFIED = MEDIUM
		AssigneeId:  body.AssigneeID,
		Labels:      body.Labels,
		ReporterId:  currentUser(c).GetId(),
	})
	if err != nil {
		return err
	}
	return g.sendIssue(c, http.StatusCreated, resp.GetIssue())
}

func (g *gateway) getIssue(c fiber.Ctx) error {
	resp, err := g.tracker.GetIssue(c.Context(), &trackerv1.GetIssueRequest{Key: c.Params("issueKey")})
	if err != nil {
		return err
	}
	return g.sendIssue(c, http.StatusOK, resp.GetIssue())
}

func (g *gateway) updateIssue(c fiber.Ctx) error {
	mask, err := updateMask(c, map[string]string{
		"title": "title", "description": "description", "type": "type",
		"priority": "priority", "assigneeId": "assignee_id", "labels": "labels",
	})
	if err != nil {
		return err
	}
	var body struct {
		Title, Type, Priority   string
		Description, AssigneeID *string
		Labels                  []string
	}
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.Title)
	if err := g.checkAssignee(c, body.AssigneeID); err != nil {
		return err
	}
	resp, err := g.tracker.UpdateIssue(c.Context(), &trackerv1.UpdateIssueRequest{
		Key: c.Params("issueKey"),
		Issue: &trackerv1.Issue{
			Title: body.Title, Description: body.Description, Type: issueType(body.Type),
			Priority: issuePriority(body.Priority), AssigneeId: body.AssigneeID, Labels: body.Labels,
		},
		UpdateMask: mask,
	})
	if err != nil {
		return err
	}
	return g.sendIssue(c, http.StatusOK, resp.GetIssue())
}

func (g *gateway) deleteIssue(c fiber.Ctx) error {
	if _, err := g.tracker.DeleteIssue(c.Context(), &trackerv1.DeleteIssueRequest{Key: c.Params("issueKey")}); err != nil {
		return err
	}
	return c.SendStatus(http.StatusNoContent)
}

func (g *gateway) moveIssue(c fiber.Ctx) error {
	var body struct {
		Status              string
		AfterKey, BeforeKey *string
	}
	if err := decode(c, &body); err != nil {
		return err
	}
	resp, err := g.tracker.MoveIssue(c.Context(), &trackerv1.MoveIssueRequest{
		Key: c.Params("issueKey"), Status: issueStatus(body.Status), AfterKey: body.AfterKey, BeforeKey: body.BeforeKey,
	})
	if err != nil {
		return err
	}
	return g.sendIssue(c, http.StatusOK, resp.GetIssue())
}

// ======================= comments =======================

func (g *gateway) listComments(c fiber.Ctx) error {
	resp, err := g.tracker.ListComments(c.Context(), &trackerv1.ListCommentsRequest{IssueKey: c.Params("issueKey")})
	if err != nil {
		return err
	}
	authors := make([]string, len(resp.GetComments()))
	for i, comment := range resp.GetComments() {
		authors[i] = comment.GetAuthorId()
	}
	found, err := g.loadUsers(c.Context(), authors...)
	if err != nil {
		return err
	}
	out := make([]commentJSON, len(resp.GetComments()))
	for i, comment := range resp.GetComments() {
		out[i] = found.comment(comment)
	}
	return c.JSON(out)
}

func (g *gateway) createComment(c fiber.Ctx) error {
	var body struct{ Body string }
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.Body)
	resp, err := g.tracker.CreateComment(c.Context(), &trackerv1.CreateCommentRequest{
		IssueKey: c.Params("issueKey"), AuthorId: currentUser(c).GetId(), Body: body.Body,
	})
	if err != nil {
		return err
	}
	found, err := g.loadUsers(c.Context(), resp.GetComment().GetAuthorId())
	if err != nil {
		return err
	}
	return c.Status(http.StatusCreated).JSON(found.comment(resp.GetComment()))
}

// ======================= issue ↔ page links =======================
// tracker-service owns the links (page ids only); docs-service has the pages.

func (g *gateway) listIssueLinks(c fiber.Ctx) error {
	links, err := g.tracker.ListIssueLinks(c.Context(), &trackerv1.ListIssueLinksRequest{IssueKey: c.Params("issueKey")})
	if err != nil {
		return err
	}
	out := []pageSummaryJSON{}
	if len(links.GetPageIds()) > 0 {
		pages, err := g.docs.BatchGetPages(c.Context(), &docsv1.BatchGetPagesRequest{Ids: links.GetPageIds()})
		if err != nil {
			return err
		}
		for _, p := range pages.GetPages() {
			out = append(out, toPageSummary(p))
		}
	}
	return c.JSON(out)
}

func (g *gateway) createIssueLink(c fiber.Ctx) error {
	var body struct{ PageID string }
	if err := decode(c, &body); err != nil {
		return err
	}
	page, err := g.docs.GetPage(c.Context(), &docsv1.GetPageRequest{Id: body.PageID}) // 404 if the page is missing
	if err != nil {
		return err
	}
	_, err = g.tracker.CreateIssueLink(c.Context(), &trackerv1.CreateIssueLinkRequest{IssueKey: c.Params("issueKey"), PageId: body.PageID})
	if err != nil {
		return err
	}
	p := page.GetPage()
	return c.Status(http.StatusCreated).JSON(pageSummaryJSON{
		ID: p.GetId(), SpaceKey: p.GetSpaceKey(), Title: p.GetTitle(), UpdatedAt: timeJSON(p.GetUpdateTime()),
	})
}

func (g *gateway) deleteIssueLink(c fiber.Ctx) error {
	_, err := g.tracker.DeleteIssueLink(c.Context(), &trackerv1.DeleteIssueLinkRequest{
		IssueKey: c.Params("issueKey"), PageId: c.Params("pageId"),
	})
	if err != nil {
		return err
	}
	return c.SendStatus(http.StatusNoContent)
}

func (g *gateway) listPageLinkedIssues(c fiber.Ctx) error {
	// 404 for a page that doesn't exist (tracker would just return no issues).
	if _, err := g.docs.GetPage(c.Context(), &docsv1.GetPageRequest{Id: c.Params("pageId")}); err != nil {
		return err
	}
	resp, err := g.tracker.ListPageLinkedIssues(c.Context(), &trackerv1.ListPageLinkedIssuesRequest{PageId: c.Params("pageId")})
	if err != nil {
		return err
	}
	found, err := g.loadUsers(c.Context(), issueUserIDs(resp.GetIssues())...)
	if err != nil {
		return err
	}
	out := make([]issueSummaryJSON, len(resp.GetIssues()))
	for i, issue := range resp.GetIssues() {
		out[i] = found.issueSummary(issue)
	}
	return c.JSON(out)
}

// ======================= spaces / pages =======================

func (g *gateway) listSpaces(c fiber.Ctx) error {
	resp, err := g.docs.ListSpaces(c.Context(), &docsv1.ListSpacesRequest{})
	if err != nil {
		return err
	}
	out := make([]spaceJSON, len(resp.GetSpaces()))
	for i, s := range resp.GetSpaces() {
		out[i] = toSpace(s)
	}
	return c.JSON(out)
}

func (g *gateway) createSpace(c fiber.Ctx) error {
	var body struct {
		Key, Name   string
		Description *string
	}
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.Name)
	resp, err := g.docs.CreateSpace(c.Context(), &docsv1.CreateSpaceRequest{Key: body.Key, Name: body.Name, Description: body.Description})
	if err != nil {
		return err
	}
	return c.Status(http.StatusCreated).JSON(toSpace(resp.GetSpace()))
}

func (g *gateway) getSpace(c fiber.Ctx) error {
	resp, err := g.docs.GetSpace(c.Context(), &docsv1.GetSpaceRequest{Key: c.Params("spaceKey")})
	if err != nil {
		return err
	}
	return c.JSON(toSpace(resp.GetSpace()))
}

func (g *gateway) getPageTree(c fiber.Ctx) error {
	resp, err := g.docs.GetPageTree(c.Context(), &docsv1.GetPageTreeRequest{SpaceKey: c.Params("spaceKey")})
	if err != nil {
		return err
	}
	return c.JSON(toPageTree(resp.GetRoots()))
}

// sendPage answers with one page, its author filled in.
func (g *gateway) sendPage(c fiber.Ctx, status int, page *docsv1.Page) error {
	found, err := g.loadUsers(c.Context(), page.GetAuthorId())
	if err != nil {
		return err
	}
	return c.Status(status).JSON(found.page(page))
}

func (g *gateway) createPage(c fiber.Ctx) error {
	var body struct {
		Title     string
		ParentID  *string
		ContentMd string
	}
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.Title)
	resp, err := g.docs.CreatePage(c.Context(), &docsv1.CreatePageRequest{
		SpaceKey: c.Params("spaceKey"), Title: body.Title, ParentId: body.ParentID,
		ContentMd: body.ContentMd, AuthorId: currentUser(c).GetId(),
	})
	if err != nil {
		return err
	}
	return g.sendPage(c, http.StatusCreated, resp.GetPage())
}

func (g *gateway) getPage(c fiber.Ctx) error {
	resp, err := g.docs.GetPage(c.Context(), &docsv1.GetPageRequest{Id: c.Params("pageId")})
	if err != nil {
		return err
	}
	return g.sendPage(c, http.StatusOK, resp.GetPage())
}

func (g *gateway) updatePage(c fiber.Ctx) error {
	mask, err := updateMask(c, map[string]string{"title": "title", "contentMd": "content_md", "parentId": "parent_id"})
	if err != nil {
		return err
	}
	var body struct {
		Title, ContentMd string
		ParentID         *string
	}
	if err := decode(c, &body); err != nil {
		return err
	}
	trim(&body.Title)
	resp, err := g.docs.UpdatePage(c.Context(), &docsv1.UpdatePageRequest{
		Id:         c.Params("pageId"),
		Page:       &docsv1.Page{Title: body.Title, ContentMd: body.ContentMd, ParentId: body.ParentID},
		UpdateMask: mask,
	})
	if err != nil {
		return err
	}
	return g.sendPage(c, http.StatusOK, resp.GetPage())
}

func (g *gateway) deletePage(c fiber.Ctx) error {
	resp, err := g.docs.DeletePage(c.Context(), &docsv1.DeletePageRequest{Id: c.Params("pageId")})
	if err != nil {
		return err
	}
	// No link may point at a deleted page.
	_, err = g.tracker.DeletePageLinks(c.Context(), &trackerv1.DeletePageLinksRequest{PageIds: resp.GetDeletedPageIds()})
	if err != nil {
		return err
	}
	return c.SendStatus(http.StatusNoContent)
}

// ======================= search =======================

// search asks tracker-service and docs-service at the same time.
func (g *gateway) search(c fiber.Ctx) error {
	q := strings.TrimSpace(c.Query("q"))
	var issues *trackerv1.SearchIssuesResponse
	var pages *docsv1.SearchPagesResponse
	group, ctx := errgroup.WithContext(c.Context())
	group.Go(func() (err error) {
		issues, err = g.tracker.SearchIssues(ctx, &trackerv1.SearchIssuesRequest{Q: q})
		return err
	})
	group.Go(func() (err error) {
		pages, err = g.docs.SearchPages(ctx, &docsv1.SearchPagesRequest{Q: q})
		return err
	})
	if err := group.Wait(); err != nil {
		return err
	}

	found, err := g.loadUsers(c.Context(), issueUserIDs(issues.GetIssues())...)
	if err != nil {
		return err
	}
	out := searchResultJSON{
		Issues: make([]issueSummaryJSON, len(issues.GetIssues())),
		Pages:  make([]pageSummaryJSON, len(pages.GetPages())),
	}
	for i, issue := range issues.GetIssues() {
		out.Issues[i] = found.issueSummary(issue)
	}
	for i, p := range pages.GetPages() {
		out.Pages[i] = toPageSummary(p)
	}
	return c.JSON(out)
}

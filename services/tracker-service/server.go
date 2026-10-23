package main

import (
	"context"
	"errors"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	trackerv1 "github.com/duck/tracking_board/gen/go/tracker/v1"
	"github.com/duck/tracking_board/services/internal/svc"
)

type server struct {
	trackerv1.UnimplementedTrackerServiceServer
	db *gorm.DB
}

var keyPattern = regexp.MustCompile(`^[A-Z][A-Z0-9]{1,9}$`)

// ======================= projects =======================

func (s *server) ListProjects(ctx context.Context, _ *trackerv1.ListProjectsRequest) (*trackerv1.ListProjectsResponse, error) {
	db := s.db.WithContext(ctx)
	var projects []Project
	if err := db.Order("created_at, id").Find(&projects).Error; err != nil {
		return nil, err
	}
	counts, err := issueCounts(db)
	if err != nil {
		return nil, err
	}
	resp := &trackerv1.ListProjectsResponse{Projects: make([]*trackerv1.Project, len(projects))}
	for i, p := range projects {
		resp.Projects[i] = projectProto(p, counts[p.Key])
	}
	return resp, nil
}

func (s *server) CreateProject(ctx context.Context, req *trackerv1.CreateProjectRequest) (*trackerv1.CreateProjectResponse, error) {
	name := strings.TrimSpace(req.GetName())
	switch {
	case !keyPattern.MatchString(req.GetKey()):
		return nil, invalid("key: must match ^[A-Z][A-Z0-9]{1,9}$")
	case name == "" || len([]rune(name)) > 100:
		return nil, invalid("name: must be 1 to 100 characters")
	case uuid.Validate(req.GetLeadId()) != nil:
		return nil, invalid("lead_id: must be a UUID")
	}

	project := Project{
		ID: uuid.NewString(), Key: req.GetKey(), Name: name, Description: req.Description,
		LeadID: req.GetLeadId(), NextIssueNumber: 1,
	}
	if err := s.db.WithContext(ctx).Create(&project).Error; err != nil {
		if svc.IsUniqueViolation(err) {
			return nil, status.Errorf(codes.AlreadyExists, "project key %s already exists", req.GetKey())
		}
		return nil, err
	}
	return &trackerv1.CreateProjectResponse{Project: projectProto(project, 0)}, nil
}

func (s *server) GetProject(ctx context.Context, req *trackerv1.GetProjectRequest) (*trackerv1.GetProjectResponse, error) {
	db := s.db.WithContext(ctx)
	project, err := findProject(db, req.GetKey())
	if err != nil {
		return nil, err
	}
	var count int64
	if err := db.Model(&Issue{}).Where("project_key = ?", project.Key).Count(&count).Error; err != nil {
		return nil, err
	}
	return &trackerv1.GetProjectResponse{Project: projectProto(project, int32(count))}, nil
}

// ======================= issues =======================

func (s *server) ListIssues(ctx context.Context, req *trackerv1.ListIssuesRequest) (*trackerv1.ListIssuesResponse, error) {
	db := s.db.WithContext(ctx)
	project, err := findProject(db, req.GetProjectKey())
	if err != nil {
		return nil, err
	}

	page, pageSize := req.GetPage(), req.GetPageSize()
	if page == 0 {
		page = 1
	}
	if pageSize == 0 {
		pageSize = 50
	}
	if page < 1 || pageSize < 1 || pageSize > 200 {
		return nil, invalid("page must be >= 1 and page_size 1..200")
	}

	query := db.Model(&Issue{}).Where("project_key = ?", project.Key)
	if req.Status != nil {
		if req.GetStatus() == trackerv1.IssueStatus_ISSUE_STATUS_UNSPECIFIED {
			return nil, invalid("status: must be set")
		}
		query = query.Where("status = ?", statusName(req.GetStatus()))
	}
	if req.AssigneeId != nil {
		if uuid.Validate(req.GetAssigneeId()) != nil {
			return nil, invalid("assignee_id: must be a UUID")
		}
		query = query.Where("assignee_id = ?", req.GetAssigneeId())
	}
	if q := strings.TrimSpace(req.GetQ()); q != "" {
		query = query.Where("title ILIKE ?", likePattern(q))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}
	var issues []Issue
	if err := query.Order(boardOrder).Offset(int((page - 1) * pageSize)).Limit(int(pageSize)).Find(&issues).Error; err != nil {
		return nil, err
	}
	protos, err := issuesProto(db, issues)
	if err != nil {
		return nil, err
	}
	return &trackerv1.ListIssuesResponse{Issues: protos, Page: page, PageSize: pageSize, Total: int32(total)}, nil
}

func (s *server) CreateIssue(ctx context.Context, req *trackerv1.CreateIssueRequest) (*trackerv1.CreateIssueResponse, error) {
	title := strings.TrimSpace(req.GetTitle())
	priority := req.GetPriority()
	if priority == trackerv1.IssuePriority_ISSUE_PRIORITY_UNSPECIFIED {
		priority = trackerv1.IssuePriority_ISSUE_PRIORITY_MEDIUM
	}
	switch {
	case title == "" || len([]rune(title)) > 200:
		return nil, invalid("title: must be 1 to 200 characters")
	case req.GetType() == trackerv1.IssueType_ISSUE_TYPE_UNSPECIFIED:
		return nil, invalid("type: must be set")
	case req.AssigneeId != nil && uuid.Validate(req.GetAssigneeId()) != nil:
		return nil, invalid("assignee_id: must be a UUID")
	case uuid.Validate(req.GetReporterId()) != nil:
		return nil, invalid("reporter_id: must be a UUID")
	}
	labels := req.GetLabels()
	if labels == nil {
		labels = []string{}
	}

	var issue Issue
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Lock the project row so two creates can't get the same number.
		var project Project
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("key = ?", req.GetProjectKey()).First(&project).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return status.Errorf(codes.NotFound, "project %s not found", req.GetProjectKey())
		}
		if err != nil {
			return err
		}
		number := project.NextIssueNumber
		if err := tx.Model(&project).Update("next_issue_number", number+1).Error; err != nil {
			return err
		}

		var todo []Issue
		if err := tx.Select("position").Where("project_key = ? AND status = ?", project.Key, "TODO").Find(&todo).Error; err != nil {
			return err
		}
		issue = Issue{
			ID:          uuid.NewString(),
			Key:         project.Key + "-" + strconv.Itoa(number),
			ProjectKey:  project.Key,
			Title:       title,
			Description: req.Description,
			Type:        typeName(req.GetType()),
			Status:      "TODO", // new issues always start in the first column
			Priority:    priorityName(priority),
			AssigneeID:  req.AssigneeId,
			ReporterID:  req.GetReporterId(),
			Position:    bottomPosition(todo),
			Labels:      pq.StringArray(labels),
		}
		return tx.Create(&issue).Error
	})
	if err != nil {
		return nil, err
	}
	return &trackerv1.CreateIssueResponse{Issue: issueProto(issue, 0)}, nil
}

func (s *server) GetIssue(ctx context.Context, req *trackerv1.GetIssueRequest) (*trackerv1.GetIssueResponse, error) {
	db := s.db.WithContext(ctx)
	issue, err := findIssue(db, req.GetKey())
	if err != nil {
		return nil, err
	}
	proto, err := issueProtoWithCount(db, issue)
	if err != nil {
		return nil, err
	}
	return &trackerv1.GetIssueResponse{Issue: proto}, nil
}

func (s *server) UpdateIssue(ctx context.Context, req *trackerv1.UpdateIssueRequest) (*trackerv1.UpdateIssueResponse, error) {
	in := req.GetIssue()
	if in == nil {
		in = &trackerv1.Issue{}
	}
	paths := req.GetUpdateMask().GetPaths()
	if len(paths) == 0 {
		return nil, invalid("update_mask: must list at least one field")
	}

	changes := map[string]any{}
	for _, path := range paths {
		switch path {
		case "title":
			title := strings.TrimSpace(in.GetTitle())
			if title == "" || len([]rune(title)) > 200 {
				return nil, invalid("title: must be 1 to 200 characters")
			}
			changes["title"] = title
		case "description":
			changes["description"] = in.Description // not set = null
		case "type":
			if in.GetType() == trackerv1.IssueType_ISSUE_TYPE_UNSPECIFIED {
				return nil, invalid("type: must be set")
			}
			changes["type"] = typeName(in.GetType())
		case "priority":
			if in.GetPriority() == trackerv1.IssuePriority_ISSUE_PRIORITY_UNSPECIFIED {
				return nil, invalid("priority: must be set")
			}
			changes["priority"] = priorityName(in.GetPriority())
		case "assignee_id":
			if in.AssigneeId != nil && uuid.Validate(in.GetAssigneeId()) != nil {
				return nil, invalid("assignee_id: must be a UUID")
			}
			changes["assignee_id"] = in.AssigneeId // not set = unassign
		case "labels":
			labels := in.GetLabels()
			if labels == nil {
				labels = []string{}
			}
			changes["labels"] = pq.StringArray(labels)
		default:
			// status is not here on purpose — use MoveIssue for that.
			return nil, invalid("update_mask: " + path + " cannot be updated")
		}
	}
	changes["updated_at"] = time.Now().UTC()

	db := s.db.WithContext(ctx)
	issue, err := findIssue(db, req.GetKey())
	if err != nil {
		return nil, err
	}
	if err := db.Model(&issue).Updates(changes).Error; err != nil {
		return nil, err
	}
	if err := db.First(&issue, "id = ?", issue.ID).Error; err != nil {
		return nil, err
	}
	proto, err := issueProtoWithCount(db, issue)
	if err != nil {
		return nil, err
	}
	return &trackerv1.UpdateIssueResponse{Issue: proto}, nil
}

func (s *server) DeleteIssue(ctx context.Context, req *trackerv1.DeleteIssueRequest) (*trackerv1.DeleteIssueResponse, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		issue, err := findIssue(tx, req.GetKey())
		if err != nil {
			return err
		}
		if err := tx.Where("issue_id = ?", issue.ID).Delete(&Comment{}).Error; err != nil {
			return err
		}
		if err := tx.Where("issue_id = ?", issue.ID).Delete(&IssuePageLink{}).Error; err != nil {
			return err
		}
		return tx.Delete(&issue).Error
	})
	if err != nil {
		return nil, err
	}
	return &trackerv1.DeleteIssueResponse{}, nil
}

func (s *server) MoveIssue(ctx context.Context, req *trackerv1.MoveIssueRequest) (*trackerv1.MoveIssueResponse, error) {
	if req.GetStatus() == trackerv1.IssueStatus_ISSUE_STATUS_UNSPECIFIED {
		return nil, invalid("status: must be set")
	}
	target := statusName(req.GetStatus())

	var issue Issue
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		if issue, err = findIssue(tx, req.GetKey()); err != nil {
			return err
		}
		// Lock the project so two drops into the same column don't pick the same spot.
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("key = ?", issue.ProjectKey).First(&Project{}).Error; err != nil {
			return err
		}

		// Neighbours must exist and already be in the target column.
		neighbour := func(key *string, field string) (*Issue, error) {
			if key == nil {
				return nil, nil
			}
			if *key == issue.Key {
				return nil, invalid(field + " cannot be the issue itself")
			}
			other, err := findIssue(tx, *key)
			if err != nil {
				return nil, err
			}
			if other.ProjectKey != issue.ProjectKey || other.Status != target {
				return nil, invalid(field + " " + *key + " is not in column " + target)
			}
			return &other, nil
		}
		after, err := neighbour(req.AfterKey, "afterKey")
		if err != nil {
			return err
		}
		before, err := neighbour(req.BeforeKey, "beforeKey")
		if err != nil {
			return err
		}

		column, err := loadColumn(tx, issue, target)
		if err != nil {
			return err
		}
		position, err := newPosition(column, after, before)
		if errors.Is(err, errNoRoom) {
			// Renumber the column 1024, 2048, … and try again with the new numbers.
			if column, err = renumberColumn(tx, column); err != nil {
				return err
			}
			after, before = refresh(column, after), refresh(column, before)
			position, err = newPosition(column, after, before)
		}
		if err != nil {
			if errors.Is(err, errNoRoom) {
				return err
			}
			return invalid(err.Error())
		}

		issue.Status, issue.Position, issue.UpdatedAt = target, position, time.Now().UTC()
		return tx.Model(&issue).Updates(map[string]any{
			"status": issue.Status, "position": issue.Position, "updated_at": issue.UpdatedAt,
		}).Error
	})
	if err != nil {
		return nil, err
	}
	proto, err := issueProtoWithCount(s.db.WithContext(ctx), issue)
	if err != nil {
		return nil, err
	}
	return &trackerv1.MoveIssueResponse{Issue: proto}, nil
}

// loadColumn returns the other cards of the target column, top → bottom.
func loadColumn(tx *gorm.DB, moving Issue, status string) ([]Issue, error) {
	var column []Issue
	err := tx.Where("project_key = ? AND status = ? AND id <> ?", moving.ProjectKey, status, moving.ID).
		Order("position, created_at").Find(&column).Error
	return column, err
}

func renumberColumn(tx *gorm.DB, column []Issue) ([]Issue, error) {
	for i := range column {
		column[i].Position = float64((i + 1) * positionGap)
		if err := tx.Model(&column[i]).UpdateColumn("position", column[i].Position).Error; err != nil {
			return nil, err
		}
	}
	return column, nil
}

// refresh returns the copy of neighbour inside column (with its new position).
func refresh(column []Issue, neighbour *Issue) *Issue {
	if neighbour == nil {
		return nil
	}
	for i := range column {
		if column[i].ID == neighbour.ID {
			return &column[i]
		}
	}
	return neighbour
}

func (s *server) SearchIssues(ctx context.Context, req *trackerv1.SearchIssuesRequest) (*trackerv1.SearchIssuesResponse, error) {
	q := strings.TrimSpace(req.GetQ())
	if q == "" {
		return nil, invalid("q: must not be blank")
	}
	limit := req.GetLimit()
	if limit <= 0 {
		limit = 20
	}

	db := s.db.WithContext(ctx)
	pattern := likePattern(q)
	var issues []Issue
	err := db.Where("key ILIKE ? OR title ILIKE ? OR description ILIKE ? OR EXISTS (SELECT 1 FROM unnest(labels) AS l WHERE l ILIKE ?)",
		pattern, pattern, pattern, pattern).
		Order("created_at, id").Limit(int(limit)).Find(&issues).Error
	if err != nil {
		return nil, err
	}
	protos, err := issuesProto(db, issues)
	if err != nil {
		return nil, err
	}
	return &trackerv1.SearchIssuesResponse{Issues: protos}, nil
}

// ======================= comments =======================

func (s *server) ListComments(ctx context.Context, req *trackerv1.ListCommentsRequest) (*trackerv1.ListCommentsResponse, error) {
	db := s.db.WithContext(ctx)
	issue, err := findIssue(db, req.GetIssueKey())
	if err != nil {
		return nil, err
	}
	var comments []Comment
	if err := db.Where("issue_id = ?", issue.ID).Order("created_at, id").Find(&comments).Error; err != nil {
		return nil, err
	}
	resp := &trackerv1.ListCommentsResponse{Comments: make([]*trackerv1.Comment, len(comments))}
	for i, c := range comments {
		resp.Comments[i] = commentProto(c, issue.Key)
	}
	return resp, nil
}

func (s *server) CreateComment(ctx context.Context, req *trackerv1.CreateCommentRequest) (*trackerv1.CreateCommentResponse, error) {
	body := strings.TrimSpace(req.GetBody())
	switch {
	case body == "" || len([]rune(body)) > 5000:
		return nil, invalid("body: must be 1 to 5000 characters")
	case uuid.Validate(req.GetAuthorId()) != nil:
		return nil, invalid("author_id: must be a UUID")
	}

	db := s.db.WithContext(ctx)
	issue, err := findIssue(db, req.GetIssueKey())
	if err != nil {
		return nil, err
	}
	comment := Comment{ID: uuid.NewString(), IssueID: issue.ID, AuthorID: req.GetAuthorId(), Body: body}
	if err := db.Create(&comment).Error; err != nil {
		return nil, err
	}
	return &trackerv1.CreateCommentResponse{Comment: commentProto(comment, issue.Key)}, nil
}

// ======================= links =======================

func (s *server) ListIssueLinks(ctx context.Context, req *trackerv1.ListIssueLinksRequest) (*trackerv1.ListIssueLinksResponse, error) {
	db := s.db.WithContext(ctx)
	issue, err := findIssue(db, req.GetIssueKey())
	if err != nil {
		return nil, err
	}
	var pageIDs []string
	err = db.Model(&IssuePageLink{}).Where("issue_id = ?", issue.ID).Order("created_at, page_id").Pluck("page_id", &pageIDs).Error
	if err != nil {
		return nil, err
	}
	return &trackerv1.ListIssueLinksResponse{PageIds: pageIDs}, nil
}

func (s *server) CreateIssueLink(ctx context.Context, req *trackerv1.CreateIssueLinkRequest) (*trackerv1.CreateIssueLinkResponse, error) {
	if uuid.Validate(req.GetPageId()) != nil {
		return nil, invalid("page_id: must be a UUID")
	}
	db := s.db.WithContext(ctx)
	issue, err := findIssue(db, req.GetIssueKey())
	if err != nil {
		return nil, err
	}
	if err := db.Create(&IssuePageLink{IssueID: issue.ID, PageID: req.GetPageId()}).Error; err != nil {
		if svc.IsUniqueViolation(err) {
			return nil, status.Errorf(codes.AlreadyExists, "issue %s is already linked to page %s", issue.Key, req.GetPageId())
		}
		return nil, err
	}
	return &trackerv1.CreateIssueLinkResponse{}, nil
}

func (s *server) DeleteIssueLink(ctx context.Context, req *trackerv1.DeleteIssueLinkRequest) (*trackerv1.DeleteIssueLinkResponse, error) {
	db := s.db.WithContext(ctx)
	issue, err := findIssue(db, req.GetIssueKey())
	if err != nil {
		return nil, err
	}
	notLinked := status.Errorf(codes.NotFound, "issue %s is not linked to page %s", issue.Key, req.GetPageId())
	if uuid.Validate(req.GetPageId()) != nil {
		return nil, notLinked
	}
	result := db.Where("issue_id = ? AND page_id = ?", issue.ID, req.GetPageId()).Delete(&IssuePageLink{})
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, notLinked
	}
	return &trackerv1.DeleteIssueLinkResponse{}, nil
}

func (s *server) ListPageLinkedIssues(ctx context.Context, req *trackerv1.ListPageLinkedIssuesRequest) (*trackerv1.ListPageLinkedIssuesResponse, error) {
	if uuid.Validate(req.GetPageId()) != nil {
		return &trackerv1.ListPageLinkedIssuesResponse{}, nil
	}
	db := s.db.WithContext(ctx)
	var issues []Issue
	err := db.Joins("JOIN issue_page_links ON issue_page_links.issue_id = issues.id").
		Where("issue_page_links.page_id = ?", req.GetPageId()).
		Order(boardOrder).Find(&issues).Error
	if err != nil {
		return nil, err
	}
	protos, err := issuesProto(db, issues)
	if err != nil {
		return nil, err
	}
	return &trackerv1.ListPageLinkedIssuesResponse{Issues: protos}, nil
}

func (s *server) DeletePageLinks(ctx context.Context, req *trackerv1.DeletePageLinksRequest) (*trackerv1.DeletePageLinksResponse, error) {
	ids := make([]string, 0, len(req.GetPageIds()))
	for _, id := range req.GetPageIds() {
		if uuid.Validate(id) == nil {
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		return &trackerv1.DeletePageLinksResponse{}, nil
	}
	result := s.db.WithContext(ctx).Where("page_id IN ?", ids).Delete(&IssuePageLink{})
	if result.Error != nil {
		return nil, result.Error
	}
	return &trackerv1.DeletePageLinksResponse{DeletedCount: int32(result.RowsAffected)}, nil
}

// ======================= helpers =======================

func invalid(msg string) error { return status.Error(codes.InvalidArgument, msg) }

func findProject(db *gorm.DB, key string) (Project, error) {
	var project Project
	err := db.Where("key = ?", key).First(&project).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return project, status.Errorf(codes.NotFound, "project %s not found", key)
	}
	return project, err
}

func findIssue(db *gorm.DB, key string) (Issue, error) {
	var issue Issue
	err := db.Where("key = ?", key).First(&issue).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return issue, status.Errorf(codes.NotFound, "issue %s not found", key)
	}
	return issue, err
}

// issueCounts returns project key → number of issues.
func issueCounts(db *gorm.DB) (map[string]int32, error) {
	var rows []struct {
		ProjectKey string
		Count      int32
	}
	if err := db.Model(&Issue{}).Select("project_key, count(*) AS count").Group("project_key").Scan(&rows).Error; err != nil {
		return nil, err
	}
	counts := make(map[string]int32, len(rows))
	for _, r := range rows {
		counts[r.ProjectKey] = r.Count
	}
	return counts, nil
}

// issuesProto converts issues, filling linked_page_count with one query.
func issuesProto(db *gorm.DB, issues []Issue) ([]*trackerv1.Issue, error) {
	out := make([]*trackerv1.Issue, len(issues))
	if len(issues) == 0 {
		return out, nil
	}
	ids := make([]string, len(issues))
	for i, issue := range issues {
		ids[i] = issue.ID
	}
	var rows []struct {
		IssueID string
		Count   int32
	}
	err := db.Model(&IssuePageLink{}).Select("issue_id, count(*) AS count").
		Where("issue_id IN ?", ids).Group("issue_id").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	counts := make(map[string]int32, len(rows))
	for _, r := range rows {
		counts[r.IssueID] = r.Count
	}
	for i, issue := range issues {
		out[i] = issueProto(issue, counts[issue.ID])
	}
	return out, nil
}

func issueProtoWithCount(db *gorm.DB, issue Issue) (*trackerv1.Issue, error) {
	protos, err := issuesProto(db, []Issue{issue})
	if err != nil {
		return nil, err
	}
	return protos[0], nil
}

// likePattern turns user text into an ILIKE "contains" pattern, escaping % and _.
func likePattern(q string) string {
	return "%" + strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(q) + "%"
}

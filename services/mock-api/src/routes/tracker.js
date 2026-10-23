// Projects, issues, comments and issue↔page links.
// In the real system these are served by tracker-service (which owns issue_page_links).

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import {
  db, now, findProject, findIssue, findPage, findUser,
  toProject, toIssue, toIssueSummary, toComment, toPageSummary,
} from '../db.js';
import { badRequest, conflict, notFound } from '../errors.js';

export const trackerRoutes = Router();

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
const POSITION_GAP = 1024;

// Board order: by column, then by position inside the column.
const byBoardOrder = (a, b) =>
  STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.position - b.position;

function assertUserExists(userId, field) {
  if (userId != null && !findUser(userId)) throw badRequest(`${field}: user ${userId} not found`);
}

// The position for a new card at the bottom of a column.
function bottomPosition(projectKey, status) {
  const inColumn = db.issues.filter((i) => i.projectKey === projectKey && i.status === status);
  const max = Math.max(0, ...inColumn.map((i) => i.position));
  return max + POSITION_GAP;
}

// ---------------- projects ----------------

trackerRoutes.get('/projects', (req, res) => {
  res.json(db.projects.map(toProject));
});

trackerRoutes.post('/projects', (req, res) => {
  const { key, name, description = null } = req.body;
  if (db.projects.some((p) => p.key === key)) throw conflict(`project key ${key} already exists`);
  const project = {
    id: randomUUID(), key, name, description, leadId: req.user.id, createdAt: now(), nextIssueNumber: 1,
  };
  db.projects.push(project);
  res.status(201).json(toProject(project));
});

trackerRoutes.get('/projects/:projectKey', (req, res) => {
  res.json(toProject(findProject(req.params.projectKey)));
});

// ---------------- issues ----------------

// GET /projects/TB/issues?status=&assigneeId=&q=&page=&pageSize=
trackerRoutes.get('/projects/:projectKey/issues', (req, res) => {
  const project = findProject(req.params.projectKey);
  // The validator already converted page/pageSize to numbers and applied defaults,
  // but we keep fallbacks so this code also reads well on its own.
  const { status, assigneeId, q } = req.query;
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 50);

  let items = db.issues.filter((i) => i.projectKey === project.key);
  if (status) items = items.filter((i) => i.status === status);
  if (assigneeId) items = items.filter((i) => i.assigneeId === assigneeId);
  if (q) items = items.filter((i) => i.title.toLowerCase().includes(String(q).trim().toLowerCase()));
  items.sort(byBoardOrder);

  const start = (page - 1) * pageSize;
  res.json({
    items: items.slice(start, start + pageSize).map(toIssue),
    page,
    pageSize,
    total: items.length,
  });
});

// POST /projects/TB/issues → new issue gets the next key (TB-13, TB-14, ...)
trackerRoutes.post('/projects/:projectKey/issues', (req, res) => {
  const project = findProject(req.params.projectKey);
  const { title, type, description = null, priority = 'MEDIUM', assigneeId = null, labels = [] } = req.body;
  assertUserExists(assigneeId, 'assigneeId');

  const number = project.nextIssueNumber++;
  const timestamp = now();
  const issue = {
    id: randomUUID(),
    projectKey: project.key,
    key: `${project.key}-${number}`,
    title,
    description,
    type,
    status: 'TODO', // new issues always start in the first column
    priority,
    assigneeId,
    reporterId: req.user.id,
    position: bottomPosition(project.key, 'TODO'),
    labels,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.issues.push(issue);
  res.status(201).json(toIssue(issue));
});

trackerRoutes.get('/issues/:issueKey', (req, res) => {
  res.json(toIssue(findIssue(req.params.issueKey)));
});

// PATCH /issues/TB-12 — only the fields that are sent are changed.
// (status is NOT here on purpose — use POST /move for that.)
trackerRoutes.patch('/issues/:issueKey', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  const allowed = ['title', 'description', 'type', 'priority', 'assigneeId', 'labels'];
  if ('assigneeId' in req.body) assertUserExists(req.body.assigneeId, 'assigneeId');
  for (const field of allowed) {
    if (field in req.body) issue[field] = req.body[field];
  }
  issue.updatedAt = now();
  res.json(toIssue(issue));
});

// DELETE /issues/TB-12 — also removes its comments and links.
trackerRoutes.delete('/issues/:issueKey', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  db.issues = db.issues.filter((i) => i.id !== issue.id);
  db.comments = db.comments.filter((c) => c.issueId !== issue.id);
  db.links = db.links.filter((l) => l.issueId !== issue.id);
  res.status(204).end();
});

// POST /issues/TB-12/move { status, afterKey?, beforeKey? }
//
// Drag & drop: put the card into column `status`, below `afterKey` and above
// `beforeKey`. We use "fractional positions": the new position is halfway
// between the neighbours, so no other card needs to be renumbered.
trackerRoutes.post('/issues/:issueKey/move', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  const { status, afterKey = null, beforeKey = null } = req.body;

  // Neighbours must exist and already be in the target column.
  const neighbour = (key, field) => {
    if (!key) return null;
    if (key === issue.key) throw badRequest(`${field} cannot be the issue itself`);
    const other = findIssue(key);
    if (other.projectKey !== issue.projectKey || other.status !== status) {
      throw badRequest(`${field} ${key} is not in column ${status}`);
    }
    return other;
  };
  const after = neighbour(afterKey, 'afterKey');
  const before = neighbour(beforeKey, 'beforeKey');

  // The other cards in the target column, top → bottom (without the moved card).
  const column = db.issues
    .filter((i) => i.id !== issue.id && i.projectKey === issue.projectKey && i.status === status)
    .sort((a, b) => a.position - b.position);

  // Work out the two neighbours the card lands between ("upper" and "lower").
  // If only one of afterKey/beforeKey is given, the other neighbour is simply
  // the next card in the column (or nothing, at the top/bottom).
  let upper = after;
  let lower = before;
  if (upper && !lower) lower = column.find((i) => i.position > upper.position) || null;
  if (lower && !upper) upper = [...column].reverse().find((i) => i.position < lower.position) || null;
  if (!upper && !lower) upper = column[column.length - 1] || null; // no hints = bottom of column

  let position;
  if (upper && lower) {
    if (upper.position >= lower.position) throw badRequest('afterKey must be above beforeKey');
    position = (upper.position + lower.position) / 2;
  } else if (upper) {
    position = upper.position + POSITION_GAP; // bottom of column
  } else if (lower) {
    position = lower.position - POSITION_GAP; // top of column (negative numbers are fine)
  } else {
    position = POSITION_GAP; // empty column
  }

  issue.status = status;
  issue.position = position;
  issue.updatedAt = now();
  res.json(toIssue(issue));
});

// ---------------- comments ----------------

trackerRoutes.get('/issues/:issueKey/comments', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  const comments = db.comments
    .filter((c) => c.issueId === issue.id)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)); // old → new
  res.json(comments.map(toComment));
});

trackerRoutes.post('/issues/:issueKey/comments', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  const comment = { id: randomUUID(), issueId: issue.id, authorId: req.user.id, body: req.body.body, createdAt: now() };
  db.comments.push(comment);
  res.status(201).json(toComment(comment));
});

// ---------------- issue ↔ page links ----------------
// One row in db.links = one link. It is visible from BOTH sides:
//   GET /issues/{key}/links           → pages of an issue
//   GET /pages/{id}/linked-issues     → issues of a page

trackerRoutes.get('/issues/:issueKey/links', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  const pages = db.links
    .filter((l) => l.issueId === issue.id)
    .map((l) => db.pages.find((p) => p.id === l.pageId))
    .filter(Boolean);
  res.json(pages.map(toPageSummary));
});

trackerRoutes.post('/issues/:issueKey/links', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  const page = findPage(req.body.pageId); // 404 if the page doesn't exist
  if (db.links.some((l) => l.issueId === issue.id && l.pageId === page.id)) {
    throw conflict(`issue ${issue.key} is already linked to page ${page.id}`);
  }
  db.links.push({ issueId: issue.id, pageId: page.id, createdAt: now() });
  res.status(201).json(toPageSummary(page));
});

trackerRoutes.delete('/issues/:issueKey/links/:pageId', (req, res) => {
  const issue = findIssue(req.params.issueKey);
  const before = db.links.length;
  db.links = db.links.filter((l) => !(l.issueId === issue.id && l.pageId === req.params.pageId));
  if (db.links.length === before) {
    throw notFound(`issue ${issue.key} is not linked to page ${req.params.pageId}`);
  }
  res.status(204).end();
});

trackerRoutes.get('/pages/:pageId/linked-issues', (req, res) => {
  const page = findPage(req.params.pageId);
  const issues = db.links
    .filter((l) => l.pageId === page.id)
    .map((l) => db.issues.find((i) => i.id === l.issueId))
    .filter(Boolean)
    .sort(byBoardOrder);
  res.json(issues.map(toIssueSummary));
});

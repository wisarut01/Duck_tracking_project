// In-memory "database" + functions that turn stored rows into API shapes.
//
// Stored rows keep only IDs (e.g. issue.assigneeId). The `to...()` functions
// below build the JSON the spec expects (e.g. issue.assignee = full User).

import { createSeed } from './seed.js';
import { notFound } from './errors.js';

// `db` is exported as a single object whose fields we replace on reset,
// so every module that imported it sees the fresh data.
export const db = {};
export function resetDb() {
  Object.assign(db, createSeed());
}
resetDb();

export const now = () => new Date().toISOString();

// ---------- finders (throw 404 when missing) ----------

export function findProject(key) {
  const project = db.projects.find((p) => p.key === key);
  if (!project) throw notFound(`project ${key} not found`);
  return project;
}

export function findIssue(key) {
  const issue = db.issues.find((i) => i.key === key);
  if (!issue) throw notFound(`issue ${key} not found`);
  return issue;
}

export function findSpace(key) {
  const space = db.spaces.find((s) => s.key === key);
  if (!space) throw notFound(`space ${key} not found`);
  return space;
}

export function findPage(id) {
  const page = db.pages.find((p) => p.id === id);
  if (!page) throw notFound(`page ${id} not found`);
  return page;
}

export const findUser = (id) => db.users.find((u) => u.id === id) || null;

// ---------- API views ----------

// User without the password!
export function toUser(user) {
  if (!user) return null;
  const { id, email, displayName, avatarUrl } = user;
  return { id, email, displayName, avatarUrl };
}

export function toProject(p) {
  return {
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    leadId: p.leadId,
    issueCount: db.issues.filter((i) => i.projectKey === p.key).length,
    createdAt: p.createdAt,
  };
}

export function toIssueSummary(i) {
  return {
    id: i.id,
    key: i.key,
    title: i.title,
    type: i.type,
    status: i.status,
    priority: i.priority,
    assignee: toUser(findUser(i.assigneeId)),
  };
}

export function toIssue(i) {
  return {
    ...toIssueSummary(i),
    projectKey: i.projectKey,
    description: i.description,
    reporter: toUser(findUser(i.reporterId)),
    position: i.position,
    labels: i.labels,
    linkedPageCount: db.links.filter((l) => l.issueId === i.id).length,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

export function toComment(c) {
  const issue = db.issues.find((i) => i.id === c.issueId);
  return {
    id: c.id,
    issueKey: issue.key,
    author: toUser(findUser(c.authorId)),
    body: c.body,
    createdAt: c.createdAt,
  };
}

export function toSpace(s) {
  const { id, key, name, description, createdAt } = s;
  return { id, key, name, description, createdAt };
}

export function toPageSummary(p) {
  return { id: p.id, spaceKey: p.spaceKey, title: p.title, updatedAt: p.updatedAt };
}

export function toPage(p) {
  return {
    id: p.id,
    spaceKey: p.spaceKey,
    parentId: p.parentId,
    title: p.title,
    contentMd: p.contentMd,
    author: toUser(findUser(p.authorId)),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

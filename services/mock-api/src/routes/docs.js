// Spaces and pages — in the real system these are served by docs-service (Python).

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, now, findSpace, findPage, toSpace, toPage } from '../db.js';
import { badRequest, conflict } from '../errors.js';

export const docsRoutes = Router();

// ---------------- spaces ----------------

docsRoutes.get('/spaces', (req, res) => {
  res.json(db.spaces.map(toSpace));
});

docsRoutes.post('/spaces', (req, res) => {
  const { key, name, description = null } = req.body;
  if (db.spaces.some((s) => s.key === key)) throw conflict(`space key ${key} already exists`);
  const space = { id: randomUUID(), key, name, description, createdAt: now() };
  db.spaces.push(space);
  res.status(201).json(toSpace(space));
});

docsRoutes.get('/spaces/:spaceKey', (req, res) => {
  res.json(toSpace(findSpace(req.params.spaceKey)));
});

// ---------------- page tree ----------------

// Turn the flat list of pages into a nested tree:
//   [{ id, title, children: [{ id, title, children: [...] }] }]
function buildTree(pages, parentId = null) {
  return pages
    .filter((p) => p.parentId === parentId)
    .map((p) => ({ id: p.id, title: p.title, children: buildTree(pages, p.id) }));
}

docsRoutes.get('/spaces/:spaceKey/pages', (req, res) => {
  const space = findSpace(req.params.spaceKey);
  res.json(buildTree(db.pages.filter((p) => p.spaceKey === space.key)));
});

// parentId (if given) must be a page in the same space.
function assertValidParent(spaceKey, parentId) {
  if (parentId == null) return;
  const parent = db.pages.find((p) => p.id === parentId);
  if (!parent || parent.spaceKey !== spaceKey) {
    throw badRequest(`parentId ${parentId} is not a page in space ${spaceKey}`);
  }
}

docsRoutes.post('/spaces/:spaceKey/pages', (req, res) => {
  const space = findSpace(req.params.spaceKey);
  const { title, parentId = null, contentMd = '' } = req.body;
  assertValidParent(space.key, parentId);
  const timestamp = now();
  const page = {
    id: randomUUID(), spaceKey: space.key, parentId, title, contentMd,
    authorId: req.user.id, createdAt: timestamp, updatedAt: timestamp,
  };
  db.pages.push(page);
  res.status(201).json(toPage(page));
});

// ---------------- single page ----------------

docsRoutes.get('/pages/:pageId', (req, res) => {
  res.json(toPage(findPage(req.params.pageId)));
});

// All ids below a page (children, grandchildren, ...).
function descendantIds(pageId) {
  const children = db.pages.filter((p) => p.parentId === pageId).map((p) => p.id);
  return children.flatMap((childId) => [childId, ...descendantIds(childId)]);
}

docsRoutes.patch('/pages/:pageId', (req, res) => {
  const page = findPage(req.params.pageId);
  if ('parentId' in req.body) {
    const { parentId } = req.body;
    assertValidParent(page.spaceKey, parentId);
    // Moving a page under itself or its own child would create a loop.
    if (parentId === page.id || descendantIds(page.id).includes(parentId)) {
      throw badRequest('a page cannot be moved under itself or its own children');
    }
    page.parentId = parentId;
  }
  if ('title' in req.body) page.title = req.body.title;
  if ('contentMd' in req.body) page.contentMd = req.body.contentMd;
  page.updatedAt = now();
  res.json(toPage(page));
});

// DELETE removes the page AND all its children (and their issue links).
docsRoutes.delete('/pages/:pageId', (req, res) => {
  const page = findPage(req.params.pageId);
  const toDelete = new Set([page.id, ...descendantIds(page.id)]);
  db.pages = db.pages.filter((p) => !toDelete.has(p.id));
  // In the real system the gateway/docs-service would tell tracker-service to drop these links.
  db.links = db.links.filter((l) => !toDelete.has(l.pageId));
  res.status(204).end();
});

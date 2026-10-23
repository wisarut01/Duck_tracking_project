// GET /search?q=... → { issues: [...], pages: [...] }
// In the real system the gateway calls tracker-service AND docs-service and merges results.

import { Router } from 'express';
import { db, toIssueSummary, toPageSummary } from '../db.js';

export const searchRoutes = Router();

const MAX_RESULTS = 20; // per type

searchRoutes.get('/search', (req, res) => {
  const q = String(req.query.q).trim().toLowerCase();
  const has = (text) => (text || '').toLowerCase().includes(q);

  const issues = db.issues
    .filter((i) => has(i.key) || has(i.title) || has(i.description) || i.labels.some(has))
    .slice(0, MAX_RESULTS);
  const pages = db.pages
    .filter((p) => has(p.title) || has(p.contentMd))
    .slice(0, MAX_RESULTS);

  res.json({ issues: issues.map(toIssueSummary), pages: pages.map(toPageSummary) });
});

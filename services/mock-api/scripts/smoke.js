// Smoke test for the mock: runs the main demo flow against a running server.
//   npm start            (in another terminal)
//   npm run smoke
// Resets the data first, so it can be run any number of times.

import assert from 'node:assert/strict';

const ROOT = process.env.MOCK_URL || 'http://localhost:4010';
const BASE = `${ROOT}/api/v1`;
let token = null;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  console.log(`${method.padEnd(6)} ${path.padEnd(48)} → ${res.status}`);
  return { status: res.status, json };
}

await fetch(`${ROOT}/__mock/reset`, { method: 'POST' });

// 1. no token → 401 in the spec's error format
let r = await call('GET', '/projects');
assert.equal(r.status, 401);
assert.equal(r.json.error.code, 'UNAUTHENTICATED');

// 2. login
r = await call('POST', '/auth/login', { email: 'duck@example.com', password: 'password123' });
assert.equal(r.status, 200);
token = r.json.accessToken;
r = await call('GET', '/auth/me');
assert.equal(r.json.email, 'duck@example.com');

// 3. list issues of TB
r = await call('GET', '/projects/TB/issues');
assert.equal(r.json.total, 12);
const statuses = new Set(r.json.items.map((i) => i.status));
assert.equal(statuses.size, 4, 'issues should cover all 4 columns');

// 4. create → TB-13
r = await call('POST', '/projects/TB/issues', { title: 'Smoke test issue', type: 'BUG', priority: 'HIGH' });
assert.equal(r.status, 201);
assert.equal(r.json.key, 'TB-13');
assert.equal(r.json.status, 'TODO');

// 5. move TB-13 to IN_REVIEW between TB-4 and TB-9
r = await call('POST', '/issues/TB-13/move', { status: 'IN_REVIEW', afterKey: 'TB-4', beforeKey: 'TB-9' });
assert.equal(r.json.status, 'IN_REVIEW');
r = await call('GET', '/projects/TB/issues?status=IN_REVIEW');
assert.deepEqual(r.json.items.map((i) => i.key), ['TB-4', 'TB-13', 'TB-9']);

// 6. link TB-13 ↔ "Board Spec" and see it from both sides
const boardSpecId = '5e6f7081-0000-4000-8000-000000000001';
r = await call('POST', '/issues/TB-13/links', { pageId: boardSpecId });
assert.equal(r.status, 201);
r = await call('POST', '/issues/TB-13/links', { pageId: boardSpecId });
assert.equal(r.status, 409, 'linking twice → ALREADY_EXISTS');
r = await call('GET', `/pages/${boardSpecId}/linked-issues`);
assert.ok(r.json.some((i) => i.key === 'TB-13'));
r = await call('GET', '/issues/TB-13');
assert.equal(r.json.linkedPageCount, 1);

// 7. search finds both issues and pages
r = await call('GET', '/search?q=board');
assert.ok(r.json.issues.length > 0 && r.json.pages.length > 0);

// 8. page tree is nested 3 levels deep
r = await call('GET', '/spaces/ENG/pages');
const home = r.json.find((p) => p.title === 'Engineering Home');
assert.ok(home.children[0].children.length > 0);

// 9. validation + not found errors
r = await call('POST', '/projects/TB/issues', { type: 'TASK' });
assert.equal(r.status, 400);
assert.equal(r.json.error.code, 'VALIDATION_FAILED');
r = await call('GET', '/issues/TB-999');
assert.equal(r.status, 404);
assert.equal(r.json.error.code, 'NOT_FOUND');

await fetch(`${ROOT}/__mock/reset`, { method: 'POST' });
console.log('\nAll smoke checks passed ✔ (data was reset again)');

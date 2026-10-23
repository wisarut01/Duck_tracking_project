import { test, expect, expectResponse, expectError, createIssue, uniqueKey } from '../lib/fixtures';
import { randomUUID } from 'node:crypto';

test.describe('error format', () => {
  test('TC-ERR-001 404 body is { error: { code: NOT_FOUND, message } }', { tag: '@P0' }, async ({ api }) => {
    const b = await expectError(await api.get(`/pages/${randomUUID()}`), 404, 'NOT_FOUND');
    expect(Object.keys(b)).toEqual(['error']);
  });

  test('TC-ERR-002 400 body is VALIDATION_FAILED', { tag: '@P0' }, async ({ api, project }) => {
    await expectError(await api.post(`/projects/${project.key}/issues`, { title: '', type: 'TASK' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-ERR-003 401 body is UNAUTHENTICATED', { tag: '@P0' }, async ({ anon }) => {
    await expectError(await anon.get('/projects'), 401, 'UNAUTHENTICATED');
  });

  test('TC-ERR-004 409 body is ALREADY_EXISTS', { tag: '@P1' }, async ({ api, project }) => {
    await expectError(await api.post('/projects', { key: project.key, name: 'dup' }), 409, 'ALREADY_EXISTS');
  });

  test('TC-ERR-005 malformed JSON body returns 400 (not 500)', { tag: '@P1' }, async ({ api, project }) => {
    const res = await api.post(`/projects/${project.key}/issues`, '{"title": "x", "type": ', {
      'Content-Type': 'application/json',
    });
    await expectError(res, 400, 'VALIDATION_FAILED');
  });

  test('TC-ERR-006 invalid path param format returns 400 or 404 with Error body', { tag: '@P2' }, async ({ api }) => {
    for (const path of ['/issues/not-a-key', '/pages/not-a-uuid', `/projects/${uniqueKey('Z').toLowerCase()}`]) {
      const res = await api.get(path);
      expect([400, 404], `${path} -> ${res.status()}`).toContain(res.status());
      const errBody: unknown = await res.json();
    expect(errBody).toMatchSchema('Error');
    }
  });

  test('TC-ERR-010 method not in the spec returns 404 NOT_FOUND (not 405)', { tag: '@P2' }, async ({ api }) => {
    await expectError(await api.put('/projects', {}), 404, 'NOT_FOUND');
  });

  test('TC-ERR-007 error codes stay within the agreed enum', { tag: '@P1' }, async ({ api, anon, project }) => {
    const issue = await createIssue(api, project.key);
    const responses = [
      await anon.get(`/issues/${issue.key}`),
      await api.get(`/issues/${project.key}-999999`),
      await api.post(`/issues/${issue.key}/move`, { status: 'NOPE' }),
    ];
    for (const r of responses) {
      expect(r.status()).toBeGreaterThanOrEqual(400);
      await expectResponse(r, r.status(), 'Error');
    }
  });
});

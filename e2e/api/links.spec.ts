import { test, expect, expectResponse, expectError, createIssue, createPage } from '../lib/fixtures';
import { randomUUID } from 'node:crypto';

test.describe('issue <-> page links', () => {
  test('TC-LINK-001 link issue to page returns 201 + PageSummary', { tag: '@P0' }, async ({ api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const page = await createPage(api, space.key, { title: 'Board Spec' });
    const s = await expectResponse<any>(await api.post(`/issues/${issue.key}/links`, { pageId: page.id }), 201, 'PageSummary');
    expect(s.id).toBe(page.id);
    expect(s.spaceKey).toBe(space.key);
    expect(s.title).toBe('Board Spec');
  });

  test('TC-LINK-002 issue side lists linked pages', { tag: '@P0' }, async ({ api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const p1 = await createPage(api, space.key);
    const p2 = await createPage(api, space.key);
    await expectResponse(await api.post(`/issues/${issue.key}/links`, { pageId: p1.id }), 201);
    await expectResponse(await api.post(`/issues/${issue.key}/links`, { pageId: p2.id }), 201);
    const links = await expectResponse<any[]>(await api.get(`/issues/${issue.key}/links`), 200, 'PageSummary[]');
    expect(links.map((l) => l.id).sort()).toEqual([p1.id, p2.id].sort());
  });

  test('TC-LINK-003 page side lists linked issues (reverse direction)', { tag: '@P0' }, async ({ api, project, space }) => {
    const i1 = await createIssue(api, project.key);
    const i2 = await createIssue(api, project.key);
    const page = await createPage(api, space.key);
    await expectResponse(await api.post(`/issues/${i1.key}/links`, { pageId: page.id }), 201);
    await expectResponse(await api.post(`/issues/${i2.key}/links`, { pageId: page.id }), 201);
    const issues = await expectResponse<any[]>(await api.get(`/pages/${page.id}/linked-issues`), 200, 'IssueSummary[]');
    expect(issues.map((i) => i.key).sort()).toEqual([i1.key, i2.key].sort());
  });

  test('TC-LINK-004 duplicate link returns 409', { tag: '@P1' }, async ({ api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const page = await createPage(api, space.key);
    await expectResponse(await api.post(`/issues/${issue.key}/links`, { pageId: page.id }), 201);
    await expectError(await api.post(`/issues/${issue.key}/links`, { pageId: page.id }), 409, 'ALREADY_EXISTS');
  });

  test('TC-LINK-005 unlink returns 204 and removes both directions', { tag: '@P0' }, async ({ api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const page = await createPage(api, space.key);
    await expectResponse(await api.post(`/issues/${issue.key}/links`, { pageId: page.id }), 201);
    await expectResponse(await api.delete(`/issues/${issue.key}/links/${page.id}`), 204);
    expect(await expectResponse<any[]>(await api.get(`/issues/${issue.key}/links`), 200, 'PageSummary[]')).toEqual([]);
    expect(await expectResponse<any[]>(await api.get(`/pages/${page.id}/linked-issues`), 200, 'IssueSummary[]')).toEqual([]);
  });

  test('TC-LINK-006 link to unknown page returns 404', { tag: '@P1' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    await expectError(await api.post(`/issues/${issue.key}/links`, { pageId: randomUUID() }), 404, 'NOT_FOUND');
  });

  test('TC-LINK-007 unlink non-existing link returns 404', { tag: '@P2' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    await expectError(await api.delete(`/issues/${issue.key}/links/${randomUUID()}`), 404, 'NOT_FOUND');
  });

  test('TC-LINK-008 linkedPageCount reflects number of links', { tag: '@P2' }, async ({ api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const page = await createPage(api, space.key);
    await expectResponse(await api.post(`/issues/${issue.key}/links`, { pageId: page.id }), 201);
    const got = await expectResponse<any>(await api.get(`/issues/${issue.key}`), 200, 'Issue');
    expect(got.linkedPageCount).toBe(1);
  });

  test('TC-LINK-009 deleting a page removes it from the issue links (cross-service)', { tag: '@P2' }, async ({ api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const page = await createPage(api, space.key);
    await expectResponse(await api.post(`/issues/${issue.key}/links`, { pageId: page.id }), 201);
    await expectResponse(await api.delete(`/pages/${page.id}`), 204);
    const links = await expectResponse<any[]>(await api.get(`/issues/${issue.key}/links`), 200, 'PageSummary[]');
    expect(links.map((l) => l.id)).not.toContain(page.id);
  });

  test('TC-LINK-010 deleting an issue removes it from page linked-issues', { tag: '@P2' }, async ({ api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const page = await createPage(api, space.key);
    await expectResponse(await api.post(`/issues/${issue.key}/links`, { pageId: page.id }), 201);
    await expectResponse(await api.delete(`/issues/${issue.key}`), 204);
    const issues = await expectResponse<any[]>(await api.get(`/pages/${page.id}/linked-issues`), 200, 'IssueSummary[]');
    expect(issues.map((i) => i.key)).not.toContain(issue.key);
  });
});

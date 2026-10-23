import { test, expect, expectResponse, expectError, createIssue, createPage, uniqueToken } from '../lib/fixtures';

test.describe('search', () => {
  test('TC-SEARCH-001 finds issue by title token', { tag: '@P0' }, async ({ api, project }) => {
    const token = uniqueToken();
    const issue = await createIssue(api, project.key, { title: `Kanban ${token}` });
    const r = await expectResponse<any>(await api.get('/search', { q: token }), 200, 'SearchResult');
    expect(r.issues.map((i: any) => i.key)).toContain(issue.key);
  });

  test('TC-SEARCH-002 finds page by title token', { tag: '@P0' }, async ({ api, space }) => {
    const token = uniqueToken();
    const page = await createPage(api, space.key, { title: `Spec ${token}` });
    const r = await expectResponse<any>(await api.get('/search', { q: token }), 200, 'SearchResult');
    expect(r.pages.map((p: any) => p.id)).toContain(page.id);
  });

  test('TC-SEARCH-003 one query returns both issues and pages', { tag: '@P0' }, async ({ api, project, space }) => {
    const token = uniqueToken();
    const issue = await createIssue(api, project.key, { title: `I ${token}` });
    const page = await createPage(api, space.key, { title: `P ${token}` });
    const r = await expectResponse<any>(await api.get('/search', { q: token }), 200, 'SearchResult');
    expect(r.issues.map((i: any) => i.key)).toEqual([issue.key]);
    expect(r.pages.map((p: any) => p.id)).toEqual([page.id]);
  });

  test('TC-SEARCH-004 no match returns empty arrays', { tag: '@P1' }, async ({ api }) => {
    const r = await expectResponse<any>(await api.get('/search', { q: uniqueToken() }), 200, 'SearchResult');
    expect(r).toEqual({ issues: [], pages: [] });
  });

  test('TC-SEARCH-005 missing q returns 400', { tag: '@P1' }, async ({ api }) => {
    await expectError(await api.get('/search'), 400, 'VALIDATION_FAILED');
  });

  test('TC-SEARCH-010 whitespace-only q returns 400', { tag: '@P2' }, async ({ api }) => {
    await expectError(await api.get('/search', { q: '   ' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-SEARCH-006 search by issue key', { tag: '@P2' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    const r = await expectResponse<any>(await api.get('/search', { q: issue.key }), 200, 'SearchResult');
    expect(r.issues.map((i: any) => i.key)).toContain(issue.key);
  });

  test('TC-SEARCH-007 case-insensitive + page content match', { tag: '@P2' }, async ({ api, space }) => {
    const token = uniqueToken();
    const page = await createPage(api, space.key, { title: 'plain', contentMd: `body has ${token}` });
    const r = await expectResponse<any>(await api.get('/search', { q: token.toUpperCase() }), 200, 'SearchResult');
    expect(r.pages.map((p: any) => p.id)).toContain(page.id);
  });
});

import { test, expect, expectResponse, expectError, createIssue, issueNumber, uniqueKey, uniqueToken } from '../lib/fixtures';

test.describe('issues CRUD', () => {
  test('TC-ISSUE-001 create issue returns 201, key <PROJECT>-n, default status TODO', { tag: '@P0' }, async ({ api, project, session }) => {
    const title = `Create ${uniqueToken()}`;
    const issue = await createIssue(api, project.key, { title, type: 'BUG', priority: 'HIGH', labels: ['backend'] });
    expect(issue.key).toMatch(new RegExp(`^${project.key}-\\d+$`));
    expect(issue.projectKey).toBe(project.key);
    expect(issue.title).toBe(title);
    expect(issue.type).toBe('BUG');
    expect(issue.priority).toBe('HIGH');
    expect(issue.status).toBe('TODO');
    expect(issue.labels).toEqual(['backend']);
    expect(issue.reporter.id).toBe(session.user.id);
  });

  test('TC-ISSUE-002 next issue key increments by 1', { tag: '@P0' }, async ({ api, project }) => {
    const a = await createIssue(api, project.key);
    const b = await createIssue(api, project.key);
    expect(issueNumber(b.key)).toBe(issueNumber(a.key) + 1);
    expect(a.id).not.toBe(b.id);
  });

  test('TC-ISSUE-003 get issue by key', { tag: '@P0' }, async ({ api, project }) => {
    const created = await createIssue(api, project.key, { description: 'see **spec**' });
    const got = await expectResponse<any>(await api.get(`/issues/${created.key}`), 200, 'Issue');
    expect(got.id).toBe(created.id);
    expect(got.title).toBe(created.title);
    expect(got.description).toBe('see **spec**');
  });

  test('TC-ISSUE-004 list issues returns IssueList containing created issues', { tag: '@P0' }, async ({ api, project }) => {
    const a = await createIssue(api, project.key);
    const b = await createIssue(api, project.key);
    const list = await expectResponse<any>(await api.get(`/projects/${project.key}/issues`), 200, 'IssueList');
    expect(list.items.map((i: any) => i.key)).toEqual(expect.arrayContaining([a.key, b.key]));
    expect(list.total).toBe(2);
    expect(list.page).toBe(1);
  });

  test('TC-ISSUE-005 list issues filtered by status', { tag: '@P1' }, async ({ api, project }) => {
    const todo = await createIssue(api, project.key);
    const done = await createIssue(api, project.key);
    await expectResponse(await api.post(`/issues/${done.key}/move`, { status: 'DONE', afterKey: null, beforeKey: null }), 200);
    const list = await expectResponse<any>(
      await api.get(`/projects/${project.key}/issues`, { status: 'DONE' }),
      200,
      'IssueList',
    );
    const keys = list.items.map((i: any) => i.key);
    expect(keys).toContain(done.key);
    expect(keys).not.toContain(todo.key);
    for (const i of list.items) expect(i.status).toBe('DONE');
  });

  test('TC-ISSUE-006 list issues filtered by q (title)', { tag: '@P1' }, async ({ api, project }) => {
    const token = uniqueToken();
    const hit = await createIssue(api, project.key, { title: `find ${token} me` });
    const miss = await createIssue(api, project.key);
    const list = await expectResponse<any>(await api.get(`/projects/${project.key}/issues`, { q: token }), 200, 'IssueList');
    const keys = list.items.map((i: any) => i.key);
    expect(keys).toContain(hit.key);
    expect(keys).not.toContain(miss.key);
  });

  test('TC-ISSUE-007 list issues pagination page/pageSize', { tag: '@P1' }, async ({ api, project }) => {
    for (let i = 0; i < 3; i++) await createIssue(api, project.key);
    const p1 = await expectResponse<any>(await api.get(`/projects/${project.key}/issues`, { page: 1, pageSize: 2 }), 200, 'IssueList');
    const p2 = await expectResponse<any>(await api.get(`/projects/${project.key}/issues`, { page: 2, pageSize: 2 }), 200, 'IssueList');
    expect(p1.items).toHaveLength(2);
    expect(p2.items).toHaveLength(1);
    expect(p1.total).toBe(3);
    expect(p1.pageSize).toBe(2);
    const all = [...p1.items, ...p2.items].map((i: any) => i.key);
    expect(new Set(all).size).toBe(3);
  });

  test('TC-ISSUE-008 patch updates only sent fields', { tag: '@P0' }, async ({ api, project }) => {
    const created = await createIssue(api, project.key, { type: 'STORY', labels: ['keep'] });
    const newTitle = `Patched ${uniqueToken()}`;
    const patched = await expectResponse<any>(await api.patch(`/issues/${created.key}`, { title: newTitle }), 200, 'Issue');
    expect(patched.title).toBe(newTitle);
    expect(patched.type).toBe('STORY');
    expect(patched.labels).toEqual(['keep']);
    expect(patched.key).toBe(created.key);
    expect(Date.parse(patched.updatedAt)).toBeGreaterThanOrEqual(Date.parse(created.updatedAt));
    const got = await expectResponse<any>(await api.get(`/issues/${created.key}`), 200, 'Issue');
    expect(got.title).toBe(newTitle);
  });

  test('TC-ISSUE-009 patch assignee, priority, labels; assigneeId null clears', { tag: '@P1' }, async ({ api, project, session }) => {
    const created = await createIssue(api, project.key);
    const a = await expectResponse<any>(
      await api.patch(`/issues/${created.key}`, { assigneeId: session.user.id, priority: 'HIGHEST', labels: ['a', 'b'] }),
      200,
      'Issue',
    );
    expect(a.assignee?.id).toBe(session.user.id);
    expect(a.priority).toBe('HIGHEST');
    expect(a.labels).toEqual(['a', 'b']);
    const b = await expectResponse<any>(await api.patch(`/issues/${created.key}`, { assigneeId: null }), 200, 'Issue');
    expect(b.assignee ?? null).toBeNull();
  });

  test('TC-ISSUE-010 delete issue returns 204, then GET returns 404', { tag: '@P0' }, async ({ api, project }) => {
    const created = await createIssue(api, project.key);
    await expectResponse(await api.delete(`/issues/${created.key}`), 204);
    await expectError(await api.get(`/issues/${created.key}`), 404, 'NOT_FOUND');
  });

  test('TC-ISSUE-011 create without title returns 400 VALIDATION_FAILED', { tag: '@P1' }, async ({ api, project }) => {
    await expectError(await api.post(`/projects/${project.key}/issues`, { type: 'TASK' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-ISSUE-012 create with invalid type returns 400', { tag: '@P1' }, async ({ api, project }) => {
    await expectError(
      await api.post(`/projects/${project.key}/issues`, { title: 'x', type: 'EPIC' }),
      400,
      'VALIDATION_FAILED',
    );
  });

  test('TC-ISSUE-013 get unknown issue returns 404', { tag: '@P1' }, async ({ api, project }) => {
    await expectError(await api.get(`/issues/${project.key}-999999`), 404, 'NOT_FOUND');
  });

  test('TC-ISSUE-014 patch with empty body returns 400 (minProperties: 1)', { tag: '@P2' }, async ({ api, project }) => {
    const created = await createIssue(api, project.key);
    await expectError(await api.patch(`/issues/${created.key}`, {}), 400, 'VALIDATION_FAILED');
  });

  test('TC-ISSUE-015 create issue in unknown project returns 404', { tag: '@P2' }, async ({ api }) => {
    await expectError(
      await api.post(`/projects/${uniqueKey('Z')}/issues`, { title: 'x', type: 'TASK' }),
      404,
      'NOT_FOUND',
    );
  });

  test('TC-ISSUE-016 issue keys are independent per project', { tag: '@P2' }, async ({ api, project }) => {
    const other = await expectResponse<any>(await api.post('/projects', { key: uniqueKey('O'), name: 'other' }), 201, 'Project');
    const a = await createIssue(api, project.key);
    const b = await createIssue(api, other.key);
    expect(issueNumber(a.key)).toBe(1);
    expect(issueNumber(b.key)).toBe(1);
  });

  test('TC-ISSUE-018 whitespace-only title returns 400 on create and patch', { tag: '@P1' }, async ({ api, project }) => {
    await expectError(await api.post(`/projects/${project.key}/issues`, { title: '   ', type: 'TASK' }), 400, 'VALIDATION_FAILED');
    const created = await createIssue(api, project.key);
    await expectError(await api.patch(`/issues/${created.key}`, { title: '\t ' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-ISSUE-019 title is stored without leading / trailing spaces', { tag: '@P2' }, async ({ api, project }) => {
    const token = uniqueToken();
    const issue = await createIssue(api, project.key, { title: `  ${token}  ` });
    expect(issue.title).toBe(token);
    const patched = await expectResponse<any>(await api.patch(`/issues/${issue.key}`, { title: ` ${token}-2 ` }), 200, 'Issue');
    expect(patched.title).toBe(`${token}-2`);
  });

  test('TC-ISSUE-020 list is ordered by column, then position ascending', { tag: '@P1' }, async ({ api, project }) => {
    const [a, b, c] = [await createIssue(api, project.key), await createIssue(api, project.key), await createIssue(api, project.key)];
    // DONE: [b]; TODO: [c, a] (c moved to the top)
    await api.post(`/issues/${b.key}/move`, { status: 'DONE' });
    await api.post(`/issues/${c.key}/move`, { status: 'TODO', afterKey: null, beforeKey: a.key });
    const list = await expectResponse<any>(await api.get(`/projects/${project.key}/issues`), 200, 'IssueList');
    expect(list.items.map((i: any) => i.key)).toEqual([c.key, a.key, b.key]);
  });
});

import { test, expect, expectResponse, expectError, createIssue, newSession } from '../lib/fixtures';

test.describe('comments', () => {
  test('TC-COMMENT-001 add comment returns 201 + Comment', { tag: '@P0' }, async ({ api, project, session }) => {
    const issue = await createIssue(api, project.key);
    const c = await expectResponse<any>(
      await api.post(`/issues/${issue.key}/comments`, { body: 'เริ่มทำแล้ว ใช้ **dnd-kit**' }),
      201,
      'Comment',
    );
    expect(c.issueKey).toBe(issue.key);
    expect(c.body).toBe('เริ่มทำแล้ว ใช้ **dnd-kit**');
    expect(c.author.id).toBe(session.user.id);
  });

  test('TC-COMMENT-002 list comments oldest -> newest', { tag: '@P0' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    const bodies = ['first', 'second', 'third'];
    for (const body of bodies) await expectResponse(await api.post(`/issues/${issue.key}/comments`, { body }), 201);
    const list = await expectResponse<any[]>(await api.get(`/issues/${issue.key}/comments`), 200, 'Comment[]');
    expect(list.map((c) => c.body)).toEqual(bodies);
    for (let i = 1; i < list.length; i++) {
      expect(Date.parse(list[i].createdAt)).toBeGreaterThanOrEqual(Date.parse(list[i - 1].createdAt));
    }
  });

  test('TC-COMMENT-003 comments are scoped to their issue', { tag: '@P1' }, async ({ api, project }) => {
    const a = await createIssue(api, project.key);
    const b = await createIssue(api, project.key);
    await expectResponse(await api.post(`/issues/${a.key}/comments`, { body: 'only on a' }), 201);
    const listB = await expectResponse<any[]>(await api.get(`/issues/${b.key}/comments`), 200, 'Comment[]');
    expect(listB).toEqual([]);
  });

  test('TC-COMMENT-004 empty body returns 400', { tag: '@P1' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    await expectError(await api.post(`/issues/${issue.key}/comments`, { body: '' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-COMMENT-005 body over 5000 chars returns 400', { tag: '@P2' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    await expectError(await api.post(`/issues/${issue.key}/comments`, { body: 'x'.repeat(5001) }), 400, 'VALIDATION_FAILED');
  });

  test('TC-COMMENT-006 comment on unknown issue returns 404', { tag: '@P2' }, async ({ api, project }) => {
    await expectError(await api.post(`/issues/${project.key}-999999/comments`, { body: 'x' }), 404, 'NOT_FOUND');
  });

  test('TC-COMMENT-007 whitespace-only body returns 400', { tag: '@P2' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    await expectError(await api.post(`/issues/${issue.key}/comments`, { body: ' \n\t ' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-COMMENT-008 edit own comment trims the body and sets editedAt', { tag: '@P0' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    const created = await expectResponse<any>(await api.post(`/issues/${issue.key}/comments`, { body: 'draft' }), 201, 'Comment');
    expect(created.editedAt).toBeNull();
    const url = `/issues/${issue.key}/comments/${created.id}`;
    const edited = await expectResponse<any>(await api.patch(url, { body: ' final ' }), 200, 'Comment');
    expect(edited.body).toBe('final');
    expect(edited.editedAt).toBeTruthy();
    expect(edited.createdAt).toBe(created.createdAt);
    const list = await expectResponse<any[]>(await api.get(`/issues/${issue.key}/comments`), 200, 'Comment[]');
    expect(list.map((c) => c.body)).toEqual(['final']);
  });

  test('TC-COMMENT-009 delete own comment', { tag: '@P0' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    const created = await expectResponse<any>(await api.post(`/issues/${issue.key}/comments`, { body: 'x' }), 201, 'Comment');
    const url = `/issues/${issue.key}/comments/${created.id}`;
    expect((await api.delete(url)).status()).toBe(204);
    await expectError(await api.delete(url), 404, 'NOT_FOUND');
    expect(await expectResponse<any[]>(await api.get(`/issues/${issue.key}/comments`), 200, 'Comment[]')).toEqual([]);
  });

  test("TC-COMMENT-010 someone else's comment cannot be edited or deleted", { tag: '@P0' }, async ({ api, anon, project }) => {
    const issue = await createIssue(api, project.key);
    const created = await expectResponse<any>(await api.post(`/issues/${issue.key}/comments`, { body: 'mine' }), 201, 'Comment');
    const url = `/issues/${issue.key}/comments/${created.id}`;
    const other = await newSession(anon);
    const otherApi = anon.withToken(other.token);
    await expectError(await otherApi.patch(url, { body: 'hacked' }), 403, 'PERMISSION_DENIED');
    await expectError(await otherApi.delete(url), 403, 'PERMISSION_DENIED');
    const list = await expectResponse<any[]>(await api.get(`/issues/${issue.key}/comments`), 200, 'Comment[]');
    expect(list.map((c) => c.body)).toEqual(['mine']);
  });

  test('TC-COMMENT-011 edit validates the body and where the comment lives', { tag: '@P1' }, async ({ api, project }) => {
    const a = await createIssue(api, project.key);
    const b = await createIssue(api, project.key);
    const created = await expectResponse<any>(await api.post(`/issues/${a.key}/comments`, { body: 'x' }), 201, 'Comment');
    const url = `/issues/${a.key}/comments/${created.id}`;
    await expectError(await api.patch(url, { body: ' ' }), 400, 'VALIDATION_FAILED');
    await expectError(await api.patch(url, { body: 'x'.repeat(5001) }), 400, 'VALIDATION_FAILED');
    await expectError(await api.patch(`/issues/${a.key}/comments/not-a-uuid`, { body: 'y' }), 400, 'VALIDATION_FAILED');
    await expectError(await api.patch(`/issues/${b.key}/comments/${created.id}`, { body: 'y' }), 404, 'NOT_FOUND');
  });
});

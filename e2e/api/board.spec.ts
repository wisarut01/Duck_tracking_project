import { test, expect, expectResponse, expectError, createIssue, type ApiClient } from '../lib/fixtures';

async function move(api: ApiClient, key: string, status: string, afterKey: string | null = null, beforeKey: string | null = null) {
  return expectResponse<any>(await api.post(`/issues/${key}/move`, { status, afterKey, beforeKey }), 200, 'Issue');
}

/** Column order top → bottom. The spec says listIssues is sorted by position asc inside a column. */
async function column(api: ApiClient, projectKey: string, status: string): Promise<string[]> {
  const list = await expectResponse<any>(
    await api.get(`/projects/${projectKey}/issues`, { status, pageSize: 200 }),
    200,
    'IssueList',
  );
  return list.items.map((i: any) => i.key);
}

/** Put a, b (in that order) into `status` column. */
async function seedColumn(api: ApiClient, projectKey: string, status: string, n: number) {
  const issues = [];
  for (let i = 0; i < n; i++) issues.push(await createIssue(api, projectKey));
  let prev: string | null = null;
  for (const it of issues) {
    await move(api, it.key, status, prev, null);
    prev = it.key;
  }
  return issues.map((i) => i.key);
}

test.describe('board move', () => {
  test('TC-BOARD-001 move changes status and is persisted', { tag: '@P0' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    const moved = await move(api, issue.key, 'IN_PROGRESS');
    expect(moved.status).toBe('IN_PROGRESS');
    const got = await expectResponse<any>(await api.get(`/issues/${issue.key}`), 200, 'Issue');
    expect(got.status).toBe('IN_PROGRESS');
  });

  test('TC-BOARD-002 move between afterKey and beforeKey puts position strictly between', { tag: '@P0' }, async ({ api, project }) => {
    const [a, b] = await seedColumn(api, project.key, 'IN_REVIEW', 2);
    const c = await createIssue(api, project.key);
    const moved = await move(api, c.key, 'IN_REVIEW', a, b);
    const pa = (await expectResponse<any>(await api.get(`/issues/${a}`), 200, 'Issue')).position;
    const pb = (await expectResponse<any>(await api.get(`/issues/${b}`), 200, 'Issue')).position;
    expect(moved.status).toBe('IN_REVIEW');
    expect(moved.position).toBeGreaterThan(pa);
    expect(moved.position).toBeLessThan(pb);
    expect(await column(api, project.key, 'IN_REVIEW')).toEqual([a, c.key, b]);
  });

  test('TC-BOARD-003 move to top (afterKey null, beforeKey = first)', { tag: '@P0' }, async ({ api, project }) => {
    const [a, b] = await seedColumn(api, project.key, 'IN_PROGRESS', 2);
    const c = await createIssue(api, project.key);
    await move(api, c.key, 'IN_PROGRESS', null, a);
    expect(await column(api, project.key, 'IN_PROGRESS')).toEqual([c.key, a, b]);
  });

  test('TC-BOARD-004 move to bottom (afterKey = last, beforeKey null)', { tag: '@P1' }, async ({ api, project }) => {
    const [a, b] = await seedColumn(api, project.key, 'DONE', 2);
    const c = await createIssue(api, project.key);
    await move(api, c.key, 'DONE', b, null);
    expect(await column(api, project.key, 'DONE')).toEqual([a, b, c.key]);
  });

  test('TC-BOARD-005 reorder within same column', { tag: '@P1' }, async ({ api, project }) => {
    const [a, b, c] = await seedColumn(api, project.key, 'IN_PROGRESS', 3);
    await move(api, c, 'IN_PROGRESS', null, a); // drag last card to top
    expect(await column(api, project.key, 'IN_PROGRESS')).toEqual([c, a, b]);
    await move(api, c, 'IN_PROGRESS', a, b); // and back into the middle
    expect(await column(api, project.key, 'IN_PROGRESS')).toEqual([a, c, b]);
  });

  test('TC-BOARD-006 move with invalid status returns 400', { tag: '@P1' }, async ({ api, project }) => {
    const issue = await createIssue(api, project.key);
    await expectError(await api.post(`/issues/${issue.key}/move`, { status: 'BLOCKED' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-BOARD-007 move unknown issue returns 404', { tag: '@P1' }, async ({ api, project }) => {
    await expectError(await api.post(`/issues/${project.key}-999999/move`, { status: 'DONE' }), 404, 'NOT_FOUND');
  });

  test('TC-BOARD-008 afterKey that is not in target column is rejected (400/404)', { tag: '@P2' }, async ({ api, project }) => {
    const other = await createIssue(api, project.key); // stays in TODO
    const issue = await createIssue(api, project.key);
    const res = await api.post(`/issues/${issue.key}/move`, { status: 'DONE', afterKey: other.key, beforeKey: null });
    expect([400, 404], `status ${res.status()}`).toContain(res.status());
    const errBody: unknown = await res.json();
    expect(errBody).toMatchSchema('Error');
  });

  test('TC-BOARD-009 repeated inserts into the same gap keep strict order (no position collision)', { tag: '@P2' }, async ({ api, project }) => {
    const [a, b] = await seedColumn(api, project.key, 'IN_REVIEW', 2);
    let before = b;
    const inserted: string[] = [];
    for (let i = 0; i < 25; i++) {
      const x = await createIssue(api, project.key);
      await move(api, x.key, 'IN_REVIEW', a, before); // always right after a -> halves the gap each time
      inserted.unshift(x.key);
      before = x.key;
    }
    expect(await column(api, project.key, 'IN_REVIEW')).toEqual([a, ...inserted, b]);
  });
});

import { test, expect, expectResponse, expectError, createProject, createIssue, uniqueKey } from '../lib/fixtures';

test.describe('projects', () => {
  test('TC-PROJ-001 create project returns 201 + Project', { tag: '@P0' }, async ({ api, session }) => {
    const key = uniqueKey('P');
    const p = await expectResponse<any>(
      await api.post('/projects', { key, name: 'QA Create', description: 'desc' }),
      201,
      'Project',
    );
    expect(p.key).toBe(key);
    expect(p.name).toBe('QA Create');
    expect(p.leadId).toBe(session.user.id);
  });

  test('TC-PROJ-002 get project by key', { tag: '@P0' }, async ({ api, project }) => {
    const p = await expectResponse<any>(await api.get(`/projects/${project.key}`), 200, 'Project');
    expect(p.id).toBe(project.id);
    expect(p.key).toBe(project.key);
  });

  test('TC-PROJ-003 list projects contains created project', { tag: '@P1' }, async ({ api, project }) => {
    const list = await expectResponse<any[]>(await api.get('/projects'), 200, 'Project[]');
    expect(list.map((p) => p.key)).toContain(project.key);
  });

  test('TC-PROJ-004 duplicate project key returns 409', { tag: '@P1' }, async ({ api, project }) => {
    await expectError(await api.post('/projects', { key: project.key, name: 'dup' }), 409, 'ALREADY_EXISTS');
  });

  test('TC-PROJ-005 invalid project key returns 400', { tag: '@P1' }, async ({ api }) => {
    await expectError(await api.post('/projects', { key: 'bad-key', name: 'x' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-PROJ-006 unknown project returns 404', { tag: '@P1' }, async ({ api }) => {
    await expectError(await api.get(`/projects/${uniqueKey('Z')}`), 404, 'NOT_FOUND');
  });

  test('TC-PROJ-007 issueCount reflects created issues', { tag: '@P2' }, async ({ api }) => {
    const p = await createProject(api);
    await createIssue(api, p.key);
    await createIssue(api, p.key);
    const got = await expectResponse<any>(await api.get(`/projects/${p.key}`), 200, 'Project');
    expect(got.issueCount).toBe(2);
  });
});

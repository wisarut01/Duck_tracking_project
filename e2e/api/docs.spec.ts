import { test, expect, expectResponse, expectError, createPage, uniqueKey, uniqueToken, type ApiClient } from '../lib/fixtures';
import { randomUUID } from 'node:crypto';

async function tree(api: ApiClient, spaceKey: string): Promise<any[]> {
  return expectResponse<any[]>(await api.get(`/spaces/${spaceKey}/pages`), 200, 'PageTreeNode[]');
}
function findNode(nodes: any[], id: string): any | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children ?? [], id);
    if (hit) return hit;
  }
}

test.describe('docs: spaces', () => {
  test('TC-SPACE-001 create space returns 201 + Space', { tag: '@P0' }, async ({ api }) => {
    const key = uniqueKey('S');
    const s = await expectResponse<any>(await api.post('/spaces', { key, name: 'Engineering QA', description: null }), 201, 'Space');
    expect(s.key).toBe(key);
    expect(s.name).toBe('Engineering QA');
  });

  test('TC-SPACE-002 get space by key', { tag: '@P0' }, async ({ api, space }) => {
    const s = await expectResponse<any>(await api.get(`/spaces/${space.key}`), 200, 'Space');
    expect(s.id).toBe(space.id);
  });

  test('TC-SPACE-003 list spaces contains created space', { tag: '@P1' }, async ({ api, space }) => {
    const list = await expectResponse<any[]>(await api.get('/spaces'), 200, 'Space[]');
    expect(list.map((s) => s.key)).toContain(space.key);
  });

  test('TC-SPACE-004 duplicate space key returns 409', { tag: '@P1' }, async ({ api, space }) => {
    await expectError(await api.post('/spaces', { key: space.key, name: 'dup' }), 409, 'ALREADY_EXISTS');
  });

  test('TC-SPACE-005 unknown space returns 404', { tag: '@P1' }, async ({ api }) => {
    await expectError(await api.get(`/spaces/${uniqueKey('Z')}`), 404, 'NOT_FOUND');
  });

  test('TC-SPACE-006 new space has empty page tree', { tag: '@P2' }, async ({ api, space }) => {
    expect(await tree(api, space.key)).toEqual([]);
  });
});

test.describe('docs: page tree', () => {
  test('TC-PAGE-001 create root page (parentId null)', { tag: '@P0' }, async ({ api, space, session }) => {
    const p = await createPage(api, space.key, { title: 'Root', contentMd: '# Root' });
    expect(p.spaceKey).toBe(space.key);
    expect(p.parentId).toBeNull();
    expect(p.title).toBe('Root');
    expect(p.author.id).toBe(session.user.id);
  });

  test('TC-PAGE-002 page tree nests root -> child -> grandchild', { tag: '@P0' }, async ({ api, space }) => {
    const root = await createPage(api, space.key, { title: 'Root' });
    const child = await createPage(api, space.key, { title: 'Child', parentId: root.id });
    const grand = await createPage(api, space.key, { title: 'Grandchild', parentId: child.id });
    const sibling = await createPage(api, space.key, { title: 'Root 2' });
    expect(child.parentId).toBe(root.id);

    const t = await tree(api, space.key);
    expect(t.map((n) => n.id).sort()).toEqual([root.id, sibling.id].sort()); // only roots at top level
    const r = t.find((n) => n.id === root.id);
    expect(r.children.map((n: any) => n.id)).toEqual([child.id]);
    expect(r.children[0].children.map((n: any) => n.id)).toEqual([grand.id]);
    expect(r.children[0].children[0].children).toEqual([]);
    expect(t.find((n) => n.id === sibling.id).children).toEqual([]);
  });

  test('TC-PAGE-003 get page returns full Markdown content', { tag: '@P0' }, async ({ api, space }) => {
    const md = '# Board Spec\n\n- TODO / IN_PROGRESS\n\n```ts\nconst x = 1;\n```\n';
    const p = await createPage(api, space.key, { contentMd: md });
    const got = await expectResponse<any>(await api.get(`/pages/${p.id}`), 200, 'Page');
    expect(got.contentMd).toBe(md);
  });

  test('TC-PAGE-004 patch title/content updates page', { tag: '@P1' }, async ({ api, space }) => {
    const p = await createPage(api, space.key);
    const title = `Renamed ${uniqueToken()}`;
    const u = await expectResponse<any>(await api.patch(`/pages/${p.id}`, { title, contentMd: 'new' }), 200, 'Page');
    expect(u.title).toBe(title);
    expect(u.contentMd).toBe('new');
    expect(Date.parse(u.updatedAt)).toBeGreaterThanOrEqual(Date.parse(p.updatedAt));
  });

  test('TC-PAGE-005 patch parentId moves subtree', { tag: '@P1' }, async ({ api, space }) => {
    const a = await createPage(api, space.key, { title: 'A' });
    const b = await createPage(api, space.key, { title: 'B' });
    const child = await createPage(api, space.key, { title: 'child', parentId: a.id });
    await expectResponse(await api.patch(`/pages/${child.id}`, { parentId: b.id }), 200, 'Page');
    const t = await tree(api, space.key);
    expect(findNode(t, a.id).children).toEqual([]);
    expect(findNode(t, b.id).children.map((n: any) => n.id)).toEqual([child.id]);
    // and back to root
    await expectResponse(await api.patch(`/pages/${child.id}`, { parentId: null }), 200, 'Page');
    expect((await tree(api, space.key)).map((n) => n.id)).toContain(child.id);
  });

  test('TC-PAGE-006 delete page cascades to children', { tag: '@P1' }, async ({ api, space }) => {
    const root = await createPage(api, space.key);
    const child = await createPage(api, space.key, { parentId: root.id });
    await expectResponse(await api.delete(`/pages/${root.id}`), 204);
    await expectError(await api.get(`/pages/${root.id}`), 404, 'NOT_FOUND');
    await expectError(await api.get(`/pages/${child.id}`), 404, 'NOT_FOUND');
    expect(findNode(await tree(api, space.key), child.id)).toBeUndefined();
  });

  test('TC-PAGE-007 create page without title returns 400', { tag: '@P1' }, async ({ api, space }) => {
    await expectError(await api.post(`/spaces/${space.key}/pages`, { contentMd: 'x' }), 400, 'VALIDATION_FAILED');
  });

  test('TC-PAGE-008 unknown page returns 404', { tag: '@P1' }, async ({ api }) => {
    await expectError(await api.get(`/pages/${randomUUID()}`), 404, 'NOT_FOUND');
  });

  test('TC-PAGE-009 moving a page under its own descendant is rejected (400)', { tag: '@P2' }, async ({ api, space }) => {
    const root = await createPage(api, space.key);
    const child = await createPage(api, space.key, { parentId: root.id });
    await expectError(await api.patch(`/pages/${root.id}`, { parentId: child.id }), 400, 'VALIDATION_FAILED');
  });
});

test.describe('mention TB-12 (API side)', () => {
  test('TC-MENTION-001 issue keys in contentMd are stored verbatim (FE renders the link)', { tag: '@P0' }, async ({ api, space, project }) => {
    const md = `งานหลักอยู่ที่ ${project.key}-12 และ ${project.key}-3, \`${project.key}-4\` ใน code`;
    const p = await createPage(api, space.key, { contentMd: md });
    const got = await expectResponse<any>(await api.get(`/pages/${p.id}`), 200, 'Page');
    expect(got.contentMd).toBe(md);
  });
});

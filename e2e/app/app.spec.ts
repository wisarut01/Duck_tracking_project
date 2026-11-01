/**
 * E2E: the real web app (Vite, WEB_URL) talking to the API (API_BASE_URL).
 * Each test registers its own user and creates its own project / space through the API,
 * then drives the UI. The web app must be configured to call the same API_BASE_URL.
 */
import type { Page } from '@playwright/test';
import { test, expect, expectResponse, createIssue, createPage, newSession, uniqueToken } from '../lib/fixtures';

const WEB_URL = (process.env.WEB_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const TOKEN_KEY = 'tb-access-token'; // web/src/api/token.ts

/** Start the browser already logged in as `token`. */
async function loginWithToken(page: Page, token: string) {
  await page.goto(`${WEB_URL}/login`);
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [TOKEN_KEY, token] as const);
}

/** Drag with small mouse steps — dnd-kit needs real pointer movement (5px activation distance). */
async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(from.x + ((to.x - from.x) * i) / 20, from.y + ((to.y - from.y) * i) / 20);
  await page.mouse.up();
}

test.describe('web app (E2E)', () => {
  test('TC-AUTH-010 login form → board, wrong password shows an error', { tag: '@P0' }, async ({ page, session }) => {
    await page.goto(`${WEB_URL}/`);
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('อีเมล').fill(session.email);
    await page.getByLabel('รหัสผ่าน').fill('wrong-password');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page.getByRole('alert')).toContainText('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    await page.getByLabel('รหัสผ่าน').fill(session.password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page).not.toHaveURL(/\/login/);
    expect(await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY)).toBeTruthy();
  });

  test('TC-ERR-008 invalid token → /login?next=…, then back to the same page', { tag: '@P0' }, async ({ page, session, project }) => {
    await loginWithToken(page, 'not.a.valid.token');
    await page.goto(`${WEB_URL}/projects/${project.key}/board`);
    await expect(page).toHaveURL(/\/login\?next=/);

    await page.getByLabel('อีเมล').fill(session.email);
    await page.getByLabel('รหัสผ่าน').fill(session.password);
    await page.getByRole('button', { name: 'เข้าสู่ระบบ' }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.key}/board`));
    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
  });

  test('TC-BOARD-010 drag a card to another column, it stays there after reload', { tag: '@P0' }, async ({ page, session, api, project }) => {
    const issue = await createIssue(api, project.key);
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/projects/${project.key}/board`);

    const card = page.getByText(issue.key, { exact: true });
    const from = (await card.boundingBox())!;
    const done = (await page.getByText('Done', { exact: true }).boundingBox())!;
    await drag(page, { x: from.x + 40, y: from.y + 10 }, { x: done.x + 60, y: done.y + 120 });

    await expect
      .poll(async () => (await expectResponse<any>(await api.get(`/issues/${issue.key}`), 200, 'Issue')).status)
      .toBe('DONE');
    await page.reload();
    const doneColumn = page.getByRole('region', { name: /Done/ }).or(page.locator('section', { hasText: 'Done' })).first();
    await expect(doneColumn.getByText(issue.key, { exact: true })).toBeVisible();
  });

  test('TC-ISSUE-021 create issue from the modal and comment on it', { tag: '@P1' }, async ({ page, session, project }) => {
    const title = `UI issue ${uniqueToken()}`;
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/projects/${project.key}/board`);

    await page.getByRole('button', { name: 'Create' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/หัวข้อ|Title|ชื่อ/).first().fill(title);
    await dialog.getByRole('button', { name: /สร้าง|Create/ }).last().click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: new RegExp(title) }).click(); // the card (the toast has the title too)
    await expect(page).toHaveURL(/\?issue=/);
    await page.getByLabel('เขียน comment').fill('comment จาก E2E');
    await page.getByRole('button', { name: 'ส่ง' }).click();
    await expect(page.getByText('comment จาก E2E')).toBeVisible();
  });

  test('TC-MENTION-007 doc page renders TB-n as a chip that opens the issue', { tag: '@P1' }, async ({ page, session, api, project, space }) => {
    const issue = await createIssue(api, project.key, { title: `Mentioned ${uniqueToken()}` });
    const doc = await createPage(api, space.key, { title: 'Spec', contentMd: `งานหลักอยู่ที่ ${issue.key}` });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}`);
    await expect(page).toHaveURL(new RegExp(`/pages/${doc.id}`));

    await page.getByRole('link', { name: new RegExp(issue.key) }).click();
    await expect(page).toHaveURL(new RegExp(`/issues/${issue.key}`));
    await expect(page.getByText(issue.title).first()).toBeVisible();
  });

  test('TC-DOCS-020 the editor saves by itself, no save button needed', { tag: '@P0' }, async ({ page, session, api, space }) => {
    const doc = await createPage(api, space.key, { title: 'Spec', contentMd: 'เดิม' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${doc.id}`);

    await page.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    await page.getByLabel('ชื่อหน้า').fill('Spec ใหม่');
    await page.getByLabel('เนื้อหา Markdown').fill('เนื้อหาใหม่');
    await expect(page.getByText('บันทึกอัตโนมัติแล้ว')).toBeVisible();
    const saved = await expectResponse<any>(await api.get(`/pages/${doc.id}`), 200, 'Page');
    expect([saved.title, saved.contentMd]).toEqual(['Spec ใหม่', 'เนื้อหาใหม่']);

    await page.getByRole('button', { name: 'เสร็จสิ้น' }).click();
    await expect(page.getByText('เนื้อหาใหม่')).toBeVisible();
    await expect(page.getByLabel('เนื้อหา Markdown')).toBeHidden();
  });

  test('TC-DOCS-021 switching page right after typing saves to the page you were on', { tag: '@P0' }, async ({ page, session, api, space }) => {
    const first = await createPage(api, space.key, { title: 'First', contentMd: 'one' });
    const second = await createPage(api, space.key, { title: 'Second', contentMd: 'two' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${first.id}`);

    await page.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    await page.getByLabel('เนื้อหา Markdown').fill('one edited');
    await page.getByRole('complementary', { name: 'Page tree' }).getByRole('button', { name: 'Second', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(second.id));

    await expect
      .poll(async () => (await expectResponse<any>(await api.get(`/pages/${first.id}`), 200, 'Page')).contentMd)
      .toBe('one edited');
    expect((await expectResponse<any>(await api.get(`/pages/${second.id}`), 200, 'Page')).contentMd).toBe('two');
  });

  test('TC-DOCS-022 going to another tab saves right away', { tag: '@P0' }, async ({ page, session, api, space }) => {
    const doc = await createPage(api, space.key, { title: 'Spec', contentMd: 'เดิม' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${doc.id}`);

    await page.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    const saving = page.waitForRequest((request) => request.method() === 'PATCH');
    const started = Date.now();
    await page.getByLabel('เนื้อหา Markdown').fill('สลับ tab');
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await saving;
    expect(Date.now() - started).toBeLessThan(900); // ไม่ได้รอ debounce 1 วินาที
    await expect
      .poll(async () => (await expectResponse<any>(await api.get(`/pages/${doc.id}`), 200, 'Page')).contentMd)
      .toBe('สลับ tab');
  });

  test('TC-DOCS-023 a failed reload on returning to the tab does not close the editor', { tag: '@P0' }, async ({ page, session, api, space }) => {
    const doc = await createPage(api, space.key, { title: 'Spec', contentMd: 'เดิม' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${doc.id}`);
    await page.getByRole('button', { name: 'แก้ไข', exact: true }).click();
    await page.getByLabel('เนื้อหา Markdown').fill('ยังอยู่ไหม');
    await expect(page.getByText('บันทึกอัตโนมัติแล้ว')).toBeVisible();

    // server หลับ: ทุก GET ล้มเหลว (เหมือน Render ที่ยังไม่ตื่น)
    let failed = 0;
    await page.route(/\/api\/v1\//, (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      failed++;
      return route.abort();
    });
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(() => failed, { timeout: 15_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(6_000); // รอ react-query ลองใหม่จนยอมแพ้ (2 ครั้ง)
    await expect(page.getByLabel('เนื้อหา Markdown')).toHaveValue('ยังอยู่ไหม');
  });

  test('TC-DOCS-024 text that could not be saved comes back after a reload', { tag: '@P0' }, async ({ page, session, api, space }) => {
    const doc = await createPage(api, space.key, { title: 'Spec', contentMd: 'เดิม' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${doc.id}`);
    await page.getByRole('button', { name: 'แก้ไข', exact: true }).click();

    await page.route(/\/pages\//, (route) => (route.request().method() === 'PATCH' ? route.abort() : route.continue()));
    await page.getByLabel('เนื้อหา Markdown').fill('ข้อความที่บันทึกไม่ได้');
    await expect(page.getByText(/บันทึกไม่สำเร็จ/)).toBeVisible();
    expect((await expectResponse<any>(await api.get(`/pages/${doc.id}`), 200, 'Page')).contentMd).toBe('เดิม');

    await page.unroute(/\/pages\//);
    await page.reload();
    // เปิด editor ให้เองพร้อมข้อความเดิม แล้วบันทึกต่อ
    await expect(page.getByLabel('เนื้อหา Markdown')).toHaveValue('ข้อความที่บันทึกไม่ได้');
    await expect
      .poll(async () => (await expectResponse<any>(await api.get(`/pages/${doc.id}`), 200, 'Page')).contentMd)
      .toBe('ข้อความที่บันทึกไม่ได้');
  });

  test('TC-DOCS-025 an old draft never overwrites a newer page without asking', { tag: '@P1' }, async ({ page, session, api, space }) => {
    const doc = await createPage(api, space.key, { title: 'Spec', contentMd: 'ของใหม่จากเครื่องอื่น' });
    await loginWithToken(page, session.token);
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [`tb-page-draft:${doc.id}`, JSON.stringify({ title: 'Spec', contentMd: 'ฉบับร่างเก่า', baseUpdatedAt: '2020-01-01T00:00:00.000Z' })] as const,
    );
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${doc.id}`);

    await expect(page.getByRole('alert').filter({ hasText: 'มีฉบับร่าง' })).toBeVisible();
    await expect(page.getByLabel('เนื้อหา Markdown')).toHaveValue('ของใหม่จากเครื่องอื่น');
    await page.waitForTimeout(1_500);
    expect((await expectResponse<any>(await api.get(`/pages/${doc.id}`), 200, 'Page')).contentMd).toBe('ของใหม่จากเครื่องอื่น');

    await page.getByRole('button', { name: 'ใช้ฉบับร่าง' }).click();
    await expect(page.getByLabel('เนื้อหา Markdown')).toHaveValue('ฉบับร่างเก่า');
    await expect
      .poll(async () => (await expectResponse<any>(await api.get(`/pages/${doc.id}`), 200, 'Page')).contentMd)
      .toBe('ฉบับร่างเก่า');
  });

  test('TC-DOCS-026 rename a space and a page, delete a page with its children', { tag: '@P0' }, async ({ page, session, api, space }) => {
    const root = await createPage(api, space.key, { title: 'Root' });
    await createPage(api, space.key, { title: 'Child', parentId: root.id });
    const other = await createPage(api, space.key, { title: 'Other' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${root.id}`);
    const tree = page.getByRole('complementary', { name: 'Page tree' });

    await tree.getByRole('button', { name: `แก้ไข ${space.name}` }).click();
    await page.getByRole('dialog').getByLabel('ชื่อ space').fill('Space ใหม่');
    await page.getByRole('dialog').getByRole('button', { name: 'บันทึก' }).click();
    // ระบุ key ด้วย เพราะ DB ที่ใช้ซ้ำอาจมี space ชื่อนี้จากการรันครั้งก่อน
    await expect(page.getByRole('navigation', { name: 'เมนูหลัก' }).getByRole('link', { name: `Space ใหม่ ${space.key}` })).toBeVisible();

    await page.getByRole('button', { name: 'เปลี่ยนชื่อ', exact: true }).click();
    await page.getByRole('dialog').getByLabel('ชื่อหน้า').fill('Root ใหม่');
    await page.getByRole('dialog').getByRole('button', { name: 'บันทึก' }).click();
    await expect(tree.getByRole('button', { name: 'Root ใหม่', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'ลบหน้านี้' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ลบหน้า' }).click();
    await expect(page).toHaveURL(new RegExp(other.id));
    await expect(tree.getByRole('treeitem')).toHaveCount(1);
  });

  test('TC-ISSUE-022 edit title, description and labels, then delete the issue', { tag: '@P0' }, async ({ page, session, api, project }) => {
    const issue = await createIssue(api, project.key, { title: 'ชื่อเดิม', description: 'คำอธิบายเดิม', labels: [] });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/issues/${issue.key}`);
    const get = async () => expectResponse<any>(await api.get(`/issues/${issue.key}`), 200, 'Issue');

    await page.getByRole('button', { name: 'แก้ไขชื่อ issue' }).click();
    await page.getByLabel('ชื่อ issue').fill('ชื่อใหม่');
    await page.getByLabel('ชื่อ issue').press('Enter');
    await expect(page.getByRole('heading', { name: 'ชื่อใหม่' })).toBeVisible();

    await page.getByRole('region', { name: 'Description' }).getByRole('button', { name: 'แก้ไข' }).click();
    await page.getByLabel('คำอธิบาย').fill('คำอธิบายใหม่');
    await page.getByRole('region', { name: 'Description' }).getByRole('button', { name: 'บันทึก' }).click();
    await expect(page.getByText('คำอธิบายใหม่')).toBeVisible();

    await page.getByLabel('เพิ่ม label').fill('backend');
    await page.getByLabel('เพิ่ม label').press('Enter');
    await expect.poll(async () => (await get()).labels).toEqual(['backend']);
    const fresh = await get();
    expect([fresh.title, fresh.description]).toEqual(['ชื่อใหม่', 'คำอธิบายใหม่']);
    await page.getByRole('button', { name: 'ลบ backend' }).click();
    await expect.poll(async () => (await get()).labels).toEqual([]);

    await page.getByRole('button', { name: 'ลบ issue' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ลบ issue' }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${project.key}/board`));
    expect((await api.get(`/issues/${issue.key}`)).status()).toBe(404);
  });

  test('TC-ISSUE-023 closing the drawer keeps a description you were still writing', { tag: '@P1' }, async ({ page, session, api, project }) => {
    const issue = await createIssue(api, project.key);
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/projects/${project.key}/board?issue=${issue.key}`);

    await page.getByRole('region', { name: 'Description' }).getByRole('button', { name: 'แก้ไข' }).click();
    await page.getByLabel('คำอธิบาย').fill('ยังเขียนไม่จบ');
    await page.getByRole('button', { name: 'ปิด', exact: true }).click();
    await expect
      .poll(async () => (await expectResponse<any>(await api.get(`/issues/${issue.key}`), 200, 'Issue')).description)
      .toBe('ยังเขียนไม่จบ');
  });

  test('TC-COMMENT-012 edit and delete your own comment; not other people', { tag: '@P0' }, async ({ page, session, api, anon, project }) => {
    const issue = await createIssue(api, project.key);
    const other = await newSession(anon);
    await anon.withToken(other.token).post(`/issues/${issue.key}/comments`, { body: 'ของคนอื่น' });
    await api.post(`/issues/${issue.key}/comments`, { body: 'ของฉัน' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/issues/${issue.key}`);
    await expect(page.getByText('ของฉัน')).toBeVisible();
    await expect(page.getByRole('button', { name: 'แก้ไข comment' })).toHaveCount(1); // เฉพาะ comment ของตัวเอง

    await page.getByRole('button', { name: 'แก้ไข comment' }).click();
    await page.getByLabel('แก้ไข comment').fill('แก้แล้ว');
    await page.getByRole('region', { name: 'Comments' }).getByRole('button', { name: 'บันทึก' }).click();
    await expect(page.getByText('แก้แล้ว')).toBeVisible();
    await expect(page.getByText('(แก้ไขแล้ว)')).toBeVisible();

    await page.getByRole('button', { name: 'ลบ comment' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'ลบ comment' }).click();
    await expect(page.getByText('แก้แล้ว')).toBeHidden();
    await expect(page.getByText('ของคนอื่น')).toBeVisible();
  });

  test('TC-COMMENT-013 a 403 on a comment keeps you signed in and keeps your text', { tag: '@P1' }, async ({ page, session, api, project }) => {
    const issue = await createIssue(api, project.key);
    await api.post(`/issues/${issue.key}/comments`, { body: 'ของฉัน' });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/issues/${issue.key}`);

    await page.route(/\/comments\//, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 403, json: { error: { code: 'PERMISSION_DENIED', message: 'only the author can change this comment' } } })
        : route.continue(),
    );
    await page.getByRole('button', { name: 'แก้ไข comment' }).click();
    await page.getByLabel('แก้ไข comment').fill('แก้ไม่ได้');
    await page.getByRole('region', { name: 'Comments' }).getByRole('button', { name: 'บันทึก' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'only the author' })).toBeVisible();
    await expect(page.getByLabel('แก้ไข comment')).toHaveValue('แก้ไม่ได้');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('TC-BOARD-011 rename a project from its board', { tag: '@P1' }, async ({ page, session, project }) => {
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/projects/${project.key}/board`);
    await page.getByRole('button', { name: 'แก้ไข project' }).click();
    await page.getByRole('dialog').getByLabel('ชื่อ project').fill('Project ใหม่');
    await page.getByRole('dialog').getByRole('button', { name: 'บันทึก' }).click();
    await expect(page.getByRole('heading', { name: 'Project ใหม่' })).toBeVisible();
  });

  test('TC-SEARCH-009 search page shows issues and pages and links to them', { tag: '@P1' }, async ({ page, session, api, project, space }) => {
    const token = uniqueToken();
    const issue = await createIssue(api, project.key, { title: `Find ${token}` });
    await createPage(api, space.key, { title: `Page ${token}` });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/search?q=${token}`);

    await expect(page.getByRole('region', { name: 'Issues' }).getByText(issue.key)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Pages' }).getByText(`Page ${token}`)).toBeVisible();
    await page.getByRole('link', { name: `Find ${token}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/issues/${issue.key}`));
  });

  test('TC-LINK-011 link a page from the issue page, it shows up on the doc page too', { tag: '@P1' }, async ({ page, session, api, project, space }) => {
    const issue = await createIssue(api, project.key);
    const doc = await createPage(api, space.key, { title: `Link me ${uniqueToken()}` });
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/issues/${issue.key}`);

    await page.getByRole('button', { name: 'Link page' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('ค้นหา').fill(doc.title);
    await dialog.getByRole('button', { name: new RegExp(doc.title) }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('region', { name: 'Linked pages' }).getByRole('link', { name: doc.title })).toBeVisible();

    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${doc.id}`);
    await expect(page.getByRole('complementary', { name: 'Linked issues' }).getByText(issue.title)).toBeVisible();
  });

  test('TC-LINK-012 link an issue from the doc page', { tag: '@P1' }, async ({ page, session, api, project, space }) => {
    const issue = await createIssue(api, project.key, { title: `Linkable ${uniqueToken()}` });
    const doc = await createPage(api, space.key);
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/spaces/${space.key}/pages/${doc.id}`);

    await page.getByRole('button', { name: 'Link', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('ค้นหา').fill(issue.key);
    await dialog.getByRole('button', { name: new RegExp(issue.key) }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('complementary', { name: 'Linked issues' }).getByText(issue.title)).toBeVisible();

    const links = await expectResponse<any[]>(await api.get(`/issues/${issue.key}/links`), 200, 'PageSummary[]');
    expect(links.map((p) => p.id)).toEqual([doc.id]);
  });

  test('TC-PROJ-008 create a project from the sidebar and land on its board', { tag: '@P1' }, async ({ page, session }) => {
    const name = `QA UI ${uniqueToken()}`;
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/`);

    await page.getByRole('button', { name: 'สร้าง project' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/ชื่อ project/).fill(name);
    await expect(dialog.getByLabel(/Key/)).toHaveValue('QUQ'); // initials of "QA UI qa…"
    const key = `Q${uniqueToken().slice(2, 8).toUpperCase()}`;
    await dialog.getByLabel(/Key/).fill(key);
    await dialog.getByRole('button', { name: 'สร้าง project' }).click();

    await expect(page).toHaveURL(new RegExp(`/projects/${key}/board`));
    await expect(page.getByRole('heading', { name })).toBeVisible();
  });
});

test.describe('web app on a phone (E2E)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('TC-UI-003 no sideways page scroll and long titles stay inside cards', { tag: '@P1' }, async ({ page, session, api, project, space }) => {
    const issue = await createIssue(api, project.key, {
      title: `https://example.com/${'very-long-path-'.repeat(8)} ${uniqueToken()}`,
      labels: ['a-really-long-label-name-without-any-spaces'],
    });
    const doc = await createPage(api, space.key);
    await loginWithToken(page, session.token);

    for (const path of [`/projects/${project.key}/board`, `/issues/${issue.key}`, `/spaces/${space.key}/pages/${doc.id}`, '/search?q=x']) {
      await page.goto(`${WEB_URL}${path}`);
      await page.waitForLoadState('networkidle');
      const sideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(sideways, `${path} scrolls sideways`).toBe(false);
    }

    await page.goto(`${WEB_URL}/projects/${project.key}/board`);
    const card = page.getByRole('button', { name: new RegExp(issue.key) });
    const title = card.locator('p').first();
    const [cardBox, titleBox] = [(await card.boundingBox())!, (await title.boundingBox())!];
    expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
  });

  test('TC-UI-004 the menu opens from the top bar and closes after picking a page', { tag: '@P1' }, async ({ page, session, project, space }) => {
    await loginWithToken(page, session.token);
    await page.goto(`${WEB_URL}/projects/${project.key}/board`);

    await expect(page.getByRole('navigation', { name: 'เมนูหลัก' })).toBeHidden();
    await page.getByRole('button', { name: 'เปิด/ย่อเมนู' }).click();
    const menu = page.getByRole('navigation', { name: 'เมนูหลัก' });
    await menu.getByRole('link', { name: new RegExp(space.name) }).click();
    await expect(page).toHaveURL(new RegExp(`/spaces/${space.key}`));
    await expect(menu).toBeHidden();
  });
});

/**
 * E2E: the real web app (Vite, WEB_URL) talking to the API (API_BASE_URL).
 * Each test registers its own user and creates its own project / space through the API,
 * then drives the UI. The web app must be configured to call the same API_BASE_URL.
 */
import type { Page } from '@playwright/test';
import { test, expect, expectResponse, createIssue, createPage, uniqueToken } from '../lib/fixtures';

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

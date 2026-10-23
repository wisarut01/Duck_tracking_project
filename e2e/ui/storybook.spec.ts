/**
 * Storybook smoke test: discover every story from /index.json (SB 7+/8/9; falls back
 * to /stories.json for SB 6) and render each one in the iframe, failing on
 * uncaught page errors, console.error, or Storybook's own error overlay.
 * Skips cleanly when Storybook is not reachable at STORYBOOK_URL.
 */
import { test, expect, request as pwRequest, type Page } from '@playwright/test';

interface StoryEntry {
  id: string;
  title: string;
  name: string;
  type?: string;
}

const STORYBOOK_URL = (process.env.STORYBOOK_URL ?? 'http://localhost:6006').replace(/\/+$/, '');
/** Regexes (comma separated) for console errors that are known noise. */
const IGNORE = (process.env.STORYBOOK_IGNORE_CONSOLE ?? 'favicon\\.ico,Download the React DevTools')
  .split(',')
  .filter(Boolean)
  .map((s) => new RegExp(s));
const ONLY = process.env.STORYBOOK_FILTER ? new RegExp(process.env.STORYBOOK_FILTER) : undefined;

async function loadStories(): Promise<StoryEntry[] | string> {
  const ctx = await pwRequest.newContext({ baseURL: STORYBOOK_URL });
  try {
    for (const path of ['/index.json', '/stories.json']) {
      const res = await ctx.get(path, { timeout: 5_000 }).catch(() => undefined);
      if (!res?.ok()) continue;
      const json = await res.json();
      const map: Record<string, StoryEntry> = json.entries ?? json.stories ?? {};
      return Object.values(map).filter((e) => (e.type ?? 'story') === 'story' && (!ONLY || ONLY.test(e.id)));
    }
    return `Storybook not reachable at ${STORYBOOK_URL} (no /index.json or /stories.json)`;
  } finally {
    await ctx.dispose();
  }
}

async function renderStory(page: Page, story: StoryEntry): Promise<string[]> {
  const problems: string[] = [];
  const onPageError = (e: Error) => problems.push(`pageerror: ${e.message}`);
  const onConsole = (m: { type(): string; text(): string }) => {
    if (m.type() === 'error' && !IGNORE.some((r) => r.test(m.text()))) problems.push(`console.error: ${m.text()}`);
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  try {
    const res = await page.goto(`/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, { waitUntil: 'load' });
    if (!res?.ok()) problems.push(`HTTP ${res?.status()}`);
    // Wait until Storybook finished rendering (root has content) or flagged an error.
    await page
      .waitForFunction(
        () => {
          const b = document.body;
          if (b.classList.contains('sb-show-errordisplay') || b.classList.contains('sb-show-nopreview')) return true;
          const root = document.querySelector('#storybook-root, #root');
          return !!root && (root.childElementCount > 0 || document.querySelectorAll('body > *').length > 3);
        },
        undefined,
        { timeout: 10_000 },
      )
      .catch(() => problems.push('timeout: story root never rendered'));
    await page.waitForTimeout(150); // let effects/async errors surface
    const errorDisplay = await page.evaluate(() =>
      document.body.classList.contains('sb-show-errordisplay')
        ? (document.querySelector('#error-message, .sb-errordisplay')?.textContent ?? 'error display').trim()
        : null,
    );
    if (errorDisplay) problems.push(`storybook error: ${errorDisplay.slice(0, 300)}`);
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
  return problems;
}

test.describe('storybook smoke', () => {
  let stories: StoryEntry[] = [];
  let skipReason: string | undefined;

  test.beforeAll(async () => {
    const r = await loadStories();
    if (typeof r === 'string') skipReason = r;
    else stories = r;
  });

  test('TC-UI-001 storybook index lists at least one story', { tag: '@P1' }, async () => {
    test.skip(!!skipReason, skipReason);
    expect(stories.length).toBeGreaterThan(0);
  });

  test('TC-UI-002 every story renders without page/console errors', { tag: '@P0' }, async ({ page }) => {
    test.skip(!!skipReason, skipReason);
    test.skip(stories.length === 0, 'no stories found');
    const failures: string[] = [];
    for (const story of stories) {
      await test.step(`${story.title} / ${story.name} (${story.id})`, async () => {
        const problems = await renderStory(page, story);
        if (problems.length) failures.push(`${story.id}\n    ${problems.join('\n    ')}`);
        expect.soft(problems, story.id).toEqual([]);
      });
    }
    test.info().annotations.push({ type: 'stories', description: `${stories.length} rendered, ${failures.length} failed` });
    if (failures.length) console.log(`Storybook failures:\n${failures.join('\n')}`);
  });
});

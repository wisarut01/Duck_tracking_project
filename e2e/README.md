# e2e — QA test suite (Playwright + TypeScript)

Test plan & test case IDs: [`../docs/qa/TEST_PLAN.md`](../docs/qa/TEST_PLAN.md)

| Project | Folder | Target | What |
|---|---|---|---|
| `api` | `api/` | `API_BASE_URL` (default `http://localhost:4010/api/v1`) | contract / API tests. Every response body is validated against `../api/openapi.yaml` component schemas (Ajv, OAS 3.0 `nullable` handled) |
| `app` | `app/` | `WEB_URL` (default `http://localhost:5173`) + `API_BASE_URL` | E2E through the real web app: login, 401 redirect, drag & drop, create issue + comment, doc mentions, search, linking from both sides, create project. Needs the web app and the API running (`make up`) |
| `ui` | `ui/` | `STORYBOOK_URL` (default `http://localhost:6006`) | Storybook smoke: reads `/index.json`, opens **every** story iframe, fails on page errors / `console.error` / Storybook error overlay. Skips if Storybook is not running |

`api/contract.spec.ts` runs offline (it needs no server). It checks that the spec compiles and that its examples match its own schemas.

## Setup

```bash
cd e2e
npm install
npx playwright install chromium   # only needed for the ui project
```

## Run

```bash
# start the targets first (from repo root, in other terminals)
(cd services/mock-api && npm start)       # :4010
(cd web && npm run storybook)             # :6006

npm run test:api        # API tests only
npm run test:ui         # Storybook smoke only
npm run test:app        # E2E through the web app (needs `make up`)
npm test                # everything
npm run report          # open the HTML report (playwright-report/)

npx playwright test --grep @P0                                   # run by priority
npx playwright test --grep TC-BOARD                              # run by area / ID
API_BASE_URL=http://localhost:8080/api/v1 npm run test:api       # run against the real gateway
STORYBOOK_FILTER='^components-button' npm run test:ui            # run only a subset of stories
npm run typecheck                                                # tsc --noEmit
```

| Env var | Default | Meaning |
|---|---|---|
| `API_BASE_URL` | `http://localhost:4010/api/v1` | gateway or mock base URL |
| `STORYBOOK_URL` | `http://localhost:6006` | Storybook base URL |
| `WEB_URL` | `http://localhost:5173` | web app base URL (it must call the same `API_BASE_URL`) |
| `OPENAPI_PATH` | `../api/openapi.yaml` | contract file |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` | `duck@example.com` / `password123` | fallback login, used only if `/auth/register` is unavailable |
| `STORYBOOK_IGNORE_CONSOLE` | `favicon\.ico,Download the React DevTools` | comma-separated regexes of console errors to ignore |
| `STORYBOOK_FILTER` | – | regex on story id |

Reports: `playwright-report/` (HTML) and `results/junit.xml` (CI).

## Conventions

- Test titles start with the test case ID (`TC-ISSUE-002 ...`) and carry a priority tag (`@P0`, `@P1` or `@P2`).
- Tests are **independent**. Each test registers its own user and creates its own project and space with random keys (`lib/fixtures.ts`). Nothing depends on seed data or test order, and the suite runs `fullyParallel`.
- Use `expectResponse(res, status, 'SchemaName' | 'SchemaName[]')` and `expectError(res, status, code)` from `lib/fixtures.ts`. Failures print the URL and response body.
- A test that asserts behaviour the spec does not declare is marked `[spec gap]` in its title and annotation.
- Do not call `POST /__mock/reset` while a suite is running.

## Layout

```
e2e/
  playwright.config.ts   projects: api, app, ui
  lib/schema.ts          openapi.yaml -> Ajv (nullable conversion, $ref resolution)
  lib/fixtures.ts        ApiClient, fixtures (anon, session, api, project, space), builders, matchers
  api/*.spec.ts          auth, projects, issues, board, comments, docs, links, search, errors, contract
  app/app.spec.ts        E2E through the web app
  ui/storybook.spec.ts   every-story smoke test
```

## Last run (2026-10-18, against services/mock-api)

- `npx playwright test --list`: **100 tests in 11 files** (98 api + 2 ui)
- `npm test`: **98 passed, 2 skipped** (ui skipped because Storybook was not running). The result was the same on 2 consecutive runs.
- One earlier run had 1 failure. The shared mock was reset or restarted mid-run (`401 user for this token no longer exists`), so it was not a product bug.
- Spec and mock findings are listed in `docs/qa/TEST_PLAN.md` §8.

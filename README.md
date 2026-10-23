# Tracking Board

Jira-like issue tracker + Confluence-like docs, linked together.
Read [`docs/AGREEMENTS.md`](docs/AGREEMENTS.md) first. The REST contract is [`api/openapi.yaml`](api/openapi.yaml).

## Run everything (Docker)

```bash
make up      # build + start mock API, Swagger UI, web, Storybook in the background
make ps      # what's running
make logs    # follow the logs
make down    # stop everything
```

| What | URL |
|---|---|
| Mock API | http://localhost:4010/api/v1 |
| Swagger UI | http://localhost:8081 |
| Web app | http://localhost:5173 |
| Storybook | http://localhost:6006 (first start takes ~30s) |

`web` and `storybook` mount `./web`, so edits hot-reload. Their `node_modules` live in the
`web_node_modules` volume. After `web/package.json` changes, rebuild with
`docker compose down && docker volume rm tracking_board_web_node_modules && make up`.
The tests (`make smoke`, `cd e2e && npm test`) run on the host against this stack.

## Backend (real)

The real backend runs in Docker: api-gateway (Go, :8080) → auth / tracker (Go) and docs (Python) over gRPC, with Postgres.
See [`services/README.md`](services/README.md).

```bash
make up-real     # postgres + 3 services + gateway on http://localhost:8080/api/v1 (same demo data as the mock)
make test-real   # Playwright API suite against it
make test-go     # Go tests;  make test-docs → docs-service tests
```

## Backend (mock)

A stateful mock API and Swagger UI. The web app and the tests still use it by default.

| What | URL | Start with |
|---|---|---|
| Mock API | http://localhost:4010/api/v1 | `make mock` (Node) or `make up-api` (Docker) |
| Swagger UI | http://localhost:8081 | `make swagger` (Docker) or `make up-api` |

```bash
make mock      # mock API on :4010 (needs Node 20+)
make smoke     # 2nd terminal: run the demo flow against it
make swagger   # Swagger UI on :8081 → "Authorize" with a token from /auth/login, then "Try it out"
make up-api    # or run both in Docker;  make down to stop
make lint      # lint api/openapi.yaml
```

Log in with `duck@example.com` / `password123`. More details:
- [`services/mock-api/README.md`](services/mock-api/README.md) covers the seed data, env vars and code map
- [`proto/README.md`](proto/README.md) has the draft gRPC contracts, how each REST endpoint maps to gRPC calls, and how gRPC errors become HTTP errors

## Frontend

The web app logs in and reads/writes everything through the REST API (the mock on :4010 for now). Storybook shows every component and screen with fixture data. Everything is in [`web/`](web/) and uses Vite, React, TypeScript (strict), Tailwind CSS v4 and Storybook 10. The design spec is [`web/DESIGN.md`](web/DESIGN.md) (in Thai).

```bash
cd web
npm install
npm run storybook        # Storybook on http://localhost:6006 (theme toggle on the toolbar, a11y tab)
npm run dev              # app on http://localhost:5173 → calls the mock API on :4010 (start it with `make mock`)
npm run typecheck        # tsc --noEmit
npm run build-storybook  # static Storybook in web/storybook-static
```

- Types are generated from `api/openapi.yaml` into `web/src/types/openapi.gen.ts` (`npm run gen:api`, or `npm run check:api` to check it is up to date). `web/src/types/api.ts` gives them short names. Mock data is in `web/src/mocks/fixtures.ts` (project `TB`, space `ENG`).
- Code layout: `src/api/` (typed client from `openapi-fetch` + react-query hooks), `src/pages/` (route components that fetch data), `src/screens/` + `src/components/` (UI only, props in / callbacks out, also used by Storybook).
- `VITE_API_BASE_URL` picks the API (default `http://localhost:4010/api/v1`). Set it to `http://localhost:8080/api/v1` once the real gateway runs.
- `npm run dev:msw` runs the app with [MSW](https://mswjs.io) answering `/api/v1/*` in the browser from the fixtures (`web/src/mocks/handlers.ts`), so you don't need the mock API running. It only covers reading data, login and moving cards.

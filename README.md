# Tracking Board

Jira-like issue tracker + Confluence-like docs, linked together.
Read [`docs/AGREEMENTS.md`](docs/AGREEMENTS.md) first. The REST contract is [`api/openapi.yaml`](api/openapi.yaml).

## Run everything (Docker)

```bash
make up      # build + start all 4 services in the background
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

## Backend (mock)

Phase 1 runs a demo backend: a stateful mock API and Swagger UI. The real Go/Python services come in Phase 2.

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

Phase 1 covers the design system and a Storybook with every component and the main screens. Everything is in [`web/`](web/) and uses Vite, React, TypeScript (strict), Tailwind CSS v4 and Storybook 10. The design spec is [`web/DESIGN.md`](web/DESIGN.md) (in Thai).

```bash
cd web
npm install
npm run storybook        # Storybook on http://localhost:6006 (theme toggle on the toolbar, a11y tab)
npm run dev              # app on http://localhost:5173 (screens wired to mock fixtures for now)
npm run typecheck        # tsc --noEmit
npm run build-storybook  # static Storybook in web/storybook-static
```

- Types are generated from `api/openapi.yaml` into `web/src/types/openapi.gen.ts` (`npm run gen:api`, or `npm run check:api` to check it is up to date). `web/src/types/api.ts` gives them short names. Mock data is in `web/src/mocks/fixtures.ts` (project `TB`, space `ENG`).
- `npm run dev:msw` runs the app with [MSW](https://mswjs.io) answering `/api/v1/*` in the browser from the fixtures (`web/src/mocks/handlers.ts`), so you don't need the mock API running.
- Phase 2 replaces the fixtures with `@tanstack/react-query` calls to the mock API on :4010, then to the gateway on :8080.

# mock-api

A small Express server that pretends to be the real **api-gateway**, so the frontend and QA
can work before the Go/Python services exist.

- Serves every endpoint in [`api/openapi.yaml`](../../api/openapi.yaml) at `http://localhost:4010/api/v1`
- Keeps data **in memory** and actually changes it: create, move, link and delete all work.
  The data starts over when you restart the server, or when you call `POST /__mock/reset`.
- Checks each request against `openapi.yaml` (express-openapi-validator). Bad input gets a
  `400 VALIDATION_FAILED` that follows the spec.
  Responses are checked too. A mismatch is only logged as a `[contract] ...` line and the request still succeeds.
- Issues real JWTs (HS256). Every endpoint except register/login needs `Authorization: Bearer <token>`
- CORS allows `http://localhost:5173` (Vite), `:6006` (Storybook) and `:8081` (Swagger UI)

## Run

```bash
npm install
npm start        # http://localhost:4010
npm run dev      # same, restarts when you edit a file (node --watch)
npm run smoke    # in a 2nd terminal: login → list → create → move → link → search
```
You can also use `make mock` / `make up-mock` from the repo root. Since Phase 2c the web app
and the tests default to the real gateway (:8080); point them here with
`VITE_API_BASE_URL` / `API_BASE_URL=http://localhost:4010/api/v1`.

| Env var | Default | What it does |
|---|---|---|
| `PORT` | `4010` | |
| `OPENAPI_PATH` | `../../api/openapi.yaml` | spec used for validation |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:6006,http://localhost:8081` | comma-separated |
| `MOCK_DELAY_MS` | `0` | fake latency, for testing loading states |
| `JWT_SECRET` | a dev secret | |

## Seed data (`src/seed.js`)

| | |
|---|---|
| Users | `duck@example.com`, `mint@example.com`, `ploy@example.com`. The password for all three is `password123` |
| Project | `TB` with TB-1 … TB-12 spread over all 4 columns. The next issue you create is **TB-13** |
| Spaces | `ENG` (3-level page tree: Engineering Home → Architecture → gRPC Contracts …) and `PM` |
| Links | e.g. TB-12 and TB-3 ↔ "Board Spec" (`5e6f7081-0000-4000-8000-000000000001`) |
| Comments | on TB-12, TB-8 and TB-5 |

IDs are fixed and match the examples in the spec (TB-12 = `3c4d5e6f-0000-4000-8000-000000000012`).

## Try it with curl

```bash
B=http://localhost:4010/api/v1
TOKEN=$(curl -s -X POST $B/auth/login -H 'content-type: application/json' \
  -d '{"email":"duck@example.com","password":"password123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken')
curl -s $B/projects/TB/issues -H "authorization: Bearer $TOKEN"
curl -s -X POST $B/issues/TB-6/move -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"status":"IN_PROGRESS","afterKey":"TB-3"}'
```

## Mock-only endpoints (not in the spec)

- `GET /health` → `{ "status": "ok" }`
- `POST /__mock/reset` → 204, puts the seed data back (handy before each test run)

## Code map

```
src/server.js        app setup: CORS → JSON → auth → OpenAPI validator → trim text fields → routes → errors
src/auth.js          JWT sign/verify + the "requireAuth" middleware
src/openapi.js       loads openapi.yaml for the validator
src/db.js            the in-memory data + toIssue()/toPage()/... (internal row → JSON from the spec)
src/seed.js          starting data
src/errors.js        ApiError, notFound(), ... and the error → { error: { code, message } } handler
src/routes/*.js      one file per future service: auth, tracker, docs (+ search)
scripts/smoke.js     end-to-end check of the demo flow
```
The routes are split the same way the real services will be, so `routes/tracker.js` shows
roughly what `tracker-service` will need to do.

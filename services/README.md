# Backend services (Phase 2b)

The real backend behind [`api/openapi.yaml`](../api/openapi.yaml). It replaces `mock-api`; the
REST API is the same, so the web app and the Playwright suite work against either one.

```
web ──REST :8080──> api-gateway (Go, Fiber v3) ──gRPC :50051──> auth-service    (Go + GORM)    → auth_db
                                               ──gRPC :50052──> tracker-service (Go + GORM)    → tracker_db
                                               ──gRPC :50053──> docs-service    (Python + SQLAlchemy) → docs_db
```

One Postgres, one database per service ([`deploy/postgres/init.sql`](../deploy/postgres/init.sql)).
Each service creates its own tables on start (GORM `AutoMigrate` / SQLAlchemy `create_all`).
The gRPC contracts, and which REST endpoint calls which RPC, are in [`proto/README.md`](../proto/README.md).

## Run

```bash
make up-real     # build + start postgres, the 3 services and the gateway (Docker)
make test-real   # Playwright API suite against http://localhost:8080/api/v1
make down        # stop (the postgres volume, i.e. your data, is kept)
```

Log in with `duck@example.com` / `password123`. With `SEED_DEMO_DATA=true` (set in
`docker-compose.yml`) every service adds the same demo data as the mock when its tables are empty:
users duck/mint/ploy, project `TB` (TB-1…TB-12), spaces `ENG` and `PM`, with the same ids.
To start over with only the demo data: `docker compose --profile real down -v && make up-real`.

To point the web app at the real backend: `VITE_API_BASE_URL=http://localhost:8080/api/v1 npm run dev` in `web/`.

## Code map

| Folder | What's in it |
|---|---|
| `api-gateway/` | `handlers.go` (REST endpoint → gRPC calls), `middleware.go` (Bearer token check, then request validation against `openapi.yaml` with kin-openapi), `convert.go` (proto → JSON, user hydration), `errors.go` (gRPC status → HTTP error) |
| `auth-service/` | users, bcrypt passwords, HS256 JWT (24h) |
| `tracker-service/` | projects, issues, comments, `issue_page_links`. `move.go` has the drag & drop position maths |
| `docs-service/` | spaces and the page tree (`docs_service/service.py`) |
| `internal/svc` | shared Go bits: env, Postgres connect with retry, gRPC server + per-call log line |
| `internal/svctest` | gives each Go test its own Postgres schema |
| `go.Dockerfile` | one Dockerfile for the 3 Go programs (`--build-arg SERVICE=…`) |

The Go code is one module at the repo root (`go.mod`). The gRPC code is generated into `/gen`
(not committed): `make gen` locally, and the Dockerfiles run `buf generate` themselves.

### Rules worth knowing

- **Order of checks in the gateway:** token first (no token → 401 even if the body is wrong),
  then the request against the spec (unknown path or method → 404, bad input → 400,
  unknown query parameter → 400), then the handler. Required text (title, name, displayName,
  body, q) is trimmed before it is sent on.
- **Services trust the gateway** for the current user id, but still check their own rules
  (`INVALID_ARGUMENT`), e.g. a page can't be moved under its own child.
- **Cross-service work is done by the gateway:** checking an assignee exists (auth), checking a
  page exists before linking it (docs), removing links after a page is deleted (tracker), and
  search (tracker + docs in parallel). Services never call each other.
- **Board positions** are fractional: a dropped card goes halfway between its neighbours. When
  two neighbours get too close for a `float64` (about 50 drops into the same gap), the column is
  renumbered 1024, 2048, … and the drop is retried.
- **Errors:** anything that isn't a gRPC status with a known code becomes `500 INTERNAL` with the
  message `internal error`; the details are only in the service and gateway logs.

## Env vars

| Service | Var | Default |
|---|---|---|
| all services | `DATABASE_URL` | `postgres://tb:tb@localhost:5432/<service>_db?sslmode=disable` (docs-service: `postgresql+psycopg://…/docs_db`) |
| | `GRPC_ADDR` | `:50051` / `:50052` / `[::]:50053` |
| | `SEED_DEMO_DATA` | `false` |
| auth-service | `JWT_SECRET` | a dev secret (logs a warning). **Set your own outside dev.** |
| api-gateway | `HTTP_ADDR` | `:8080` |
| | `OPENAPI_PATH` | `api/openapi.yaml` (`/app/openapi.yaml` in Docker) |
| | `AUTH_ADDR`, `TRACKER_ADDR`, `DOCS_ADDR` | `localhost:50051` / `:50052` / `:50053` |
| | `CORS_ORIGINS` | `http://localhost:5173,http://localhost:6006,http://localhost:8081` |

## Tests

```bash
make test-go     # go vet + go test in Docker
make test-docs   # ruff + pytest for docs-service in Docker (SQLite in memory, no Postgres needed)
```

The Go DB tests (auth-service, tracker-service) are skipped unless `TEST_DATABASE_URL` points at a
Postgres. With `make up-real` running:

```bash
TEST_DATABASE_URL='postgres://tb:tb@localhost:5432/tb?sslmode=disable' make test-go
```

Each test gets its own schema, so this doesn't touch the service databases.
The gateway tests use fake gRPC services and need nothing.

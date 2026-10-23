# gRPC contracts (draft)

The contracts between **api-gateway** (Go) and the three services. The browser never
talks gRPC: it calls the REST API in `api/openapi.yaml`, and the gateway turns each REST
call into one or more gRPC calls.

| Package | File | Service | Language | Port |
|---|---|---|---|---|
| `auth.v1` | `auth/v1/auth.proto` | `AuthService` | Go | 50051 |
| `tracker.v1` | `tracker/v1/tracker.proto` | `TrackerService` | Go | 50052 |
| `docs.v1` | `docs/v1/docs.proto` | `DocsService` | Python | 50053 |

## Tools

```bash
cd proto
npx @bufbuild/buf lint       # style rules (STANDARD), passes today
npx @bufbuild/buf generate   # → ../gen/go and ../gen/python (see buf.gen.yaml)
```
You don't need to install `buf`; `npx` downloads it. `buf generate` uses buf's remote
plugins, so you also don't need `protoc`. Generated code goes in `/gen` and isn't committed.

## Conventions

- **Field names**: proto uses `snake_case`, REST JSON uses `camelCase` (`display_name` ↔ `displayName`).
- **Enums** have an `X_UNSPECIFIED = 0` value and a type prefix. The REST value is the name
  without the prefix: `ISSUE_STATUS_IN_REVIEW` ↔ `"IN_REVIEW"`.
- **Time**: `google.protobuf.Timestamp` ↔ ISO-8601 UTC string. `create_time` ↔ `createdAt`, `update_time` ↔ `updatedAt`.
- **null**: an `optional` field that is not set ↔ `null` in JSON (`assignee_id`, `parent_id`, `description`, `avatar_url`).
- **PATCH** endpoints use a `google.protobuf.FieldMask`. The gateway puts every JSON key
  it received into `update_mask`. If a path is in the mask but the field is not set, that
  means "set to null" (e.g. `{"assigneeId": null}` → mask `["assignee_id"]`, no value → unassign).
- **IDs, not objects**: services return `assignee_id`, `reporter_id` and `author_id`, not
  full users. The gateway collects all the ids in a response and calls
  `AuthService/ListUsers(ids)` **once** to fill in `assignee`, `reporter` and `author`.
- **Current user**: the gateway calls `AuthService/ValidateToken` for each request and passes
  the user id in fields like `reporter_id`, `author_id` and `lead_id`. Services trust the gateway.
- Every RPC has its own `XxxRequest` / `XxxResponse` (buf STANDARD lint), so we can add
  fields later without breaking anything.

## REST endpoint → gRPC calls

"→ hydrate users" means the gateway also calls `auth.v1.AuthService/ListUsers` with the user ids it got back.

| REST (`/api/v1`) | gRPC calls made by the gateway |
|---|---|
| `POST /auth/register` | `auth.Register` |
| `POST /auth/login` | `auth.Login` |
| *(every authenticated request)* | `auth.ValidateToken` |
| `GET /auth/me` | `auth.GetUser` |
| `GET /users` | `auth.ListUsers` (no ids = all) |
| `GET /projects` | `tracker.ListProjects` |
| `POST /projects` | `tracker.CreateProject` (`lead_id` = current user) |
| `GET /projects/{projectKey}` | `tracker.GetProject` |
| `GET /projects/{projectKey}/issues` | `tracker.ListIssues` → hydrate users |
| `POST /projects/{projectKey}/issues` | `tracker.CreateIssue` (`reporter_id` = current user) → hydrate users |
| `GET /issues/{issueKey}` | `tracker.GetIssue` → hydrate users |
| `PATCH /issues/{issueKey}` | `tracker.UpdateIssue` (+ `update_mask`) → hydrate users |
| `DELETE /issues/{issueKey}` | `tracker.DeleteIssue` (also deletes its comments + links) |
| `POST /issues/{issueKey}/move` | `tracker.MoveIssue` → hydrate users |
| `GET /issues/{issueKey}/comments` | `tracker.ListComments` → hydrate users |
| `POST /issues/{issueKey}/comments` | `tracker.CreateComment` (`author_id` = current user) → hydrate users |
| `GET /issues/{issueKey}/links` | `tracker.ListIssueLinks` → `docs.BatchGetPages(page_ids)` |
| `POST /issues/{issueKey}/links` | `docs.GetPage` (404 if the page is missing) → `tracker.CreateIssueLink` → return the PageSummary |
| `DELETE /issues/{issueKey}/links/{pageId}` | `tracker.DeleteIssueLink` |
| `GET /spaces` | `docs.ListSpaces` |
| `POST /spaces` | `docs.CreateSpace` |
| `GET /spaces/{spaceKey}` | `docs.GetSpace` |
| `GET /spaces/{spaceKey}/pages` | `docs.GetPageTree` |
| `POST /spaces/{spaceKey}/pages` | `docs.CreatePage` (`author_id` = current user) → hydrate users |
| `GET /pages/{pageId}` | `docs.GetPage` → hydrate users |
| `PATCH /pages/{pageId}` | `docs.UpdatePage` (+ `update_mask`) → hydrate users |
| `DELETE /pages/{pageId}` | `docs.DeletePage` → `tracker.DeletePageLinks(deleted_page_ids)` |
| `GET /pages/{pageId}/linked-issues` | `tracker.ListPageLinkedIssues` → hydrate users |
| `GET /search?q=` | `tracker.SearchIssues` **and** `docs.SearchPages` in parallel → hydrate users → `{ issues, pages }` |

Calls that span two services (link create, page delete, search) are run by the gateway.
The services never call each other.

## gRPC status → HTTP error

The gateway turns a gRPC error into the REST error body `{ "error": { "code", "message" } }`
(see `docs/AGREEMENTS.md`). `message` is the gRPC status message.

| gRPC status code | HTTP | `error.code` | Example |
|---|---|---|---|
| `INVALID_ARGUMENT` | 400 | `VALIDATION_FAILED` | empty title, page moved under its own child |
| `UNAUTHENTICATED` | 401 | `UNAUTHENTICATED` | bad password, expired token |
| `PERMISSION_DENIED` | 403 | `PERMISSION_DENIED` | (no roles in the MVP yet) |
| `NOT_FOUND` | 404 | `NOT_FOUND` | `issue TB-999 not found` |
| `ALREADY_EXISTS` | 409 | `ALREADY_EXISTS` | duplicate project key, duplicate link |
| anything else (`INTERNAL`, `UNAVAILABLE`, `DEADLINE_EXCEEDED`, …) | 500 | `INTERNAL` | a service is down. Log the details, don't send them to the client |

Request validation that the OpenAPI spec already describes (formats, required fields,
patterns) should be done in the gateway first, so bad input never reaches a service. The
services still check their own business rules and return `INVALID_ARGUMENT`.

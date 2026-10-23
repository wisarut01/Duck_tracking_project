# Test Plan — Tracking Board (MVP)

> Owner: QA · สถานะ: Phase 1 (contract tests กับ mock) · อ้างอิง: `docs/AGREEMENTS.md`, `api/openapi.yaml`
> ถ้า contract เปลี่ยน → ต้องอัปเดต test case ที่นี่ + `e2e/api/*` ใน PR เดียวกัน

## 1. Scope

**In scope (MVP)** — ตาม AGREEMENTS §1
- Auth: register / login (JWT), `GET /auth/me`, 401 handling
- Projects, Issues CRUD (`TB-12` key อัตโนมัติ), comments
- Kanban board 4 คอลัมน์ + drag & drop (`POST /issues/{key}/move` ด้วย `afterKey` / `beforeKey`)
- Docs: Space → Page tree (nested), Markdown content
- Link สองทาง Issue ↔ Page และ `TB-12` mention ใน Markdown ที่ render เป็นลิงก์อัตโนมัติ
- Search รวม issue + page
- Error format กลาง `{ "error": { "code", "message" } }` และ HTTP status mapping

**Out of scope** — sprint, custom workflow, realtime, version history, notifications (เฟส 2),
load/performance test แบบเต็ม (ทำแค่ smoke ด้าน latency), security pentest (ทำแค่ auth negative cases)

## 2. Test levels

| Level | ทดสอบอะไร | เครื่องมือ | เจ้าของ | อยู่ที่ไหน |
|---|---|---|---|---|
| Unit | logic ใน service (position calc, key generator, tree build, mention regex) | Go `testing`, `pytest`, Vitest | BE / FE | ในแต่ละ service / `web/` |
| Contract (offline) | `openapi.yaml` ถูกต้องในตัวเอง: ทุก schema compile ได้, example ตรง schema, nullable (OAS 3.0) | Playwright + Ajv | QA | `e2e/api/contract.spec.ts` |
| Contract / API | ทุก endpoint ผ่าน gateway (mock ใน Phase 1, gateway จริงใน Phase 2) — status code + response body validate กับ component schema | Playwright `request` + Ajv | QA | `e2e/api/*.spec.ts` |
| gRPC contract | gateway ↔ services ตาม `proto/` (buf breaking) | buf / grpcurl | BE | `proto/` |
| Component | component render ได้ทุก state, ไม่มี console error; interaction (mention link, card DnD) | Storybook + Playwright smoke, Storybook play/Vitest | FE (+QA smoke) | `web/` stories, `e2e/ui/storybook.spec.ts` |
| E2E | user flow ผ่าน UI จริง (login → board → drag → doc → link) | Playwright browser | QA | `e2e/ui/` (Phase 2, project ใหม่ `e2e`) |
| Exploratory / manual | UX, a11y keyboard DnD, Thai text, edge cases ที่ automate ยาก | manual + checklist | QA | ใน PR / ticket |

## 3. Environments

| Env | URL | ใช้กับ | หมายเหตุ |
|---|---|---|---|
| Mock API | `http://localhost:4010/api/v1` | API tests Phase 1, FE dev | `services/mock-api` (stateful in-memory, reset ได้ด้วย `POST /__mock/reset`) |
| Storybook | `http://localhost:6006` | component smoke | `web/` |
| Gateway จริง (local) | `http://localhost:8080/api/v1` | API tests Phase 2 | docker compose + Postgres |
| Web (Vite) | `http://localhost:5173` | E2E Phase 2 | |
| CI | GitHub Actions (เสนอ) | ทุก PR: contract offline + API vs mock; nightly: API vs gateway + E2E | |

เปลี่ยน target ด้วย env: `API_BASE_URL`, `STORYBOOK_URL` (ดู `e2e/README.md`)
Test data: ทุก test สร้าง user / project / space ของตัวเองด้วย key สุ่ม → รันขนาน (`fullyParallel`) และรันซ้ำบน env เดิมได้ ไม่พึ่ง seed (ยกเว้น fallback login `duck@example.com`)

## 4. Entry / Exit criteria

**Entry**
- `api/openapi.yaml` ผ่าน lint (redocly) และ `TC-CONTRACT-*` ผ่าน
- env เป้าหมาย up และตอบ `401` ที่ `GET /projects` (health ขั้นต่ำ)
- feature ถูก merge ลง branch ที่จะทดสอบ + มี story (FE) / unit test (BE) ตาม DoD

**Exit (ต่อ release / phase)**
- P0 ผ่าน 100%, P1 ผ่าน ≥ 95% และที่ fail มี ticket + workaround, P2 ไม่บังคับ
- ไม่มี bug severity Critical/High ค้าง
- Storybook smoke (`TC-UI-002`) ไม่มี story ที่ error
- รายงานผล (Playwright HTML report + JUnit) แนบใน PR / release note

## 5. Risks & mitigation

| Risk | ผลกระทบ | Mitigation |
|---|---|---|
| Mock ทำงานต่างจาก gateway จริง (mock “ใจดี” กว่า) | test เขียวบน mock แต่แดงบนของจริง | test suite เดียวกันรันทั้ง 2 target (`API_BASE_URL`); ทุก behavior ที่ test พึ่งต้องอยู่ใน spec — ที่ยังไม่อยู่ติดป้าย `[spec gap]` |
| Spec ไม่ประกาศ error response หลายตัว (401 ทุก endpoint, 404 บางตัว) | FE/BE ตีความไม่ตรงกัน, codegen ไม่มี type ให้ error | ส่ง finding ให้ BE เพิ่มใน `openapi.yaml` (ดู §8) |
| Ordering (fractional `position`) ชนกัน / precision หมดเมื่อแทรกที่เดิมซ้ำ ๆ | card สลับที่ / หาย | `TC-BOARD-009` แทรก 25 ครั้งในช่องเดียว; BE ควรมี rebalance |
| Link สองทางข้าม service (tracker เป็นเจ้าของ `issue_page_links`, page อยู่ docs-service) | ลบ page แล้ว link ค้าง (orphan) | `TC-LINK-009/010`; ต้องตกลง event/cleanup ใน Phase 2 |
| Shared mock state / มีคน `reset` ระหว่างรัน | test fail แบบสุ่ม (token “user no longer exists”) | test สร้าง data เอง; รัน CI กับ mock instance แยก; ห้าม reset ระหว่าง suite |
| Storybook story ID ยังไม่นิ่ง | smoke test เปราะ | ดึงรายการจาก `/index.json` แบบ dynamic, ไม่ hardcode |
| JWT / 401 handling ฝั่ง FE (token หมดอายุ) | user ค้างหน้าเปล่า | `TC-ERR-008` (E2E) + MSW story ที่ตอบ 401 |
| ภาษาไทยใน search / title | ค้นไม่เจอ / encoding | เพิ่ม P2 case ภาษาไทย (`TC-SEARCH-008`) |

## 6. Conventions

- ID: `TC-<AREA>-<NNN>`; Priority: **P0** = blocker/smoke, **P1** = core behavior, **P2** = edge / nice-to-have
- Automation column: `API` = `e2e/api/<file>`, `UI-SB` = Storybook smoke `e2e/ui/storybook.spec.ts`, `FE-unit` = Vitest/Storybook play ใน `web/`, `E2E (P2)` = แผน Phase 2, `E2E (app/app.spec.ts)` = รันแล้วกับเว็บจริง, `Manual`
- Playwright tag `@P0/@P1/@P2` ใน test title → รันเฉพาะ priority ได้: `npx playwright test --grep @P0`

## 7. Acceptance criteria & test cases

### 7.1 Auth (`e2e/api/auth.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-AUTH-001 | P0 | **Given** email ที่ยังไม่เคยสมัคร **When** `POST /auth/register` ด้วย email, password ≥ 8, displayName **Then** 201, body เป็น `AuthResponse` มี `accessToken` และ `user.email` ตรง | API |
| TC-AUTH-002 | P1 | **Given** email ที่สมัครแล้ว **When** register ซ้ำ **Then** 409 `ALREADY_EXISTS` | API |
| TC-AUTH-003 | P1 | **Given** password สั้นกว่า 8 **When** register **Then** 400 `VALIDATION_FAILED` | API |
| TC-AUTH-004 | P0 | **Given** user ที่มีอยู่ **When** `POST /auth/login` ด้วย credential ถูก **Then** 200 `AuthResponse` | API |
| TC-AUTH-005 | P0 | **Given** user ที่มีอยู่ **When** login ด้วย password ผิด **Then** 401 `UNAUTHENTICATED` (ไม่บอกว่า email หรือ password ผิด) | API |
| TC-AUTH-006 | P0 | **Given** token ที่ valid **When** `GET /auth/me` **Then** 200 `User` เป็นคนเดียวกับที่ login | API |
| TC-AUTH-007 | P0 | **Given** ไม่ส่ง `Authorization` **When** เรียก endpoint ที่ต้อง auth (me, users, projects GET/POST, issues, move, spaces, search) **Then** 401 `UNAUTHENTICATED` ทุกตัว | API (9 cases) |
| TC-AUTH-008 | P0 | **Given** token ปลอม / malformed **When** `GET /auth/me` **Then** 401 | API |
| TC-AUTH-009 | P1 | **Given** login แล้ว **When** `GET /users` **Then** 200 `User[]` มีตัวเองอยู่ (ใช้เลือก assignee) | API |
| TC-AUTH-010 | P0 | **Given** หน้า login **When** กรอกถูกแล้ว submit **Then** redirect ไป board และ token ถูกเก็บ; กรอกผิดเห็นข้อความ error | E2E (`app/app.spec.ts`) |
| TC-AUTH-011 | P2 | **Given** token หมดอายุ (exp ผ่านแล้ว) **When** เรียก API **Then** 401 | Manual (ต้องควบคุมเวลา/secret) |

### 7.2 Projects (`e2e/api/projects.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-PROJ-001 | P0 | **Given** login แล้ว **When** `POST /projects` key ตาม `^[A-Z][A-Z0-9]{1,9}$` **Then** 201 `Project`, `leadId` = ผู้สร้าง | API |
| TC-PROJ-002 | P0 | **Given** project ที่สร้างแล้ว **When** `GET /projects/{key}` **Then** 200 id ตรง | API |
| TC-PROJ-003 | P1 | **When** `GET /projects` **Then** มี project ที่สร้าง | API |
| TC-PROJ-004 | P1 | **Given** key ที่มีอยู่ **When** สร้างซ้ำ **Then** 409 `ALREADY_EXISTS` | API |
| TC-PROJ-005 | P1 | **When** key ผิด pattern (`bad-key`) **Then** 400 `VALIDATION_FAILED` | API |
| TC-PROJ-006 | P1 | **When** `GET /projects/{ไม่มีอยู่}` **Then** 404 `NOT_FOUND` | API |
| TC-PROJ-007 | P2 | **Given** project มี 2 issue **When** get project **Then** `issueCount` = 2 | API |

### 7.3 Issues CRUD (`e2e/api/issues.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-ISSUE-001 | P0 | **Given** project `KEY` **When** `POST /projects/KEY/issues` {title, type, priority, labels} **Then** 201 `Issue`, key = `KEY-n`, status default `TODO`, reporter = ผู้สร้าง | API |
| TC-ISSUE-002 | P0 | **Given** สร้าง issue `KEY-n` แล้ว **When** สร้างอีกตัว **Then** key = `KEY-(n+1)` | API |
| TC-ISSUE-003 | P0 | **When** `GET /issues/{key}` **Then** 200 ข้อมูลตรงกับที่สร้าง (รวม description Markdown) | API |
| TC-ISSUE-004 | P0 | **Given** 2 issue **When** `GET /projects/KEY/issues` **Then** 200 `IssueList` มีครบ, `total`=2, `page`=1 | API |
| TC-ISSUE-005 | P1 | **When** list `?status=DONE` **Then** มีแต่ issue สถานะ DONE | API |
| TC-ISSUE-006 | P1 | **When** list `?q=<token>` **Then** มีเฉพาะ issue ที่ title มี token | API |
| TC-ISSUE-007 | P1 | **Given** 3 issue **When** `page=1,pageSize=2` และ `page=2` **Then** 2 + 1 รายการ ไม่ซ้ำ, `total`=3 | API |
| TC-ISSUE-008 | P0 | **When** `PATCH` เฉพาะ `title` **Then** 200 title เปลี่ยน, field อื่น (type, labels, key) ไม่เปลี่ยน, `updatedAt` ไม่ถอยหลัง | API |
| TC-ISSUE-009 | P1 | **When** PATCH assigneeId / priority / labels แล้ว PATCH `assigneeId: null` **Then** assignee ถูกตั้งแล้วถูกล้าง | API |
| TC-ISSUE-010 | P0 | **When** `DELETE /issues/{key}` **Then** 204 และ GET ต่อมาได้ 404 | API |
| TC-ISSUE-011 | P1 | **When** สร้างโดยไม่มี title **Then** 400 `VALIDATION_FAILED` | API |
| TC-ISSUE-012 | P1 | **When** type = `EPIC` **Then** 400 | API |
| TC-ISSUE-013 | P1 | **When** GET key ที่ไม่มี **Then** 404 `NOT_FOUND` | API |
| TC-ISSUE-014 | P2 | **When** PATCH body `{}` **Then** 400 (`minProperties: 1`) | API |
| TC-ISSUE-015 | P2 | **When** สร้าง issue ใน project ที่ไม่มี **Then** 404 | API |
| TC-ISSUE-016 | P2 | **Given** project ใหม่ 2 ตัว **Then** issue แรกของแต่ละ project เป็น `-1` (running number แยก project) | API |
| TC-ISSUE-017 | P1 | **Given** หน้า issue detail **When** แก้ title/assignee ในฟอร์ม **Then** board อัปเดตตาม | E2E (P2) |
| TC-ISSUE-018 | P1 | **When** สร้างหรือ PATCH ด้วย title ที่มีแต่ช่องว่าง **Then** 400 `VALIDATION_FAILED` | API |
| TC-ISSUE-019 | P2 | **When** title มีช่องว่างหน้า/หลัง **Then** เก็บแบบตัดช่องว่างแล้ว | API |
| TC-ISSUE-021 | P1 | **Given** หน้า board **When** สร้าง issue จาก modal แล้วเปิด drawer เขียน comment **Then** เห็นการ์ดใหม่และ comment ทันที | E2E (`app/app.spec.ts`) |
| TC-ISSUE-020 | P1 | **When** list โดยไม่ filter **Then** เรียงตามคอลัมน์ (TODO → DONE) แล้วตาม `position` น้อย→มาก (ตาม spec) | API |

### 7.4 Board move — drag & drop + ordering (`e2e/api/board.spec.ts`)

กติกา: คอลัมน์ = filter `status`, ลำดับ = `position` น้อย→มาก; client ส่ง `afterKey` (ใบข้างบน) / `beforeKey` (ใบข้างล่าง), `null` = ต้น/ท้ายคอลัมน์; server คำนวณ position เอง

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-BOARD-001 | P0 | **Given** issue ใน TODO **When** move `{status: IN_PROGRESS}` **Then** 200 และ GET เห็น status ใหม่ | API |
| TC-BOARD-002 | P0 | **Given** คอลัมน์ IN_REVIEW = [A, B] **When** move C `afterKey=A, beforeKey=B` **Then** `pos(A) < pos(C) < pos(B)` และคอลัมน์ = [A, C, B] | API |
| TC-BOARD-003 | P0 | **Given** [A, B] **When** move C `afterKey=null, beforeKey=A` **Then** [C, A, B] | API |
| TC-BOARD-004 | P1 | **Given** [A, B] **When** move C `afterKey=B, beforeKey=null` **Then** [A, B, C] | API |
| TC-BOARD-005 | P1 | **Given** [A, B, C] **When** ลาก C ขึ้นบนสุด แล้วลากกลับไปกลาง **Then** [C, A, B] → [A, C, B] (reorder ในคอลัมน์เดียวกัน) | API |
| TC-BOARD-006 | P1 | **When** status = `BLOCKED` **Then** 400 | API |
| TC-BOARD-007 | P1 | **When** move issue ที่ไม่มี **Then** 404 | API |
| TC-BOARD-008 | P2 | **When** `afterKey` เป็น issue ที่ไม่ได้อยู่ในคอลัมน์ปลายทาง **Then** 400/404 + Error body | API |
| TC-BOARD-009 | P2 | **When** แทรกที่ช่องเดิม (หลัง A) 25 ครั้งติด **Then** ลำดับยังถูกต้อง ไม่มี position ชน | API |
| TC-BOARD-010 | P0 | **Given** board 4 คอลัมน์ **When** ลากการ์ดด้วย mouse ข้ามคอลัมน์ **Then** การ์ดอยู่ตำแหน่งใหม่ทันที (optimistic) และหลัง reload ยังอยู่ | E2E (`app/app.spec.ts`) |
| TC-BOARD-011 | P1 | **Given** API move ตอบ error **When** ลากการ์ด **Then** การ์ดเด้งกลับที่เดิม + แสดง toast | E2E (P2) / FE-unit (MSW) |
| TC-BOARD-012 | P1 | **When** ใช้ keyboard (Space → ลูกศร → Space) ย้ายการ์ด **Then** ย้ายได้ + screen reader announce | Manual / E2E (P2) |
| TC-BOARD-013 | P1 | **Given** story ของ Board/Card ใน Storybook **Then** render ทุก state ไม่มี error | UI-SB |

### 7.5 Comments (`e2e/api/comments.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-COMMENT-001 | P0 | **Given** issue **When** `POST /issues/{key}/comments` body Markdown (ไทย) **Then** 201 `Comment`, `issueKey` ตรง, `author` = ผู้ส่ง | API |
| TC-COMMENT-002 | P0 | **Given** 3 comment **When** list **Then** เรียงเก่า → ใหม่ | API |
| TC-COMMENT-003 | P1 | **Then** comment ของ issue A ไม่โผล่ใน issue B | API |
| TC-COMMENT-004 | P1 | **When** body ว่าง **Then** 400 | API |
| TC-COMMENT-005 | P2 | **When** body > 5000 ตัวอักษร **Then** 400 | API |
| TC-COMMENT-006 | P2 | **When** comment ใน issue ที่ไม่มี **Then** 404 | API |
| TC-COMMENT-007 | P2 | **When** body มีแต่ช่องว่าง/ขึ้นบรรทัด **Then** 400 `VALIDATION_FAILED` | API |

### 7.6 Docs — space & page tree (`e2e/api/docs.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-SPACE-001 | P0 | **When** `POST /spaces` {key, name} **Then** 201 `Space` | API |
| TC-SPACE-002 | P0 | **When** `GET /spaces/{key}` **Then** 200 | API |
| TC-SPACE-003 | P1 | **When** `GET /spaces` **Then** มี space ที่สร้าง | API |
| TC-SPACE-004 | P1 | **When** key ซ้ำ **Then** 409 | API |
| TC-SPACE-005 | P1 | **When** space ที่ไม่มี **Then** 404 | API |
| TC-SPACE-006 | P2 | **Given** space ใหม่ **Then** page tree = `[]` | API |
| TC-PAGE-001 | P0 | **When** สร้างหน้า `parentId: null` **Then** 201 `Page`, `parentId` = null, author = ผู้สร้าง | API |
| TC-PAGE-002 | P0 | **Given** Root → Child → Grandchild + Root2 **When** `GET /spaces/{key}/pages` **Then** top level มีแค่ Root, Root2; Child อยู่ใน `Root.children`, Grandchild อยู่ใน `Child.children`, leaf มี `children: []` | API |
| TC-PAGE-003 | P0 | **When** get page **Then** `contentMd` ตรงทุกตัวอักษร (heading, list, code block) | API |
| TC-PAGE-004 | P1 | **When** PATCH title + contentMd **Then** 200 ค่าใหม่, `updatedAt` ไม่ถอยหลัง | API |
| TC-PAGE-005 | P1 | **When** PATCH `parentId` จาก A → B แล้ว → null **Then** tree ย้ายตาม | API |
| TC-PAGE-006 | P1 | **When** ลบหน้าแม่ **Then** 204, ลูกถูกลบด้วย (GET ลูก = 404, หายจาก tree) | API |
| TC-PAGE-007 | P1 | **When** สร้างหน้าไม่มี title **Then** 400 | API |
| TC-PAGE-008 | P1 | **When** GET page id ที่ไม่มี **Then** 404 | API |
| TC-PAGE-009 | P2 | **When** ย้ายหน้าไปเป็นลูกของลูกตัวเอง (cycle) **Then** 400 | API |
| TC-PAGE-010 | P1 | **Given** sidebar page tree **When** expand/collapse + คลิกหน้า **Then** แสดงเนื้อหา Markdown render ถูก | E2E (P2) / UI-SB |

### 7.7 Issue ↔ Page links — สองทาง (`e2e/api/links.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-LINK-001 | P0 | **Given** issue + page **When** `POST /issues/{key}/links {pageId}` **Then** 201 `PageSummary` (id, spaceKey, title) | API |
| TC-LINK-002 | P0 | **Given** issue ลิงก์ 2 page **When** `GET /issues/{key}/links` **Then** ได้ทั้ง 2 | API |
| TC-LINK-003 | P0 | **Given** page ถูกลิงก์จาก 2 issue **When** `GET /pages/{id}/linked-issues` **Then** ได้ทั้ง 2 (`IssueSummary[]`) — ทิศกลับ | API |
| TC-LINK-004 | P1 | **When** ลิงก์ซ้ำคู่เดิม **Then** 409 | API |
| TC-LINK-005 | P0 | **When** `DELETE /issues/{key}/links/{pageId}` **Then** 204 และหายจากทั้ง 2 ทิศ | API |
| TC-LINK-006 | P1 | **When** ลิงก์ไป pageId ที่ไม่มี **Then** 404 | API |
| TC-LINK-007 | P2 | **When** ยกเลิกลิงก์ที่ไม่มี **Then** 404 | API |
| TC-LINK-008 | P2 | **Then** `Issue.linkedPageCount` = จำนวนลิงก์ | API |
| TC-LINK-009 | P2 | **When** ลบ page ที่ถูกลิงก์ **Then** หายจาก `/issues/{key}/links` (ไม่มี orphan ข้าม service) | API |
| TC-LINK-010 | P2 | **When** ลบ issue ที่ถูกลิงก์ **Then** หายจาก `/pages/{id}/linked-issues` | API |
| TC-LINK-011 | P1 | **Given** หน้า issue **When** กด “Link page” เลือกหน้า **Then** เห็นใน panel ของ issue และเปิดหน้า doc เห็น issue ใน “Linked issues” | E2E (P2) |

### 7.8 `TB-12` mention auto-link

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-MENTION-001 | P0 | **Given** contentMd มี `KEY-12` **When** save + get page **Then** API เก็บข้อความตามเดิม (ไม่แปลงฝั่ง server) | API (`docs.spec.ts`) |
| TC-MENTION-002 | P0 | **Given** Markdown `งานอยู่ที่ TB-12` **When** render **Then** `TB-12` เป็น `<a href="/issues/TB-12">` | FE-unit + UI-SB (story ของ Markdown renderer) |
| TC-MENTION-003 | P1 | **Given** `` `TB-12` `` ใน inline code / code block, หรือ URL ที่มี `TB-12` **Then** ไม่แปลงเป็นลิงก์ | FE-unit |
| TC-MENTION-004 | P1 | **Given** `ATB-12`, `TB-12a`, `tb-12` **Then** ไม่แปลง (word boundary + uppercase เท่านั้น) | FE-unit |
| TC-MENTION-005 | P2 | **Given** key ที่ไม่มีจริง (`TB-99999`) **Then** render ตามที่ตกลง (ลิงก์ + 404 page หรือ text ธรรมดา) — *ต้องตัดสินใจ* | FE-unit |
| TC-MENTION-006 | P2 | **Given** mention ใน issue description / comment **Then** auto-link เหมือนกัน | FE-unit |
| TC-MENTION-007 | P1 | **When** คลิก mention ในหน้า doc **Then** ไปหน้า issue นั้น | E2E (`app/app.spec.ts`) |

### 7.9 Search (`e2e/api/search.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-SEARCH-001 | P0 | **Given** issue title มี token **When** `GET /search?q=token` **Then** อยู่ใน `issues[]` | API |
| TC-SEARCH-002 | P0 | **Given** page title มี token **Then** อยู่ใน `pages[]` | API |
| TC-SEARCH-003 | P0 | **Given** issue + page มี token เดียวกัน **Then** response เดียวได้ทั้งสอง (และไม่มีอย่างอื่น) | API |
| TC-SEARCH-004 | P1 | **When** ไม่มีอะไร match **Then** `{issues: [], pages: []}` | API |
| TC-SEARCH-005 | P1 | **When** ไม่ส่ง `q` **Then** 400 | API |
| TC-SEARCH-006 | P2 | **When** q = issue key **Then** เจอ issue นั้น | API |
| TC-SEARCH-007 | P2 | **When** q ตัวพิมพ์ใหญ่ ส่วน contentMd มีตัวเล็ก **Then** เจอ (case-insensitive, ค้นใน content) | API |
| TC-SEARCH-008 | P2 | **When** q ภาษาไทย **Then** เจอ issue/page ภาษาไทย | Manual → API (backlog) |
| TC-SEARCH-009 | P1 | **When** พิมพ์ใน search box **Then** แสดงผลแยก Issues / Pages และคลิกไปได้ | E2E (`app/app.spec.ts`) |
| TC-SEARCH-010 | P2 | **When** `q` มีแต่ช่องว่าง **Then** 400 `VALIDATION_FAILED` | API |

### 7.10 Error format & 401 handling (`e2e/api/errors.spec.ts` + ทุกไฟล์)

ทุก error response ถูก validate กับ `#/components/schemas/Error` ผ่าน helper `expectError()` (status + `error.code` + message ไม่ว่าง + `Content-Type: application/json`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-ERR-001 | P0 | **When** 404 **Then** body มี key เดียวคือ `error` และ `code = NOT_FOUND` | API |
| TC-ERR-002 | P0 | **When** input ผิด **Then** 400 `VALIDATION_FAILED` | API |
| TC-ERR-003 | P0 | **When** ไม่มี token **Then** 401 `UNAUTHENTICATED` | API |
| TC-ERR-004 | P1 | **When** ซ้ำ **Then** 409 `ALREADY_EXISTS` | API |
| TC-ERR-005 | P1 | **When** JSON body พัง **Then** 400 (ไม่ใช่ 500) | API |
| TC-ERR-006 | P2 | **When** path param ผิดรูป (`/issues/not-a-key`, `/pages/not-a-uuid`) **Then** 400/404 + Error body | API |
| TC-ERR-007 | P1 | **Then** `error.code` อยู่ใน enum ที่ตกลงเสมอ | API |
| TC-ERR-008 | P0 | **Given** FE login อยู่ **When** API ใดตอบ 401 **Then** ล้าง token, redirect ไป `/login?next=<path>` ครั้งเดียว (ไม่ loop), หลัง login กลับหน้าเดิม | E2E (`app/app.spec.ts`) |
| TC-ERR-009 | P1 | **When** API ตอบ 500/network error **Then** FE แสดง error state ที่ retry ได้ ไม่ crash | UI-SB (error-state stories) / E2E (P2) |
| TC-ERR-010 | P2 | **When** ใช้ method ที่ไม่มีใน spec (`PUT /projects`) **Then** 404 `NOT_FOUND` (ไม่ใช่ 405) | API |

### 7.11 Contract self-check (`e2e/api/contract.spec.ts`) และ Storybook smoke (`e2e/ui/storybook.spec.ts`)

| ID | P | Given / When / Then | Automated |
|---|---|---|---|
| TC-CONTRACT-001 | P0 | **Given** `openapi.yaml` **Then** ทุก component schema compile ด้วย Ajv ได้ | API (offline) |
| TC-CONTRACT-002 | P0 | **Then** `nullable: true` (OAS 3.0) ถูกแปลงถูก — `null` ผ่าน, type ผิดไม่ผ่าน (รวม `assignee` ที่เป็น User หรือ null) | API (offline) |
| TC-CONTRACT-003 | P1 | **Then** ทุก response `example` ใน spec ตรงกับ schema ของตัวเอง | API (offline) |
| TC-CONTRACT-004 | P1 | **Then** ทุก operation ประกาศ 401 (ถ้าต้อง login), 400 (ถ้ามี input), 404 (ถ้ามี path param) | API (offline) |
| TC-UI-001 | P1 | **Given** Storybook รันอยู่ **Then** `/index.json` มีอย่างน้อย 1 story (ถ้าไม่รัน → skip) | UI-SB |
| TC-UI-002 | P0 | **When** เปิด `/iframe.html?id=<id>` ของ **ทุก** story **Then** ไม่มี `pageerror`, `console.error`, หรือ Storybook error overlay | UI-SB |

## 8. Findings จากรอบแรก (2026-10-18, vs `services/mock-api`)

ผล: API 98/98 ผ่าน (2 รันติด), UI 2 skipped (Storybook ยังไม่รัน) — รายละเอียดใน `e2e/README.md`

**แก้แล้ว (2026-10-23)** — ข้อ 1–6 ตัดสินใจตาม STATUS.md และแก้ใน spec, mock, test แล้ว
1. ~~ไม่ประกาศ 401~~ → ทุก endpoint ที่ต้อง login ประกาศ 401; คุมด้วย `TC-CONTRACT-004`
2. ~~404/400 ที่ spec ไม่ประกาศ~~ → ประกาศครบ, ลบป้าย `[spec gap]` ออกจาก TC-ISSUE-015, TC-COMMENT-006
3. ~~405 ใช้ code `NOT_FOUND`~~ → method ที่ไม่มีใน spec ตอบ 404 `NOT_FOUND` (`TC-ERR-010`)
4. ~~Whitespace-only title ผ่าน~~ → spec ใส่ `pattern: '\S'`, server trim ก่อนเก็บ (`TC-ISSUE-018/019`, `TC-COMMENT-007`)
5. ~~`/search?q=%20` คืนทุกอย่าง~~ → 400 `VALIDATION_FAILED` (`TC-SEARCH-010`)
6. ~~ไม่ระบุลำดับ `listIssues`~~ → spec ระบุ คอลัมน์ แล้ว `position` น้อย→มาก; test ไม่ sort เองแล้ว (`TC-ISSUE-020`)

ยังเปิดอยู่:
7. **Unknown field ถูกเงียบ ๆ ignore** (ไม่มี `additionalProperties: false`) — ยอมรับได้ แต่ควรระบุให้ gateway จริงทำเหมือนกัน
8. **Shared mock ถูก `POST /__mock/reset` / restart ระหว่างรัน** ทำให้ 1 test fail แบบสุ่ม (`user for this token no longer exists`) → CI ต้องใช้ instance แยก

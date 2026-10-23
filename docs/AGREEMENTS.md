# ข้อตกลงก่อนเริ่มงาน (Phase 0)

> เอกสารนี้ทุก role ต้องอ่านก่อนเริ่ม ถ้าจะเปลี่ยนข้อตกลง ต้องแก้ที่นี่ + แจ้งทุก role

## 1. Scope MVP
- Auth: register / login (JWT)
- Project (มี key เช่น `TB`), Issue (`TB-12`: TASK/BUG/STORY, status, priority, assignee, labels, comments)
- Kanban board 4 คอลัมน์ `TODO / IN_PROGRESS / IN_REVIEW / DONE` + drag & drop
- Docs: Space (`ENG`) → Page tree (nested) เนื้อหาเป็น Markdown
- Link สองทาง Issue ↔ Page และข้อความ `TB-12` ใน Markdown render เป็นลิงก์อัตโนมัติ
- Search รวม issue + page
- **ไม่ทำ (เฟส 2):** sprint, custom workflow, realtime, version history, notifications

## 2. Architecture (เป้าหมายตอนทำของจริง)
```
web (React) --REST--> api-gateway (Go Fiber) --gRPC--> auth-service    (Go + GORM)
                                             --gRPC--> tracker-service (Go + GORM)  ← เจ้าของ issue_page_links
                                             --gRPC--> docs-service    (Python grpcio + SQLAlchemy)
Postgres 1 instance / 1 database ต่อ service — ห้ามแชร์ตารางข้าม service
```

**Production (Phase 3, ตกลง 2026-10-23):** เว็บอยู่บน Vercel, gateway + 3 service อยู่ใน container เดียวบน Render,
Postgres ใช้ Supabase โดยแยก **1 schema ต่อ service** (`tb_auth`, `tb_tracker`, `tb_docs`) แทน 1 database ต่อ service
กติกาห้ามแชร์ตารางข้าม service ยังเหมือนเดิม รายละเอียดอยู่ที่ `deploy/README.md`

**Login:** auth-service มี 2 โหมด (`AUTH_MODE`)
- `password`: register / login ออก JWT เอง ใช้บนเครื่องและตอนรันเทสต์
- `supabase`: login ด้วย Google ผ่าน Supabase Auth ใช้บน production
  - `ALLOWED_EMAILS=*` (ตกลง 2026-10-24): ทุกบัญชี Google sign in ได้ และเห็นข้อมูลทั้งหมด เพราะยังไม่มีสิทธิ์ราย project
  - ถ้าตั้งเป็นรายชื่ออีเมล / `@domain` จะให้ผ่านเฉพาะในรายชื่อ ที่เหลือได้ 403
  - register / login ด้วยรหัสผ่านตอบ 403

## 3. Contracts = Single Source of Truth
| Contract | ไฟล์ | ใครใช้ |
|---|---|---|
| FE ↔ Gateway (REST) | `api/openapi.yaml` | FE (gen types + MSW), BE (mock/gateway), QA (API tests) |
| Gateway ↔ Services (gRPC) | `proto/**/*.proto` | BE |

กติกากลาง: UUID, ISO-8601 UTC, JSON camelCase, pagination `?page=&pageSize=`,
error `{ "error": { "code", "message" } }` (codes: VALIDATION_FAILED, UNAUTHENTICATED, PERMISSION_DENIED, NOT_FOUND, ALREADY_EXISTS, INTERNAL)

gRPC → HTTP: InvalidArgument→400, Unauthenticated→401, PermissionDenied→403, NotFound→404, AlreadyExists→409, อื่นๆ→500

Gateway: path หรือ method ที่ไม่มีใน spec → 404 `NOT_FOUND` (ไม่ใช้ 405) · ข้อความที่บังคับกรอกต้องไม่ว่าง (`pattern: '\S'`) และ trim ก่อนส่งต่อให้ service

## 4. Ports
| สิ่งที่รัน | Port |
|---|---|
| web (Vite) | 5173 |
| Storybook | 6006 |
| Mock API (Prism) | 4010 |
| Swagger UI | 8081 |
| Gateway จริง | 8080 |
| gRPC auth / tracker / docs | 50051 / 50052 / 50053 |
| Postgres | 5432 |

## 5. ลำดับงาน
1. **Phase 0** — ข้อตกลงนี้ + `api/openapi.yaml` ✅
2. **Phase 1 (ขนาน)** — FE: Design system (DESIGN.md + Storybook) / BE: Mock API + Swagger + proto draft / QA: Test plan + API contract tests กับ mock
3. **Phase 2** — BE ทำ service จริง (Go/Python + gRPC), FE ต่อ API จริง, QA รัน E2E

## 6. Definition of Done
ตรง contract · มี test · lint ผ่าน · มี story (สำหรับ component FE) · QA test ผ่าน · README อัปเดต

## 7. Git
Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) · branch ต่อ feature `feat/<scope>-<desc>`

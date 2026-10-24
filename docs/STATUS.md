# Project Status — Tracking Board

> อัปเดตล่าสุด: 2026-10-23

## ภาพรวม

| เฟส | สถานะ |
|---|---|
| Phase 0 — ข้อตกลง + Contract | ✅ เสร็จ |
| Phase 1 — FE / BE / QA (ทำพร้อมกัน, ใช้ mock) | ✅ เสร็จ |
| รันทั้งระบบด้วย `make up` (docker compose) | ✅ เสร็จ (2026-10-23) |
| ตัดสินใจเรื่อง spec 6 ข้อ (ดูหัวข้อ "ข้อที่ตัดสินใจแล้ว") | ✅ เสร็จ (2026-10-23) |
| Phase 2a — หน้าเว็บดึง/บันทึกข้อมูลผ่าน API (ตอนนี้ต่อ mock :4010) | ✅ เสร็จ (2026-10-23) |
| Phase 2b — Service จริง: gateway (Go Fiber) + auth / tracker (Go) + docs (Python) + Postgres | ✅ เสร็จ (2026-10-23) |
| Phase 2c — สลับเว็บและ test ไปใช้ gateway จริง (:8080), E2E ผ่าน → **MVP พร้อมใช้** | ✅ เสร็จ (2026-10-23) — **MVP พร้อมใช้** |
| ส่วนที่ 2 — บทเรียน FE / BE (สอนจากโค้ด MVP ที่เสร็จแล้ว) | ⬜ หลัง MVP |
| Phase 3 — deploy ใช้เองจากที่ไหนก็ได้: Vercel + Render + Supabase, login ด้วย Gmail (แผนด้านล่าง) | 🟡 กำลังทำ (เริ่ม 2026-10-23) |

## Phase 0 — Contract

| ไฟล์ | เนื้อหา |
|---|---|
| `docs/AGREEMENTS.md` | scope MVP, สถาปัตยกรรม, พอร์ต, Definition of Done, กติกา git |
| `api/openapi.yaml` | REST API ทั้งหมดระหว่าง FE กับ Gateway (single source of truth) |

## Phase 1 — ผลงานแต่ละ Role

### Frontend — `web/`
- **ส่งแล้ว:**
  - `DESIGN.md` แนว Miro: tokens, typography, กติกา drag & drop, การ render mention
  - Storybook ประมาณ 30 component และ 5 หน้าจอ (Login, Board, Issue, Docs, Search) รองรับ light/dark และมี a11y addon
- **Stack:** Vite, React 19, TS strict, Tailwind v4, Storybook 10, dnd-kit, react-markdown
- **ผลทดสอบ:**
  - `tsc` ผ่าน
  - `build` และ `build-storybook` ผ่าน
  - เปิดทุก story ได้ครบ 207 รายการ
  - ตรวจ contrast ผ่านแล้ว
- **Phase 2a (2026-10-23):** หน้าเว็บต่อ API แล้วทุกหน้า
  - login / register / logout, token หมดอายุ (401) → กลับหน้า login แล้วกลับมาหน้าเดิม
  - board: โหลด issue, ลากการ์ด (optimistic + ย้อนกลับถ้า error), สร้าง issue, drawer แก้ field / comment / ยกเลิกลิงก์
  - หน้า issue, หน้า docs (page tree, อ่าน, แก้ไข, สร้างหน้าใหม่), ค้นหา (⌘K และ /search)
  - ลิงก์ issue ↔ หน้า Docs ได้ทั้งสองฝั่ง (ปุ่ม Link → ค้นหาแล้วเลือก) และยกเลิกลิงก์ได้
  - สร้าง project / space จากปุ่ม + ใน sidebar (เดา key จากชื่อ เช่น "Tracking Board" → TB)
  - Responsive: มือถือ (<768px) เมนูซ้ายเลื่อนออกมาจากปุ่มบน top bar, board เลื่อนซ้าย-ขวาทีละคอลัมน์ (ลากการ์ดด้วยการกดค้าง), drawer ของ issue เปิดเต็มจอ, page tree ของ Docs อยู่ในปุ่มด้านบน
  - ชื่อ issue ยาว / URL / คำไม่มีช่องว่างตัดบรรทัดในการ์ด, label ยาวแสดง …; หัวข้อ issue ค้างด้านบนตอนเลื่อน, drawer จัด field 2 คอลัมน์
  - โครง: `src/api/` (client จาก spec + react-query hooks) → `src/pages/` (ดึงข้อมูล) → `src/screens/` (UI อย่างเดียว ใช้ใน Storybook ด้วย fixtures)
- **ยังไม่ทำ:**
  - ยังไม่มี ESLint และ unit test
  - `npm run dev:msw` (MSW) ตอบได้แค่อ่านข้อมูล, login และย้ายการ์ด — งานเขียนอื่นให้ใช้ mock API

### Backend — `services/mock-api/`, `proto/`
- **ส่งแล้ว:**
  - Mock API (Express) ที่ตรวจ request/response กับ spec, มี JWT จริง และข้อมูลตัวอย่าง (seed)
  - Swagger UI
  - proto ของ `auth.v1`, `tracker.v1`, `docs.v1`
  - `docker-compose.yml`, `Makefile`
- **ผลทดสอบ:**
  - `make smoke` ผ่าน
  - `buf lint` และ `buf build` ผ่าน
  - `buf generate` ได้ทั้ง Go และ Python
- **ยังไม่ทำ:**
  - service จริงทั้งหมด
  - postgres ใน compose ยังเป็นแค่โครง
  - Swagger "Try it out" ยังไม่ได้ลองกดในเบราว์เซอร์จริง

### QA — `e2e/`, `docs/qa/`
- **ส่งแล้ว:**
  - `TEST_PLAN.md` มี test case แบบ Given/When/Then ประมาณ 130 ข้อ แต่ละข้อมี ID และ priority P0–P2
  - Playwright 100 test: API 98 ข้อ (ตรวจ schema กับ spec), Storybook smoke 2 ข้อ
- **ผลทดสอบ:**
  - API ผ่าน 98/98
  - UI ผ่าน 2/2 รันกับ Storybook build ของ FE
- **Phase 2a:** เพิ่ม project `app` (`e2e/app/app.spec.ts`) — E2E ผ่านเว็บจริง 11 ข้อ: login, 401 redirect, drag & drop, สร้าง issue + comment, mention ในหน้า doc, ค้นหา, ลิงก์จากทั้งสองฝั่ง, สร้าง project, จอมือถือ 2 ข้อ
- ผลล่าสุด (2026-10-23, กับ `make up`): ทั้งชุด 118/118 ผ่าน (API 105, E2E 11, Storybook 2)
- **ข้อควรรู้:** ถ้ารัน test ใน CI ต้องใช้ mock แยกของตัวเอง เพราะถ้ามีคน reset mock ที่ใช้ร่วมกันกลางทาง test จะตกแบบสุ่ม

### Backend จริง (Phase 2b) — `services/`
- **ส่งแล้ว (2026-10-23):**
  - `api-gateway` (Go + Fiber v3, :8080): REST ตาม `api/openapi.yaml` → gRPC
    - ลำดับการตรวจ: เช็ก token ก่อน → ตรวจ request กับ spec ด้วย kin-openapi (path/method ที่ไม่มี → 404, input ผิด → 400, query ที่ spec ไม่มี → 400) → handler
    - ตัดช่องว่างหน้าหลังของ title / name / displayName / body / q, แปลง gRPC error เป็น HTTP ตาม AGREEMENTS
    - เติมข้อมูล user ด้วยการเรียก `ListUsers` ครั้งเดียวต่อ request, search ยิง tracker + docs พร้อมกัน
  - `auth-service` (Go + GORM): bcrypt, JWT HS256 อายุ 24 ชม., email ไม่สนตัวพิมพ์เล็กใหญ่
  - `tracker-service` (Go + GORM): project / issue / comment / `issue_page_links`
    - เลข issue ไม่ซ้ำแม้มีคนสร้างพร้อมกัน (lock แถว project), ลบ issue แล้วเลขไม่ถูกใช้ซ้ำ
    - position แบบเศษส่วน; ถ้าลากลงช่องเดิมจนตัวเลขห่างกันไม่พอ จะเรียงเลขใหม่ทั้งคอลัมน์ให้อัตโนมัติ
  - `docs-service` (Python 3.13 + grpcio + SQLAlchemy 2): space / page tree, ลบหน้าแล้วลบหน้าลูกทั้งหมดด้วย
  - Postgres 17: 1 instance, 1 database ต่อ service (`deploy/postgres/init.sql`)
  - `SEED_DEMO_DATA=true` ใส่ข้อมูลตัวอย่างชุดเดียวกับ mock (id เดียวกัน) ตอนตารางยังว่าง
  - `make gen`, `make test-go`, `make test-docs`; รายละเอียดอยู่ที่ `services/README.md`
- **ผลทดสอบ (2026-10-23):**
  - Go: `go vet` ผ่าน, unit test ผ่านทั้ง gateway (ใช้ gRPC service ปลอม), auth และ tracker (กับ Postgres จริง)
  - docs-service: pytest 9/9 (SQLite ใน memory), `ruff` ผ่าน
  - Playwright API ชุดเดิมกับ gateway จริง (:8080): **105/105** สองรอบ (รอบที่สองหลัง restart service บนข้อมูลเดิม)
  - E2E หน้าเว็บ (`--project=app`) โดยเปิด Vite ชี้ไป `:8080` ชั่วคราว: **11/11**
  - `make smoke` (ตั้ง `MOCK_URL=http://localhost:8080`) ผ่าน
- **ยังไม่ทำ / ข้อควรรู้:**
  - ยังไม่มี migration แบบมีเวอร์ชัน ตอนนี้ใช้ AutoMigrate / `create_all` ซึ่งเพิ่มตารางและคอลัมน์ได้ แต่เปลี่ยนชนิดหรือลบคอลัมน์ไม่ได้
  - `gen/` ไม่ได้ commit; Dockerfile รัน `buf generate` เองและต้องต่อเน็ตไปที่ buf.build
  - service ภายในคุยกันแบบไม่เข้ารหัส (insecure gRPC) และพอร์ต gRPC / Postgres เปิดออกมาที่ host เพื่อสะดวกตอน dev
  - `make smoke` กับ gateway จริงไม่ reset ข้อมูล (`/__mock/reset` มีแค่ใน mock) เลยมี TB-13 ค้างอยู่ใน DB
  - E2E หน้าเว็บต้องเปิดเว็บที่ origin ที่อยู่ใน `CORS_ORIGINS` ของ gateway (ค่าเริ่มต้น :5173 / :6006 / :8081)

### Phase 2c — ใช้ backend จริงเป็นค่าเริ่มต้น (2026-10-23)
- **เปลี่ยน:**
  - `make up` เปิดทั้งระบบ: Postgres + 3 service + gateway :8080 + Swagger UI + web + Storybook
  - เว็บ (`VITE_API_BASE_URL`) และเทสต์ (`API_BASE_URL`) ชี้ไปที่ `http://localhost:8080/api/v1` เป็นค่าเริ่มต้น; ใน `api/openapi.yaml` ย้าย gateway ขึ้นเป็น server แรก (Swagger "Try it out")
  - Makefile: `make up-api` (backend + Swagger), `make test` (Playwright ทั้งชุด), `make test-api`
  - mock ยังเก็บไว้แต่ไม่เปิดเอง: `make mock` (Node) หรือ `make up-mock` (Docker, เว็บชี้ไป :4010) ใช้ตอนทำ FE โดยไม่อยากเปิด Docker ทั้งชุด หรือเอาไว้เทียบพฤติกรรมกับ gateway
- **ผลทดสอบ (เริ่มจาก DB ว่าง → `make up` → `make test` โดยไม่ตั้ง env ใดๆ):** **118/118** (API 105, E2E หน้าเว็บ 11, Storybook 2)
  - โหมด mock (`make up-mock`, `API_BASE_URL=…:4010`): API + E2E 116/116
  - `web`: `check:api` และ `tsc` ผ่าน; `e2e`: `tsc` ผ่าน
- **ข้อควรรู้:** สลับระหว่าง `make up` กับ `make up-mock` ให้ `make down` ก่อน ไม่งั้น container ของอีกโหมดจะค้างอยู่

## วิธีรัน

รันทุกอย่างพร้อมกันด้วย Docker:

```bash
make up      # Gateway :8080, Swagger UI :8081, Web :5173, Storybook :6006 (+ Postgres และ 3 service)
make test    # Playwright ทั้งชุดกับระบบที่รันอยู่
make down    # หยุดทั้งหมด (ข้อมูลใน Postgres ยังอยู่)
```

อื่นๆ:

```bash
make up-api                    # เฉพาะ backend + Swagger UI
make test-go / make test-docs  # unit test ของ service
make mock                      # Mock API → http://localhost:4010/api/v1 (Node, ไม่ใช้ Docker)
make up-mock                   # mock + เว็บที่ชี้ไป mock (Docker)
make smoke                     # ทดสอบ flow หลักกับ mock
```

Login ทดสอบ: `duck@example.com` / `password123`

## ข้อที่ตัดสินใจแล้ว (2026-10-23)

ใช้ข้อเสนอเดิมทั้ง 6 ข้อ

| # | เรื่อง | ที่ตกลง | แก้ที่ไหน |
|---|---|---|---|
| 1 | spec ไม่ได้ประกาศ 401/400/404 ให้ครบ | ทุก operation ประกาศ 401 (ถ้าต้อง login), 400 (ถ้ามี input), 404 (ถ้ามี path param) | spec + `TC-CONTRACT-004` คุมไว้ |
| 2 | title หรือคำค้นที่มีแต่ช่องว่าง | `pattern: '\S'` ทุกช่องที่บังคับกรอก → 400; server ตัดช่องว่างหน้าหลังก่อนเก็บ | spec, mock (`server.js`), test ใหม่ 4 ข้อ |
| 3 | ลำดับ issue | `listIssues` และ `linked-issues` เรียงตามคอลัมน์ แล้ว `position` น้อย→มาก | spec, test ไม่ sort เองแล้ว |
| 4 | `PUT /projects` ตอบ 405 + `NOT_FOUND` | path หรือ method ที่ไม่มี → 404 `NOT_FOUND` | spec, AGREEMENTS, mock (`errors.js`) |
| 5 | schema `assignee` ผิดกติกา OpenAPI | `anyOf: [User, { type: object, nullable: true, enum: [null] }]`; ลบโค้ดที่เขียนอ้อมไว้ใน mock และ QA ออกแล้ว; lint กลับมาเป็นระดับ error | spec, `redocly.yaml`, `mock-api/src/openapi.js`, `e2e/lib/schema.ts` |
| 6 | FE เขียน type เอง | generate ด้วย `openapi-typescript` (`npm run gen:api` / `check:api`) + มี MSW handlers (`npm run dev:msw`) | `web/` |

ผลทดสอบหลังแก้:
- `redocly lint` ไม่มี error (เหลือ warning เดิม 10 ข้อเรื่อง tag description และ license)
- `make smoke` ผ่าน
- Playwright API ผ่าน 105/105 สองรอบติดกัน
  - รอบแรกสุด TC-BOARD-009 หมดเวลาครั้งเดียวตอน mock เพิ่งเริ่ม (ใช้เวลา 43 วินาที เทียบกับปกติ 3.5 วินาที) ถ้ารันเดี่ยวก็ผ่าน
- UI ผ่าน 2/2
- ฝั่ง web: `tsc`, `build` และ `build-storybook` ผ่าน
- `dev:msw` ลองเปิดในเบราว์เซอร์แล้ว handler ตอบถูก

หมายเหตุ: `openapi-typescript` 7 ยังประกาศ peer เป็น TypeScript 5 (web ใช้ 6) เลยเรียกผ่าน `npx` แบบล็อกเวอร์ชัน `7.13.0` แทนการใส่ใน devDependencies

## ขั้นต่อไป

1. **ส่วนที่ 2 — บทเรียน** (MVP เสร็จแล้ว เริ่มได้เลย)
   - **FE:** React + TS + Tailwind + react-query อิงจากโค้ดใน `web/`
   - **BE:** Go Fiber gateway, gRPC microservice (Go + GORM) และ Python docs-service อิงจากโค้ด Phase 2b
2. **Phase 3** — deploy (แผนด้านล่าง)

## แผน Phase 3 — deploy (ตกลง 2026-10-23)

**เป้าหมาย:** ใช้เองคนเดียว เปิดได้จากทุกที่ผ่าน HTTPS สาธารณะ, login ด้วย Gmail, ใช้ free tier ทั้งหมด

| ส่วน | ไปอยู่ที่ | หมายเหตุ |
|---|---|---|
| เว็บ | Vercel (Hobby) | `vercel.json` ส่ง `/api/*` ต่อไปที่ Render → domain เดียวกัน ไม่ต้องใช้ CORS |
| gateway + auth / tracker / docs | Render (free web service) | รวม 4 process ไว้ใน container เดียว คุยกันทาง localhost; ว่าง 15 นาทีจะหลับ, ปลุกครั้งแรกรอ ~1 นาที (ตกลงว่ารับได้) |
| Postgres | Supabase (free, project ใหม่ = ตัวที่ 2) | 1 schema ต่อ service (`tb_auth`, `tb_tracker`, `tb_docs`) แทน 1 database ต่อ service |
| Login | Supabase Auth → Google | ผ่านเฉพาะอีเมลใน allowlist; ปิด register / login ด้วยรหัสผ่านบน production (บนเครื่องยังใช้ได้ เพื่อให้เทสต์รันได้) |

**งานฝั่งโค้ด (ไม่ต้องใช้บัญชี):**
1. auth-service: `AUTH_MODE=supabase` → `ValidateToken` ตรวจ JWT ของ Supabase (JWKS), เช็ก allowlist (`ALLOWED_EMAILS`), สร้าง user ในตารางของเราเองตอน login ครั้งแรก; `Register` / `Login` → 403
2. ทุก service: `DB_SCHEMA` (ตารางอยู่ใน schema ของตัวเอง, สร้าง schema ให้ถ้ายังไม่มี)
3. Image เดียวสำหรับ Render (`deploy/render/`)
4. เว็บ: ปุ่ม "Sign in with Google" เมื่อตั้ง `VITE_SUPABASE_URL`; `vercel.json`
5. GitHub Actions: CI (เทสต์ทุก push), ทุกวัน: ปลุก Supabase กันโดน pause + `pg_dump` เก็บเป็น backup
6. แก้ `api/openapi.yaml` (register/login ตอบ 403 ได้) และ `docs/AGREEMENTS.md` (schema ต่อ service, Google login)

**งานที่คุณต้องทำใน dashboard (มีขั้นตอนให้ทีละข้อ):** สร้าง GitHub repo, Supabase project + เปิด Google provider (ต้องสร้าง OAuth client ใน Google Cloud Console), Render service, Vercel project, ใส่ env / secret

**ตรวจรับ:** login ด้วย Gmail ของตัวเองจากมือถือได้; Gmail อื่นโดนปฏิเสธ; `make test` บนเครื่องยังผ่าน; ลองกู้ backup ได้จริงหนึ่งครั้ง

**ไม่อยู่ในรอบนี้:** migration แบบมีเวอร์ชัน (ยังใช้ AutoMigrate / `create_all`), monitoring / alert

**เปลี่ยน (2026-10-24):**
- ให้ทุกบัญชี Google sign in ได้ ไม่ต้องคอยเพิ่มรายชื่อ → `ALLOWED_EMAILS=*` (ค่าเริ่มต้นใน `render.yaml`)
- **ข้อควรรู้:** ใครเจอ URL ก็เห็น แก้ และลบข้อมูลได้ทั้งหมด เพราะยังไม่มีสิทธิ์ราย project
- ถ้าจะจำกัดทีหลัง ใส่รายชื่ออีเมล หรือ `@domain` ใน Render ได้เลย ไม่ต้องแก้โค้ด

### ความคืบหน้า Phase 3

- **โค้ดเสร็จแล้ว (2026-10-24):**
  - auth-service `AUTH_MODE=supabase`: ตรวจ token ด้วย JWKS ของ Supabase (ES256 / RS256), เช็ก issuer, audience และวันหมดอายุ
    - allowlist ไม่สนตัวพิมพ์ และ `@domain` ต้องตรงทั้ง domain
    - สร้าง user ตอน login ครั้งแรก (ชื่อ / รูปจาก Google)
  - `DB_SCHEMA` ทั้ง 3 service; docs-service รับ URL แบบ `postgresql://` ของ Supabase ได้ตรงๆ
  - `deploy/render/` (image เดียว, 4 process) + `render.yaml` (Blueprint)
  - เว็บ: ปุ่ม "เข้าสู่ระบบด้วย Google" เมื่อตั้ง `VITE_SUPABASE_*`, อีเมลไม่ได้รับอนุญาต → กลับหน้า login พร้อมข้อความ; `web/vercel.json`
  - `.github/workflows/ci.yml` (Go + Postgres, docs-service, web build, Playwright API + E2E กับ docker compose) และ `backup.yml` (pg_dump → เข้ารหัส → artifact 30 วัน ทุกวัน)
  - spec: register / login / me ตอบ 403 ได้; AGREEMENTS อัปเดตแล้ว; คู่มือ `deploy/README.md`
- **ผลทดสอบ:**
  - Go: ทุก package ผ่าน (รวมเทสต์ login ผ่าน Supabase 3 ชุด ที่ใช้ key ปลอมเซ็น token เหมือน Supabase)
  - docs-service 11/11 (รวมเทสต์ schema กับ Postgres จริง)
  - image ของ Render รันกับ Postgres ทดสอบ (database เดียว, 3 schema): API **105/105**, ใช้ RAM ~77 MB (free ให้ 512 MB)
  - เว็บ build แบบ production + `/api` ผ่าน proxy แบบเดียวกับ Vercel: E2E **11/11**
  - backup → เข้ารหัส → ถอดรหัส → `pg_restore` ลง database ใหม่: จำนวนแถวตรงกันทุกตาราง
- **ยังไม่ได้ทดสอบ:** login ผ่าน Supabase / Google ของจริง
- **GitHub Actions บน GitHub จริง (2026-10-24):**
  - CI (`ci.yml`) ผ่านทุก job
  - Backup (`backup.yml`) ผ่าน (สีเขียว) หลังแก้ secret `SUPABASE_DB_URL`
- **Render ↔ Supabase (2026-10-24):** deploy สำเร็จ ต่อ database ได้ ไม่มี error ใน log
  - ปัญหาที่เจอ: รหัสใน `DATABASE_URL` มี `@` ที่ไม่ได้ URL-encode (ต้องเขียนเป็น `%40`) ทำให้ login ผิดซ้ำ ๆ จน pooler บล็อก `(ECIRCUITBREAKER)`
  - แก้โค้ดแล้ว (`0d260d2`): ถ้ารหัสผิดจะหยุดทันทีไม่ลองซ้ำ, error อื่นรอนานขึ้นทีละเท่าตัวสูงสุด 10 วินาที, `start.sh` รอ 60 วินาทีก่อนออก กัน Render restart ถี่
  - หมายเหตุ: `/health` เช็กแค่ api-gateway ไม่ได้เช็ก database

### ขั้นต่อไป (ณ 2026-10-24)
- สร้าง Vercel ตาม `deploy/README.md` ข้อ 4
- ตั้ง Site URL / Redirect URLs ใน Supabase
- ลอง login ด้วย Google จากมือถือ

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
| Phase 2b — Service จริง: gateway (Go Fiber) + auth / tracker (Go) + docs (Python) + Postgres | ⬜ ยังไม่เริ่ม |
| Phase 2c — สลับเว็บและ test ไปใช้ gateway จริง (:8080), E2E ผ่าน → **MVP พร้อมใช้** | ⬜ ยังไม่เริ่ม |
| ส่วนที่ 2 — บทเรียน FE / BE (สอนจากโค้ด MVP ที่เสร็จแล้ว) | ⬜ หลัง MVP |
| Phase 3 (เสนอ ยังไม่ได้ตกลง) — พร้อมใช้จริงบน server: CI, deploy, HTTPS, backup, monitoring | ⬜ ยังไม่ได้วางแผน |

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

## วิธีรัน

รันทุกอย่างพร้อมกันด้วย Docker:

```bash
make up      # Mock API :4010, Swagger UI :8081, Web :5173, Storybook :6006
make down    # หยุดทั้งหมด
```

หรือรันทีละตัวบนเครื่อง:

```bash
make mock                      # Mock API   → http://localhost:4010/api/v1
make swagger                   # Swagger UI → http://localhost:8081
make smoke                     # ทดสอบ flow หลักกับ mock
cd web && npm run storybook    # Storybook  → http://localhost:6006
cd e2e && npm test             # Playwright ทั้งหมด
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

1. **Phase 2b** — ทำ service จริงตาม `proto/`
   - api-gateway (Go Fiber): REST ตาม `api/openapi.yaml` → เรียก gRPC, ตรวจ JWT, แปลง error ตาม AGREEMENTS
   - auth-service, tracker-service (Go + GORM), docs-service (Python grpcio + SQLAlchemy)
   - Postgres ใน compose: 1 database ต่อ service
2. **Phase 2c** — ตั้ง `VITE_API_BASE_URL` / `API_BASE_URL` ไปที่ gateway (:8080), รัน API + E2E test ชุดเดิมให้ผ่าน → **MVP พร้อมใช้**
3. **ส่วนที่ 2 — บทเรียน** (หลัง MVP)
   - **FE:** React + TS + Tailwind + react-query อิงจากโค้ดใน `web/`
   - **BE:** Go Fiber gateway, gRPC microservice (Go + GORM) และ Python docs-service อิงจากโค้ด Phase 2b
4. **Phase 3** (ถ้าจะเปิดให้คนอื่นใช้จริง) — ตกลง scope กันก่อน: CI (GitHub Actions), deploy, HTTPS, เก็บ secret, backup DB, log/monitoring

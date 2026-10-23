# Project Status — Tracking Board

> อัปเดตล่าสุด: 2026-10-23 · ยังไม่ได้ commit

## ภาพรวม

| เฟส | สถานะ |
|---|---|
| Phase 0 — ข้อตกลง + Contract | ✅ เสร็จ |
| Phase 1 — FE / BE / QA (ทำพร้อมกัน, ใช้ mock) | ✅ เสร็จ |
| ตัดสินใจเรื่อง spec 6 ข้อ (ดูหัวข้อ "ข้อที่ตัดสินใจแล้ว") | ✅ เสร็จ (2026-10-23) |
| Phase 2 — Service จริง (Go/Python + gRPC) + FE ต่อ API | ⬜ ยังไม่เริ่ม |
| ส่วนที่ 2 — บทเรียน FE / BE | ⬜ ยังไม่เริ่ม |

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
- **ยังไม่ทำ:**
  - ยังไม่ต่อ API จริง (หน้าจอใช้ข้อมูลตัวอย่าง)
  - ยังไม่มี ESLint และ unit test

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
- **ข้อควรรู้:** ถ้ารัน test ใน CI ต้องใช้ mock แยกของตัวเอง เพราะถ้ามีคน reset mock ที่ใช้ร่วมกันกลางทาง test จะตกแบบสุ่ม

## วิธีรัน

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

1. Commit แรกเป็นจุดตั้งต้น (ตอนนี้ยังไม่มี commit เลย)
2. ส่วนที่ 2: ออกแบบบทเรียน
   - **FE:** React + TS + Tailwind อิงจาก component ที่ทำไว้แล้ว
   - **BE:** Go Fiber gateway, gRPC microservice (Go + GORM) และ Python docs-service อิงจาก proto ที่ทำไว้แล้ว
3. Phase 2: ทำ service จริงตาม proto แล้วสลับ FE และ QA จาก mock (`:4010`) ไปใช้ gateway จริง (`:8080`)

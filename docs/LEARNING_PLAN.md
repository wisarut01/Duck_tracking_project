# แผนบทเรียน FE / BE (14 วัน)

เรียนจากโค้ดของ Tracking Board เอง แต่ละ task มี 4 ส่วน: **อ่าน** (ไฟล์ไหน) → **เข้าใจ** (เรื่องอะไร) → **ลองทำ** (แบบฝึกหัด) → **เสร็จเมื่อ**

- **19 task ใน 14 วัน** วันละ 1–2 task ประมาณ 1–2 ชั่วโมง
- สัปดาห์ที่ 1 = Frontend, สัปดาห์ที่ 2 = Backend, วันสุดท้ายรวมทั้งสองฝั่ง
- ทุก task อยู่ใน board project **LRN** (label `lesson`, `fe` / `be` / `fullstack`, `day-NN`) ย้าย card ไป Done เมื่อผ่านข้อ "เสร็จเมื่อ"
- ก่อนเริ่ม: `make up` ให้รันได้บนเครื่อง (ดู `README.md`)

## สัปดาห์ที่ 1: Frontend

| วัน | Task | ลองทำ |
|---|---|---|
| 1 | ภาพรวมระบบ: เว็บ → gateway → 3 service → Postgres | ดู request ใน DevTools และ log ของแต่ละ service |
| 1 | โครงเว็บ: Vite + React + TypeScript + routing | เพิ่มหน้า `/about` |
| 2 | Component, Tailwind, design token + Storybook | เพิ่ม `Button` variant `danger` + story |
| 3 | เรียก API แบบมี type จาก OpenAPI | ลองพิมพ์ field ผิดแล้วดู TypeScript ฟ้อง |
| 3 | react-query: useQuery, useMutation, cache | ดูว่า cache เปลี่ยนเมื่อไหร่ |
| 4 | Login ฝั่งเว็บ: token, RequireAuth, Supabase | ลบ token แล้วดูว่าเกิดอะไร |
| 5 | Kanban: dnd-kit + optimistic update | ปิด backend ระหว่างลาก card |
| 6 | Docs: Markdown + mention issue | ให้ mention แสดงสถานะ issue |
| 6 | Responsive + dark mode | แก้จุดที่ใช้ยากบนจอมือถือ |
| 7 | ทดสอบฝั่งเว็บ: MSW + Playwright | ทำ filter ตาม priority + E2E |

## สัปดาห์ที่ 2: Backend

| วัน | Task | ลองทำ |
|---|---|---|
| 8 | Contract-first: OpenAPI + เทสต์ contract | แก้ spec ให้ผิดแล้วดูว่าเทสต์ไหนจับได้ |
| 8 | Protobuf + gRPC | เรียก tracker-service ด้วย `grpcurl` |
| 9 | API gateway (Go Fiber) | เพิ่ม header `X-Request-Id` |
| 10 | GORM + Postgres | ดูตารางที่ GORM สร้างด้วย `psql` |
| 10 | Business logic + unit test: การจัดลำดับ card | เพิ่ม test case |
| 11 | Auth: bcrypt, JWT, Supabase JWKS | decode token ดู claim |
| 12 | Python docs-service: gRPC + SQLAlchemy | ค้นหาตามเนื้อหา + เทสต์ |
| 13 | Deploy + CI: Docker, Render, Vercel, GitHub Actions | กู้ backup ลงเครื่อง |
| 14 | **Capstone:** due date ของ issue ครบทุกชั้น | spec → proto → service → gateway → เว็บ → เทสต์ |

## เพิ่ม task ลง board

ข้อมูลของแต่ละ task (ไฟล์ที่ต้องอ่าน แบบฝึกหัด) อยู่ใน `scripts/lessons/plan.mjs` ถ้าแก้แผน แก้ที่นั่นและตารางในไฟล์นี้ด้วย

```bash
# token: เปิดเว็บแล้ว login → DevTools → Console → localStorage.getItem("tb-access-token")
TB_TOKEN='<token>' node scripts/lessons/seed.mjs                                        # production
TB_API=http://localhost:8080/api/v1 TB_TOKEN='<token>' node scripts/lessons/seed.mjs    # บนเครื่อง
```

รันซ้ำได้ task ที่มีอยู่แล้วจะถูกข้าม

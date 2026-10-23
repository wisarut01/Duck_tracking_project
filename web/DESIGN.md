# Tracking Board — Design System

> เอกสารนี้คือ "สเปกหน้าตา" ของ Frontend ทั้งหมด — token ทุกตัวอยู่ใน `src/styles/index.css`
> และดูตัวอย่างจริงได้ใน Storybook (`npm run storybook` → http://localhost:6006)
> หน้า **Design Tokens** ใน Storybook อ่านค่าจาก CSS จริง จึงตรงกับเอกสารนี้เสมอ

---

## 1. Design principles (หลักการออกแบบ)

ภาพรวม: **"Whiteboard ของทีม"** — เป็นมิตร สบายตา เหมือนกระดานที่มี sticky note แปะอยู่ แต่ยังสะอาดและอ่านง่ายสำหรับงานจริง
(ได้แรงบันดาลใจจากเครื่องมือ collaboration แบบ whiteboard แต่ **ไม่ใช้** โลโก้ ชื่อ หรือ asset ของผลิตภัณฑ์ใดๆ — โลโก้เป็นของเราเอง ดู `components/layout/Logo.tsx`)

1. **Canvas อุ่น ไม่ใช่ขาวจั๊วะ** — พื้นหลังเป็น off-white โทนอุ่น (`canvas`) และพื้นที่แบบ board ใช้ **dot-grid** (`bg-dot-grid`)
2. **เหลืองเดียว (One bold accent)** — `brand` (#FFD02F) ใช้กับ *action หลัก* และ *สิ่งที่ active* เท่านั้น (ปุ่ม Create, เมนูที่เลือก, drop zone) ตัวอักษรบนเหลืองเป็นสีเกือบดำเสมอ
3. **Sticky pastel = หมวดหมู่** — สีพาสเทลบอก "ประเภท" (Task/Bug/Story, label) ไม่ใช่ตกแต่งเฉยๆ
4. **สีไม่เคยมาเดี่ยว (Color + Icon + Text)** — ทุกสถานะมีไอคอนและข้อความกำกับ คนตาบอดสีต้องใช้งานได้ครบ
5. **นุ่ม มน เป็นมิตร** — มุมโค้ง 8–20px, เงานุ่มโทนอุ่น, ฟอนต์หนาแบบ friendly
6. **Playful แต่ไม่รก** — ความสนุกอยู่ที่ micro-interaction (การ์ดเอียงตอนหยิบ, pop-in) ไม่ใช่สีหรือของตกแต่งเยอะ
7. **Light / Dark เท่าเทียม** — ทุก token มีค่าทั้งสองโหมด ผ่าน contrast WCAG AA (≥ 4.5:1 สำหรับข้อความ)

---

## 2. Color tokens

### วิธีใช้งาน

- ค่าจริงเป็น CSS variables `--tb-*` ใน `:root` (light) และ `.dark` (dark)
- Tailwind v4 map เป็น utility ผ่าน `@theme inline` เช่น `bg-canvas`, `text-ink-muted`, `border-border`, `bg-sticky-blue`, `text-sticky-blue-ink`
- **Dark mode** = ใส่ class `dark` ที่ `<html>` (Storybook toolbar / ปุ่มบน TopBar ทำให้) — ใช้ variant `dark:` ได้ด้วย
- ห้ามใช้สี hex ตรงๆ ใน component (ยกเว้น SVG โลโก้) → ใช้ token เสมอ

### Surfaces / Lines / Text / Brand / Feedback

| Token (`--tb-*`) | Light | Dark | ใช้กับ |
|---|---|---|---|
| `canvas` | `#F7F5F0` | `#17171A` | พื้นหลังแอป / board |
| `surface` | `#FFFFFF` | `#212126` | การ์ดขาว, panel, modal, sidebar |
| `surface-muted` | `#F1EEE7` | `#2A2A30` | พื้นคอลัมน์ board, hover, input disabled |
| `surface-sunken` | `#EBE7DE` | `#1C1C20` | code block, skeleton |
| `dot` | `#D9D3C5` | `#303037` | จุดของ dot-grid |
| `border` | `#E6E1D6` | `#34343B` | เส้นแบ่งทั่วไป |
| `border-strong` | `#CFC8B8` | `#4A4A53` | ขอบ input, ปุ่ม secondary |
| `ink` | `#1C1C1E` | `#F4F2EC` | ข้อความหลัก |
| `ink-muted` | `#5C5A55` | `#B4B0A6` | ข้อความรอง |
| `ink-subtle` | `#67635A` | `#9E9A90` | placeholder, metadata, หัวข้อ section ตัวเล็ก |
| `ink-inverse` | `#FFFFFF` | `#1C1C1E` | ข้อความบนพื้นเข้ม (tooltip, ปุ่ม danger) |
| `brand` | `#FFD02F` | `#FFD02F` | ปุ่ม primary, active indicator |
| `brand-hover` | `#F5C200` | `#FFDC5E` | hover ของ brand |
| `brand-soft` | `#FFF4B8` | `#4A4120` | พื้น item ที่เลือก, highlight คำค้น, quote |
| `brand-ink` | `#1C1C1E` | `#1C1C1E` | ข้อความบน brand |
| `link` / `focus` | `#3654E6` | `#8FA8FF` | ลิงก์ และ focus ring |
| `success` / `-soft` | `#1C7F45` / `#D3F5DC` | `#7FDC9C` / `#22402C` | Toast success |
| `warning` / `-soft` | `#9A5B00` / `#FFE8C2` | `#FFC070` / `#4A3322` | Toast warning |
| `danger` / `-soft` | `#B3232E` / `#FFDDE0` | `#FF8F97` / `#4D2429` | error, ปุ่มลบ |
| `info` / `-soft` | `#2A5BD7` / `#D6E6FF` | `#9DBCFF` / `#24344F` | Toast info |

### Sticky-note pastels

คู่ "พื้น + ink" — ใช้ ink เป็นสีตัวอักษร/ไอคอนบนพื้นสีนั้นเสมอ (ทุกคู่ contrast ≥ 4.5:1)

| สี | พื้น Light | ink Light | พื้น Dark | ink Dark | ใช้กับ |
|---|---|---|---|---|---|
| yellow | `#FFF4B8` | `#6B4F00` | `#4A4120` | `#FFE58A` | Docs/Page, priority Medium |
| pink | `#FFD6E0` | `#9C1F45` | `#4A2A33` | `#FFB3C6` | **Bug**, priority Highest |
| green | `#D3F5DC` | `#1A6334` | `#22402C` | `#9BE3B0` | **Story**, status Done |
| blue | `#D6E6FF` | `#1E4BB0` | `#24344F` | `#A9C8FF` | **Task**, status In progress, priority Low |
| purple | `#E6DCFF` | `#5534B8` | `#352C4D` | `#CDBBFF` | status In review |
| orange | `#FFE2C6` | `#8F4300` | `#4A3322` | `#FFC08A` | priority High |
| teal | `#CFF3EE` | `#0D6158` | `#1F413D` | `#8FE3D7` | priority Lowest |
| gray | `#ECEAE4` | `#4D4A44` | `#2E2D2A` | `#CFCBC1` | status To do, ค่า default |

Label ของ issue (เช่น `frontend`) ได้สีอัตโนมัติจากการ hash ชื่อ (`colorForLabel()` ใน `Badge.tsx`) → label เดิมสีเดิมทุกที่

---

## 3. Typography

- **Font stack**: `"Plus Jakarta Sans Variable"` (Latin, ตัวกลมหนาเป็นมิตร) → `"IBM Plex Sans Thai"` (ภาษาไทย) → `system-ui`
- โหลดผ่าน `@fontsource` (ไม่พึ่ง CDN, ใช้ offline ได้)
- Monospace (issue key, code): `ui-monospace, SFMono-Regular, Menlo, Consolas`

| Token | Size / Line-height | Weight ที่ใช้ | ใช้กับ |
|---|---|---|---|
| `text-3xl` | 36 / 46px | 800 | Hero (Storybook intro) |
| `text-2xl` | 28 / 38px | 800 | ชื่อหน้า, ชื่อ project, H1 ใน Markdown |
| `text-xl` | 22 / 32px | 800 | ชื่อ issue ใน detail, H2 |
| `text-lg` | 18 / 28px | 700 | หัวข้อ modal, H3 |
| `text-base` | 16 / 26px | 400 | เนื้อหา Docs |
| `text-sm` | 14 / 22px | 500–700 | UI ทั่วไป, ชื่อการ์ด, ปุ่ม, label ฟอร์ม |
| `text-xs` | 12 / 18px | 600–700 | metadata, badge, issue key, หัวข้อ section (UPPERCASE + tracking) |

กติกา: หัวข้อใช้ **800 (extrabold)**, UI ใช้ **600–700**, เนื้อหาใช้ **400** — ภาษาไทยต้องมี line-height ≥ 1.5 (สระบน/ล่างไม่ชนกัน)

---

## 4. Spacing

ใช้ scale มาตรฐานของ Tailwind (1 หน่วย = 4px) — ยึดค่าเหล่านี้เป็นหลัก:

| px | Tailwind | ใช้กับ |
|---|---|---|
| 4 | `1` | ระยะไอคอน-ข้อความในชิป |
| 8 | `2` | gap ใน card, ระหว่าง badge |
| 12 | `3` | padding การ์ด issue, gap การ์ดในคอลัมน์ (`2.5` = 10px) |
| 16 | `4` | padding panel, gap คอลัมน์ board |
| 24 | `6` | padding หน้า, padding modal |
| 32–40 | `8`–`10` | ระยะ section ใหญ่ |

Layout: Sidebar `w-64` (256px, ย่อเป็น 64px), TopBar สูง 64px (`h-16`), คอลัมน์ board `w-72` (288px), Drawer รายละเอียด `max-w-xl`

---

## 5. Radius

| Token | ค่า | ใช้กับ |
|---|---|---|
| `rounded-sm` | 6px | inline code, chip เล็ก |
| `rounded-md` | 8px | ปุ่ม sm, IssueMentionChip, ไอคอนกล่อง |
| `rounded-lg` | 12px | ปุ่ม md, input, **IssueCard** |
| `rounded-xl` | 16px | ปุ่ม lg, list item, Toast |
| `rounded-2xl` | 20px | คอลัมน์ board, Modal, panel ใหญ่ |
| `rounded-full` | — | Avatar, Badge, StatusPill |

## 6. Shadows

เงาโทนอุ่น (น้ำตาลจางๆ ไม่ใช่ดำล้วน) ใน dark mode เป็นดำเข้มขึ้น

| Token | ใช้กับ |
|---|---|
| `shadow-sm` | การ์ดปกติ, ปุ่ม, input |
| `shadow-md` | hover ของการ์ด, sticky deco |
| `shadow-lg` | Modal, Toast, Drawer, Command palette |
| `shadow-lift` | การ์ดที่ถูก **หยิบ** (DragOverlay) |

Motion: 150ms ease สำหรับ hover, `animate-pop-in` (160ms เด้งนิดๆ) สำหรับ modal/toast, เคารพ `prefers-reduced-motion`

---

## 7. Iconography

- ใช้ **lucide-react** ทั้งหมด — เส้น 2px (ไอคอนสถานะใช้ 2.5–2.75 ให้ดูหนาแน่น), ขนาด 12/14/16/18/20px
- ไอคอนที่มีข้อความข้างๆ → `aria-hidden`
- ไอคอนเดี่ยว (ไม่มีข้อความ) → ต้องมี `aria-label` (และ `title` เป็น tooltip)
- ปุ่มไอคอนอย่างเดียว → `<Button iconOnly aria-label="...">`

### Issue visual mapping (สี + ไอคอน + ข้อความ เสมอ)

ตั้งค่าที่ `src/lib/issueMeta.ts` (ใช้ `Record<Enum, ...>` → TypeScript บังคับให้ครบทุกค่าของ enum ใน openapi)

**Type**

| ค่า | ไอคอน (lucide) | สี | ภาษาไทย |
|---|---|---|---|
| `TASK` | `SquareCheck` ☑ | blue | งาน |
| `BUG` | `Bug` 🐞 | pink | บั๊ก |
| `STORY` | `Bookmark` 🔖 | green | สตอรี่ |

**Status** (คอลัมน์ board)

| ค่า | ไอคอน | สี | Label |
|---|---|---|---|
| `TODO` | `Circle` ○ | gray | To do — รอทำ |
| `IN_PROGRESS` | `CircleDashed` ◌ | blue | In progress — กำลังทำ |
| `IN_REVIEW` | `Eye` 👁 | purple | In review — รอรีวิว |
| `DONE` | `CircleCheck` ✓ | green | Done — เสร็จแล้ว (chip mention ขีดฆ่า key) |

**Priority** — สื่อด้วย *ทิศ + จำนวนลูกศร* ก่อน แล้วค่อยเป็นสี

| ค่า | ไอคอน | สี |
|---|---|---|
| `HIGHEST` | `ChevronsUp` ⇈ | pink |
| `HIGH` | `ChevronUp` ↑ | orange |
| `MEDIUM` | `Equal` = | yellow |
| `LOW` | `ChevronDown` ↓ | blue |
| `LOWEST` | `ChevronsDown` ⇊ | teal |

---

## 8. Component inventory

ทุก component มี `*.stories.tsx` อยู่ข้างไฟล์ · props ใช้ type จาก `src/types/api.ts` (เขียนตาม `api/openapi.yaml`)

### Primitives (`src/components/ui/`)

| Component | Variants / States |
|---|---|
| **Button** | `primary` (เหลือง) · `secondary` (ขาว+ขอบ) · `ghost` · `danger` × `sm/md/lg` · `loading` · `disabled` · `iconOnly` · `leftIcon/rightIcon` |
| **Input** | label · hint · error (`aria-invalid` + `aria-describedby`) · required · disabled · leftIcon |
| **TextArea** | เหมือน Input · rows · resize แนวตั้ง |
| **Select** | native `<select>` ที่ตกแต่ง · placeholder · error · disabled |
| **Badge / Tag** | 8 สี sticky · `soft` / `outline` · `sm/md` · icon · `onRemove` (กลายเป็น Tag ลบได้) |
| **Avatar / AvatarGroup** | initials บนพาสเทล (สีตามชื่อ) · รูป · Unassigned (วงกลมเส้นประ "?") · `xs/sm/md/lg` · group `+N` |
| **Modal** | Portal · `sm/md/lg` · title/description/footer · Esc / คลิกพื้นหลังปิด · focus trap · คืน focus |
| **Tooltip** | `top/right/bottom/left` · เปิดด้วย hover **และ** keyboard focus · Esc ปิด |
| **Toast** | `success/error/warning/info` · action (Undo) · `ToastProvider` + `useToast()` · ปิดเองใน 4 วิ |
| **EmptyState** | ภาพ "กองโน้ต" · icon · action · `compact` |
| **Skeleton** | `text/circle/rect` · `IssueCardSkeleton` · shimmer |

### Domain (`src/components/issues/`, `docs/`, `search/`, `layout/`)

| Component | หน้าที่ / States |
|---|---|
| **IssueTypeIcon** | ไอคอนในกล่องพาสเทล · `sm/md/lg` · `showLabel` |
| **PriorityIcon** | ลูกศรสี · `showLabel` |
| **StatusPill** | pill สี+ไอคอน+ข้อความ · `sm/md` · `iconOnly` |
| **IssueCard** | sticky note สีตาม type · key, title (ตัด 3 บรรทัด), labels, priority, จำนวนหน้าที่ลิงก์, assignee · `selected` · `isDragging` (จาง) · `isOverlay` (เอียง+เงายก) · `showStatus` |
| **BoardColumn** | หัวคอลัมน์ (ไอคอน status + ชื่อ + จำนวน + ปุ่ม +) · drop zone highlight · empty · loading |
| **KanbanBoard** | 4 คอลัมน์ · drag & drop (dnd-kit) ทั้งเมาส์/สัมผัส/คีย์บอร์ด · `onMoveIssue(key, MoveIssueRequest)` · loading |
| **IssueDetailPanel** | `layout="page"` (2 คอลัมน์) / `"panel"` (drawer) · field แก้ได้ (status/type/priority/assignee) · description Markdown · Linked pages · Comments + composer · loading comments |
| **CreateIssueModal** | title (validate) · type แบบการ์ดสี (radio) · priority · assignee · labels (Enter เพื่อเพิ่ม) · description · submitting · serverError |
| **IssueMentionChip** | known (ไอคอน type) · unknown (เส้นประ) · done (ขีดฆ่า) · `showTitle` |
| **PageTree** | nested ไม่จำกัดชั้น · expand/collapse · active (พื้น brand-soft) · ขยายเส้นทางไปหน้า active อัตโนมัติ · ปุ่ม + สร้างหน้าย่อย |
| **MarkdownView** | GFM (ตาราง, checklist, ขีดฆ่า) · `TB-12` → IssueMentionChip · `compact` |
| **PageEditor** | `edit / split / preview` · dirty indicator · Ctrl/⌘+S · ส่ง `UpdatePageRequest` เฉพาะ field ที่เปลี่ยน |
| **LinkedIssuesPanel** | รายการ issue ที่ลิงก์กับหน้า · Link / Unlink · empty · loading |
| **SearchBar** | ปุ่มหน้าตา input บน TopBar · `⌘K` hint |
| **CommandPalette** | ค้นหารวม · กลุ่ม **Issues** / **Pages** · highlight คำค้น · ↑↓ Enter Esc · empty / no results / loading |
| **Sidebar** | Logo · Projects (key chip + จำนวน issue) · Spaces · ผู้ใช้ + logout · `collapsed` |
| **TopBar** | breadcrumb · SearchBar · สลับธีม · ปุ่ม Create |
| **AppShell** | Sidebar + TopBar + main (`canvas` = dot-grid) · ⌘K / Ctrl+K · ปุ่มย่อเมนู |

### Screens (`src/screens/`, Storybook หมวด `Screens/`)

Login (login/register/error/loading) · ProjectBoard (filter assignee/type, drawer, create, toast) · IssueDetail · DocsPage (tree + page + linked issues, โหมดแก้ไข) · SearchResults (tabs ทั้งหมด/Issues/Pages, command palette เปิดทับ)

---

## 9. Layout — App shell

```
┌──────────────┬───────────────────────────────────────────────────────┐
│  [Logo]      │ ☰  Project / Board     [ 🔍 ค้นหา…        ⌘K ]  🌙 [+ Create] │  ← TopBar 64px
│              ├───────────────────────────────────────────────────────┤
│ PROJECTS   + │                                                       │
│ ▌TB Tracking │   main (overflow-auto)                                │
│  MKT Market… │   • Board: พื้น dot-grid + คอลัมน์เลื่อนแนวนอน         │
│              │   • Docs:  [PageTree 256px] [เนื้อหา max-w-3xl] [Linked issues 320px] │
│ SPACES     + │   • Issue: การ์ดใหญ่ 2 คอลัมน์ (เนื้อหา | fields)        │
│  📒 Engineer │                                                       │
│  📒 Design   │                                                       │
│──────────────│                                                       │
│ (D) Duck  ⎋  │                                                       │
└──────────────┴───────────────────────────────────────────────────────┘
   Sidebar 256px (ย่อ 64px)
```

- รายการที่ active ใน Sidebar = พื้น `brand-soft` **+ แถบเหลืองด้านซ้าย** + `aria-current="page"`
- คลิกการ์ดบน board → เปิด IssueDetailPanel เป็น drawer ด้านขวา (ไม่เปลี่ยนหน้า) / URL `/issues/TB-12` = เต็มหน้า
- Responsive: < `md` ซ่อน breadcrumb และ page tree, < `xl` ซ่อน Linked issues ด้านขวา (Phase 2 ย้ายไปไว้ใต้เนื้อหา)

Routes (เตรียมไว้ใน `src/main.tsx`): `/login`, `/projects/:key/board`, `/issues/:issueKey`, `/spaces/:spaceKey/pages/:pageId`, `/search?q=`

---

## 10. Drag & drop interaction rules

ใช้ `@dnd-kit/core` + `@dnd-kit/sortable` (ดู `KanbanBoard.tsx`)

1. **เริ่มลาก**: เมาส์/นิ้วต้องขยับ ≥ 5px (คลิกเฉยๆ = เปิดการ์ด) · คีย์บอร์ด: Tab ไปที่การ์ด → **Space** หยิบ
2. **ระหว่างลาก**
   - การ์ดที่ลอยตามเมาส์ (DragOverlay) **เอียง 2°** + `shadow-lift` + cursor `grabbing` — เหมือนหยิบ sticky note
   - ตำแหน่งเดิมเหลือเป็นการ์ดจาง (opacity 40%)
   - คอลัมน์ปลายทางขึ้นพื้น `brand-soft` + เส้นประเหลือง
   - การ์ดอื่นขยับหลบให้แบบ animation
   - คีย์บอร์ด: ลูกศรเพื่อย้าย, **Esc** ยกเลิก (กลับที่เดิม)
3. **วาง**: Space (คีย์บอร์ด) หรือปล่อยเมาส์ → การ์ด "ร่อน" ลงที่ (dropAnimation 180ms)
4. **เรียก API**: ถ้าคอลัมน์หรือลำดับเปลี่ยนจริง → `onMoveIssue(key, { status, afterKey, beforeKey })` ตรงกับ `MoveIssueRequest` (server คำนวณ `position` เอง) · ถ้าวางที่เดิม = ไม่เรียก
5. **Optimistic UI** (Phase 2): อัปเดตหน้าจอทันที → ถ้า API error ให้ย้อนการ์ดกลับ + Toast `error`
6. **Screen reader**: มีประกาศภาษาไทยทุกขั้น (หยิบ / อยู่เหนือคอลัมน์ไหน / วาง / ยกเลิก) และคำแนะนำ "กด Space เพื่อหยิบ…"
7. **Enter** บนการ์ด = เปิดรายละเอียด (ไม่ใช้หยิบ เพื่อไม่ชนกัน)

---

## 11. Issue mentions ใน Docs (`TB-12` → inline chip)

- Regex: `\b([A-Z][A-Z0-9]{1,9}-\d+)\b` — ตรงกับ pattern `IssueKey` ใน openapi (`src/lib/mentions.ts`)
- Remark plugin (`src/lib/remarkIssueMentions.ts`) เดินต้นไม้ Markdown แล้วแปลงเฉพาะ **text node** เป็นลิงก์ `/issues/TB-12`
  - **ไม่แปลง** ใน `inline code`, code block และข้อความที่เป็นลิงก์อยู่แล้ว
  - `tb-12` (ตัวเล็ก), `TB12`, `XTB-12abc` ไม่ถูกจับ
- `MarkdownView` เปลี่ยนลิงก์นั้นเป็น **IssueMentionChip**:

| สถานะ | หน้าตา |
|---|---|
| รู้ข้อมูล issue | ชิปขาวมีขอบ `rounded-md` · ไอคอน type สีตาม type · key ตัว mono หนา · hover = พื้น `brand-soft` + ยกขึ้น 1px · tooltip = `TB-12: ชื่อ (status)` |
| Done | key **ขีดฆ่า** + จางลง |
| ไม่พบ issue | ชิปเส้นประ พื้น `surface-muted` (ยังคลิกได้ — ไปหน้า 404 ของ issue) |

- ข้อมูล issue มาจาก prop `resolveIssue(key)` → Phase 2 ดึงจาก react-query cache / batch `GET /search?q=`
- ลิงก์ภายในใช้ react-router `<Link>` (ไม่ reload หน้า), ลิงก์ภายนอกเปิดแท็บใหม่

---

## 12. Accessibility checklist

- Contrast ข้อความ ≥ 4.5:1 ทั้ง light/dark (ตรวจด้วยสคริปต์ + Storybook a11y addon)
- Focus ring ชัด (`outline 2px focus`) เฉพาะ `:focus-visible`
- ทุก input มี label (มองเห็น หรือ `aria-label`) · error ผูก `aria-describedby` + `role="alert"`
- Modal/CommandPalette: `role="dialog"` + `aria-modal`, Esc ปิด, focus trap
- PageTree ใช้ `role="tree"/"treeitem"` + `aria-expanded`/`aria-selected` · CommandPalette ใช้ combobox + listbox + `aria-activedescendant`
- ไม่สื่อความหมายด้วยสีอย่างเดียว (ดู §7) · เคารพ `prefers-reduced-motion`

---

## 13. โครงไฟล์

```
web/
├─ DESIGN.md                ← เอกสารนี้
├─ .storybook/              ← main.ts, preview.tsx (theme toggle, router, a11y)
└─ src/
   ├─ styles/index.css      ← tokens (light/dark) + Tailwind theme + Markdown styles
   ├─ types/api.ts          ← types ตาม api/openapi.yaml
   ├─ mocks/fixtures.ts     ← mock data (project TB, space ENG)
   ├─ lib/                  ← cn, issueMeta (visual mapping), mentions, format, useTheme
   ├─ components/
   │  ├─ ui/                ← primitives
   │  ├─ issues/            ← board, card, detail, create
   │  ├─ docs/              ← tree, markdown, editor, linked issues
   │  ├─ search/            ← SearchBar, CommandPalette
   │  └─ layout/            ← Sidebar, TopBar, AppShell, Logo
   ├─ screens/              ← หน้าจอเต็ม (ใช้ใน Storybook + main.tsx)
   └─ docs/                 ← Introduction.mdx, DesignTokens.mdx
```

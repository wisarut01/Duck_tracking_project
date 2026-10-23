// Seed data — the "database" the mock starts with.
//
// createSeed() returns a brand-new object every time, so we can reset the
// mock to a clean state (POST /__mock/reset) without restarting the process.
//
// IDs are fixed (not random) so the frontend / QA can rely on them, and they
// match the examples in api/openapi.yaml (e.g. TB-12 = 3c4d5e6f-...-000000000012).

// Build a valid UUID from a fixed prefix and a number: id('7f1c2a9e', 1)
// → "7f1c2a9e-0000-4000-8000-000000000001"
const id = (prefix, n) => `${prefix}-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Little helper to make readable timestamps: day(3, '10:00') → "2026-10-03T10:00:00Z"
const day = (d, time = '09:00') => `2026-10-${String(d).padStart(2, '0')}T${time}:00Z`;

export const USER = { duck: id('7f1c2a9e', 1), mint: id('7f1c2a9e', 2), ploy: id('7f1c2a9e', 3) };
const PAGE = {
  boardSpec: id('5e6f7081', 1),
  home: id('5e6f7081', 2),
  architecture: id('5e6f7081', 3),
  grpc: id('5e6f7081', 4),
  database: id('5e6f7081', 5),
  frontend: id('5e6f7081', 6),
  designSystem: id('5e6f7081', 7),
  onboarding: id('5e6f7081', 8),
  localSetup: id('5e6f7081', 9),
};
const issueId = (n) => id('3c4d5e6f', n);

export function createSeed() {
  // NOTE: passwords are stored in plain text ONLY because this is a mock.
  // The real auth-service must hash them (bcrypt/argon2).
  const users = [
    { id: USER.duck, email: 'duck@example.com', password: 'password123', displayName: 'Duck', avatarUrl: null },
    { id: USER.mint, email: 'mint@example.com', password: 'password123', displayName: 'Mint', avatarUrl: null },
    { id: USER.ploy, email: 'ploy@example.com', password: 'password123', displayName: 'Ploy', avatarUrl: null },
  ];

  const projects = [
    {
      id: id('2b3c4d5e', 1),
      key: 'TB',
      name: 'Tracking Board',
      description: 'Jira + Confluence สำหรับทีมเล็ก',
      leadId: USER.duck,
      createdAt: day(1),
      nextIssueNumber: 13, // TB-1..TB-12 exist, so the next created issue is TB-13
    },
  ];

  // [number, title, type, status, priority, assignee, labels, description]
  const rows = [
    [1, 'ตั้งค่า monorepo และ CI', 'TASK', 'DONE', 'HIGH', USER.duck, ['infra'], 'ดูรายละเอียดที่หน้า **Engineering Home**'],
    [2, 'ออกแบบ architecture gateway + gRPC', 'STORY', 'DONE', 'HIGHEST', USER.duck, ['backend'], null],
    [3, 'Drag & drop การ์ดข้ามคอลัมน์', 'STORY', 'IN_PROGRESS', 'HIGH', USER.mint, ['frontend'], 'ใช้ dnd-kit ดู **Board Spec**'],
    [4, 'Design system: สี ตัวอักษร spacing', 'TASK', 'IN_REVIEW', 'MEDIUM', USER.mint, ['frontend', 'design'], null],
    [5, 'Login / register ด้วย JWT', 'STORY', 'IN_PROGRESS', 'HIGH', USER.duck, ['backend', 'auth'], null],
    [6, 'เขียน proto ของ tracker-service', 'TASK', 'TODO', 'MEDIUM', USER.duck, ['backend'], 'ดู **gRPC Contracts**'],
    [7, 'Schema ตาราง issue_page_links', 'TASK', 'TODO', 'MEDIUM', USER.ploy, ['backend', 'db'], null],
    [8, 'ปุ่ม Create issue กดสองครั้งแล้วสร้างซ้ำ', 'BUG', 'TODO', 'HIGH', null, ['frontend'], 'กดเร็วๆ สองครั้ง ได้ issue 2 ใบ'],
    [9, 'คู่มือ setup เครื่อง dev', 'TASK', 'IN_REVIEW', 'LOW', USER.ploy, ['docs'], null],
    [10, 'Search รวม issue + page', 'STORY', 'TODO', 'MEDIUM', null, ['backend', 'search'], null],
    [11, 'Markdown render TB-xx เป็นลิงก์ไม่ได้ใน code block', 'BUG', 'IN_PROGRESS', 'LOWEST', USER.mint, ['frontend'], null],
    [12, 'ทำหน้า Kanban board', 'STORY', 'IN_PROGRESS', 'HIGHEST', USER.mint, ['frontend'], 'ลากการ์ดข้ามคอลัมน์ได้ ดู spec ที่หน้า **Board Spec**'],
  ];

  // position = order inside a column (smaller = higher). We space them by 1024
  // so there is room to insert cards in between later (see move logic).
  const positionCounter = {};
  const issues = rows.map(([n, title, type, status, priority, assigneeId, labels, description]) => {
    positionCounter[status] = (positionCounter[status] || 0) + 1024;
    return {
      id: issueId(n),
      projectKey: 'TB',
      key: `TB-${n}`,
      title,
      description,
      type,
      status,
      priority,
      assigneeId,
      reporterId: USER.duck,
      position: positionCounter[status],
      labels,
      createdAt: day(2, `${String(8 + (n % 10)).padStart(2, '0')}:00`),
      updatedAt: day(3 + (n % 5), '08:30'),
    };
  });

  const comments = [
    { id: id('4d5e6f70', 1), issueId: issueId(12), authorId: USER.mint, body: 'เริ่มทำแล้ว ใช้ dnd-kit', createdAt: day(3, '08:30') },
    { id: id('4d5e6f70', 2), issueId: issueId(12), authorId: USER.duck, body: 'อย่าลืมเรียก `POST /issues/{key}/move` ตอน drop นะ', createdAt: day(3, '09:15') },
    { id: id('4d5e6f70', 3), issueId: issueId(8), authorId: USER.ploy, body: 'เจอใน Chrome และ Firefox', createdAt: day(4, '13:00') },
    { id: id('4d5e6f70', 4), issueId: issueId(5), authorId: USER.duck, body: 'mock ใช้ JWT จริงแล้ว (HS256)', createdAt: day(5, '10:00') },
  ];

  const spaces = [
    { id: id('6f708192', 1), key: 'ENG', name: 'Engineering', description: 'เอกสารทีม dev', createdAt: day(1) },
    { id: id('6f708192', 2), key: 'PM', name: 'Product', description: 'Roadmap และ requirement', createdAt: day(1, '10:00') },
  ];

  // Page tree of ENG (3 levels):
  //   Engineering Home
  //   ├── Architecture
  //   │   ├── gRPC Contracts
  //   │   └── Database Schema
  //   └── Frontend
  //       ├── Board Spec
  //       └── Design System
  //   Onboarding
  //   └── Local Setup
  const page = (pid, parentId, title, contentMd, authorId, created, updated, spaceKey = 'ENG') => ({
    id: pid, spaceKey, parentId, title, contentMd, authorId, createdAt: created, updatedAt: updated,
  });
  const pages = [
    page(PAGE.home, null, 'Engineering Home',
      '# Engineering Home\n\nยินดีต้อนรับสู่ space ของทีม dev\n\n- งาน setup repo: TB-1\n- Architecture ดูที่หน้าลูก',
      USER.duck, day(2, '09:00'), day(2, '09:00')),
    page(PAGE.architecture, PAGE.home, 'Architecture',
      '# Architecture\n\nweb → api-gateway (REST) → services (gRPC)\n\nตัดสินใจไว้ใน TB-2, auth อยู่ใน TB-5',
      USER.duck, day(2, '10:00'), day(3, '11:00')),
    page(PAGE.grpc, PAGE.architecture, 'gRPC Contracts',
      '# gRPC Contracts\n\nไฟล์อยู่ที่ `proto/`. งานที่เกี่ยวข้อง: TB-6',
      USER.duck, day(3, '09:00'), day(4, '09:00')),
    page(PAGE.database, PAGE.architecture, 'Database Schema',
      '# Database Schema\n\n1 database ต่อ service. ตาราง `issue_page_links` อยู่ใน tracker (TB-7)',
      USER.ploy, day(3, '10:00'), day(4, '10:00')),
    page(PAGE.frontend, PAGE.home, 'Frontend',
      '# Frontend\n\nReact + Vite. ดู Board Spec และ Design System',
      USER.mint, day(2, '11:00'), day(2, '11:00')),
    page(PAGE.boardSpec, PAGE.frontend, 'Board Spec',
      '# Board Spec\n\nคอลัมน์: TODO / IN_PROGRESS / IN_REVIEW / DONE\n\nงานหลักอยู่ที่ TB-12, drag & drop อยู่ที่ TB-3',
      USER.mint, day(2, '09:00'), day(4, '12:00')),
    page(PAGE.designSystem, PAGE.frontend, 'Design System',
      '# Design System\n\nสี / ตัวอักษร / spacing — ติดตามใน TB-4',
      USER.mint, day(3, '14:00'), day(5, '09:00')),
    page(PAGE.onboarding, null, 'Onboarding',
      '# Onboarding\n\nเริ่มต้นสำหรับคนใหม่',
      USER.ploy, day(2, '15:00'), day(2, '15:00')),
    page(PAGE.localSetup, PAGE.onboarding, 'Local Setup',
      '# Local Setup\n\n```bash\nmake up\n```\n\nกำลังรีวิวใน TB-9',
      USER.ploy, day(3, '15:00'), day(6, '15:00')),
    page(id('5e6f7081', 10), null, 'Roadmap Q4',
      '# Roadmap Q4\n\n- MVP: board + docs\n- Search (TB-10)',
      USER.duck, day(2, '16:00'), day(2, '16:00'), 'PM'),
  ];

  // Issue ↔ Page links (owned by tracker-service in the real system)
  const links = [
    { issueId: issueId(12), pageId: PAGE.boardSpec, createdAt: day(4) },
    { issueId: issueId(3), pageId: PAGE.boardSpec, createdAt: day(4) },
    { issueId: issueId(6), pageId: PAGE.grpc, createdAt: day(4) },
    { issueId: issueId(7), pageId: PAGE.database, createdAt: day(4) },
    { issueId: issueId(4), pageId: PAGE.designSystem, createdAt: day(5) },
    { issueId: issueId(2), pageId: PAGE.architecture, createdAt: day(3) },
  ];

  return { users, projects, issues, comments, spaces, pages, links };
}

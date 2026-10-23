/**
 * Mock data สำหรับ Storybook (และ MSW ใน Phase 2)
 * รูปร่างตรงกับ example ใน api/openapi.yaml — project `TB`, space `ENG`
 */
import type {
  Comment,
  Issue,
  IssueSummary,
  Page,
  PageSummary,
  PageTreeNode,
  Project,
  SearchResult,
  Space,
  User,
} from '@/types/api';

// ---------- Users ----------

export const userDuck: User = {
  id: '7f1c2a9e-0000-4000-8000-000000000001',
  email: 'duck@example.com',
  displayName: 'Duck',
  avatarUrl: null,
};

export const userMint: User = {
  id: '7f1c2a9e-0000-4000-8000-000000000002',
  email: 'mint@example.com',
  displayName: 'Mint',
  avatarUrl: null,
};

export const userPloy: User = {
  id: '7f1c2a9e-0000-4000-8000-000000000003',
  email: 'ploy@example.com',
  displayName: 'พลอย ศรีสุข',
  avatarUrl: null,
};

export const userKen: User = {
  id: '7f1c2a9e-0000-4000-8000-000000000004',
  email: 'ken@example.com',
  displayName: 'Ken Tanaka',
  avatarUrl: null,
};

export const users: User[] = [userDuck, userMint, userPloy, userKen];

// ---------- Projects / Spaces ----------

export const projectTB: Project = {
  id: '2b3c4d5e-0000-4000-8000-000000000001',
  key: 'TB',
  name: 'Tracking Board',
  description: 'Jira + Confluence สำหรับทีมเล็ก',
  leadId: userDuck.id,
  issueCount: 12,
  createdAt: '2026-10-01T09:00:00Z',
};

export const projectMKT: Project = {
  id: '2b3c4d5e-0000-4000-8000-000000000002',
  key: 'MKT',
  name: 'Marketing Site',
  description: 'เว็บไซต์การตลาด',
  leadId: userMint.id,
  issueCount: 4,
  createdAt: '2026-10-05T09:00:00Z',
};

export const projects: Project[] = [projectTB, projectMKT];

export const spaceENG: Space = {
  id: '6f708192-0000-4000-8000-000000000001',
  key: 'ENG',
  name: 'Engineering',
  description: 'เอกสารทีม dev',
  createdAt: '2026-10-01T09:00:00Z',
};

export const spaceDES: Space = {
  id: '6f708192-0000-4000-8000-000000000002',
  key: 'DES',
  name: 'Design',
  description: 'Design system & research',
  createdAt: '2026-10-02T09:00:00Z',
};

export const spaces: Space[] = [spaceENG, spaceDES];

// ---------- Issues ----------

/** helper เล็กๆ: สร้าง id แบบ uuid ตามเลข issue ให้ดูสมจริง */
function issueId(n: number): string {
  return `3c4d5e6f-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** helper สร้าง Issue — ใส่ค่า default ที่ใช้ซ้ำ แล้วให้ override เฉพาะที่ต่าง */
function makeIssue(n: number, fields: Partial<Issue> & Pick<Issue, 'title' | 'type' | 'status' | 'priority'>): Issue {
  return {
    id: issueId(n),
    key: `TB-${n}`,
    projectKey: 'TB',
    description: null,
    reporter: userDuck,
    assignee: null,
    position: n * 1024,
    labels: [],
    linkedPageCount: 0,
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-03T08:30:00Z',
    ...fields,
  };
}

export const issueTB12: Issue = makeIssue(12, {
  title: 'ทำหน้า Kanban board',
  type: 'STORY',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  assignee: userMint,
  labels: ['frontend', 'board'],
  linkedPageCount: 2,
  position: 1024,
  description: [
    'ลากการ์ดข้ามคอลัมน์ได้ ดู spec ที่หน้า **Board Spec**',
    '',
    '## Acceptance criteria',
    '- [x] แสดง 4 คอลัมน์ `TODO / IN_PROGRESS / IN_REVIEW / DONE`',
    '- [ ] Drag & drop เรียงลำดับในคอลัมน์ได้',
    '- [ ] เรียก `POST /issues/{key}/move` เมื่อปล่อยการ์ด',
    '',
    'เกี่ยวข้องกับ TB-3 และ TB-7',
  ].join('\n'),
});

export const issues: Issue[] = [
  makeIssue(1, {
    title: 'Setup monorepo + CI',
    type: 'TASK',
    status: 'DONE',
    priority: 'MEDIUM',
    assignee: userDuck,
    labels: ['devops'],
  }),
  makeIssue(2, {
    title: 'ออกแบบ Design system (DESIGN.md)',
    type: 'STORY',
    status: 'DONE',
    priority: 'HIGH',
    assignee: userPloy,
    labels: ['design'],
    linkedPageCount: 1,
  }),
  makeIssue(3, {
    title: 'API: POST /issues/{key}/move คำนวณ position',
    type: 'TASK',
    status: 'IN_REVIEW',
    priority: 'HIGH',
    assignee: userKen,
    labels: ['backend'],
    linkedPageCount: 1,
  }),
  makeIssue(4, {
    title: 'Login ไม่ได้เมื่อ email มีตัวพิมพ์ใหญ่',
    type: 'BUG',
    status: 'TODO',
    priority: 'HIGHEST',
    assignee: userKen,
    labels: ['auth', 'backend'],
  }),
  makeIssue(5, {
    title: 'Page tree ลากย้ายหน้าได้',
    type: 'STORY',
    status: 'TODO',
    priority: 'LOW',
    labels: ['docs'],
  }),
  makeIssue(6, {
    title: 'Search รวม issue + page',
    type: 'STORY',
    status: 'TODO',
    priority: 'MEDIUM',
    assignee: userMint,
    labels: ['search'],
  }),
  makeIssue(7, {
    title: 'การ์ดกระพริบตอนลากใน Safari',
    type: 'BUG',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    assignee: userMint,
    labels: ['frontend'],
  }),
  makeIssue(8, {
    title: 'เขียน E2E test สำหรับ board',
    type: 'TASK',
    status: 'TODO',
    priority: 'LOWEST',
    assignee: null,
    labels: ['qa'],
  }),
  makeIssue(9, {
    title: 'Render TB-xx ใน Markdown เป็นลิงก์',
    type: 'TASK',
    status: 'IN_REVIEW',
    priority: 'MEDIUM',
    assignee: userPloy,
    labels: ['frontend', 'docs'],
    linkedPageCount: 1,
  }),
  makeIssue(10, {
    title: 'Dark mode toggle',
    type: 'TASK',
    status: 'DONE',
    priority: 'LOW',
    assignee: userPloy,
    labels: ['design'],
  }),
  makeIssue(11, {
    title: 'Comment ภาษาไทยยาวๆ ตัดบรรทัดผิด',
    type: 'BUG',
    status: 'TODO',
    priority: 'HIGH',
    assignee: userDuck,
    labels: ['frontend'],
  }),
  issueTB12,
];

/** แปลง Issue → IssueSummary (ใช้ใน search / linked issues) */
export function toSummary(issue: Issue): IssueSummary {
  const { id, key, title, type, status, priority, assignee } = issue;
  return { id, key, title, type, status, priority, assignee };
}

/** หา issue จาก key เช่น "TB-12" (ใช้ใน MarkdownView เพื่อโชว์ title/status ใน chip) */
export function findIssueByKey(key: string): IssueSummary | undefined {
  const found = issues.find((issue) => issue.key === key);
  return found ? toSummary(found) : undefined;
}

// ---------- Comments ----------

export const commentsTB12: Comment[] = [
  {
    id: '4d5e6f70-0000-4000-8000-000000000001',
    issueKey: 'TB-12',
    author: userMint,
    body: 'เริ่มทำแล้ว ใช้ dnd-kit',
    createdAt: '2026-10-03T08:30:00Z',
  },
  {
    id: '4d5e6f70-0000-4000-8000-000000000002',
    issueKey: 'TB-12',
    author: userKen,
    body: 'API `move` พร้อมแล้วใน TB-3 ลองต่อดูได้เลยครับ',
    createdAt: '2026-10-03T10:15:00Z',
  },
  {
    id: '4d5e6f70-0000-4000-8000-000000000003',
    issueKey: 'TB-12',
    author: userPloy,
    body: 'การ์ดตอนลากขอให้**เอียงนิดนึง** + เงาเข้มขึ้น จะได้รู้สึกเหมือนหยิบ sticky note 🙂',
    createdAt: '2026-10-04T02:05:00Z',
  },
];

// ---------- Pages ----------

export const pageBoardSpec: Page = {
  id: '5e6f7081-0000-4000-8000-000000000001',
  spaceKey: 'ENG',
  parentId: '5e6f7081-0000-4000-8000-000000000010',
  title: 'Board Spec',
  contentMd: [
    '# Board Spec',
    '',
    'คอลัมน์: TODO / IN_PROGRESS / IN_REVIEW / DONE',
    '',
    'งานหลักอยู่ที่ TB-12 ส่วน API ดูที่ TB-3',
    '',
    '## Drag & drop',
    '',
    '1. ผู้ใช้ลากการ์ดไปวางในคอลัมน์ใหม่',
    '2. FE อัปเดต UI ทันที (optimistic) แล้วเรียก `POST /issues/{key}/move`',
    '3. ถ้า API error ให้ย้อนการ์ดกลับที่เดิม + แสดง Toast',
    '',
    '> **หมายเหตุ:** ข้อความ `TB-99` ใน code block จะไม่ถูกแปลงเป็นลิงก์',
    '',
    '| Status | สี | ไอคอน |',
    '|---|---|---|',
    '| TODO | เทา | วงกลม |',
    '| IN_PROGRESS | ฟ้า | วงกลมเส้นประ |',
    '| IN_REVIEW | ม่วง | ตา |',
    '| DONE | เขียว | ติ๊กถูก |',
  ].join('\n'),
  author: userDuck,
  createdAt: '2026-10-02T09:00:00Z',
  updatedAt: '2026-10-04T12:00:00Z',
};

export const pageTree: PageTreeNode[] = [
  {
    id: '5e6f7081-0000-4000-8000-000000000010',
    title: 'Product Specs',
    children: [
      { id: pageBoardSpec.id, title: 'Board Spec', children: [] },
      {
        id: '5e6f7081-0000-4000-8000-000000000011',
        title: 'Docs & Linking',
        children: [
          { id: '5e6f7081-0000-4000-8000-000000000012', title: 'Mention syntax (TB-12)', children: [] },
          { id: '5e6f7081-0000-4000-8000-000000000013', title: 'Page tree rules', children: [] },
        ],
      },
    ],
  },
  {
    id: '5e6f7081-0000-4000-8000-000000000020',
    title: 'Architecture',
    children: [
      { id: '5e6f7081-0000-4000-8000-000000000021', title: 'gRPC services', children: [] },
      { id: '5e6f7081-0000-4000-8000-000000000022', title: 'Database ต่อ service', children: [] },
    ],
  },
  { id: '5e6f7081-0000-4000-8000-000000000030', title: 'Onboarding สำหรับคนใหม่', children: [] },
];

export const linkedPagesTB12: PageSummary[] = [
  { id: pageBoardSpec.id, spaceKey: 'ENG', title: 'Board Spec', updatedAt: '2026-10-04T12:00:00Z' },
  {
    id: '5e6f7081-0000-4000-8000-000000000012',
    spaceKey: 'ENG',
    title: 'Mention syntax (TB-12)',
    updatedAt: '2026-10-05T03:00:00Z',
  },
];

/** issue ที่ลิงก์กับหน้า Board Spec (ทิศกลับ) */
export const linkedIssuesBoardSpec: IssueSummary[] = issues
  .filter((issue) => ['TB-12', 'TB-3', 'TB-7'].includes(issue.key))
  .map(toSummary);

// ---------- Search ----------

export const searchResultBoard: SearchResult = {
  issues: issues
    .filter((issue) => /board|Kanban|ลาก/i.test(issue.title))
    .map(toSummary),
  pages: [
    linkedPagesTB12[0]!,
    { id: '5e6f7081-0000-4000-8000-000000000013', spaceKey: 'ENG', title: 'Page tree rules', updatedAt: '2026-10-06T07:00:00Z' },
  ],
};

export const emptySearchResult: SearchResult = { issues: [], pages: [] };

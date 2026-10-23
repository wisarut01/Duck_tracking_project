/**
 * MSW handlers — ตอบ API ตาม `api/openapi.yaml` ด้วยข้อมูลจาก fixtures.ts
 * ทำงานในเบราว์เซอร์เอง ไม่ต้องรัน mock-api (:4010) เปิดด้วย `npm run dev:msw`
 *
 * - ใช้ type จาก spec (`@/types/api`) เป็น response type → ถ้า spec เปลี่ยน tsc จะฟ้องตรงนี้
 * - เป็น mock แบบอ่านอย่างเดียว: move / login ตอบกลับให้ดูเหมือนสำเร็จ แต่ไม่ได้เก็บ state
 * - path ขึ้นต้นด้วย `*` → match ทุก origin (mock :4010 หรือ gateway :8080)
 */
import { http, HttpResponse } from 'msw';
import type {
  ApiError,
  AuthResponse,
  Comment,
  Issue,
  IssueList,
  IssueSummary,
  LoginRequest,
  MoveIssueRequest,
  Page,
  PageSummary,
  PageTreeNode,
  Project,
  SearchResult,
  Space,
  User,
} from '@/types/api';
import { ISSUE_STATUSES } from '@/types/api';
import {
  commentsTB12,
  issues,
  linkedIssuesBoardSpec,
  linkedPagesTB12,
  pageBoardSpec,
  pageTree,
  projects,
  spaces,
  toSummary,
  userDuck,
  users,
} from './fixtures';

const API = '*/api/v1';

function error(status: 400 | 401 | 404, code: ApiError['error']['code'], message: string) {
  return HttpResponse.json<ApiError>({ error: { code, message } }, { status });
}

/** ลำดับตาม spec: คอลัมน์ (TODO → DONE) แล้ว position จากน้อยไปมาก */
const byBoardOrder = (a: Issue, b: Issue) =>
  ISSUE_STATUSES.indexOf(a.status) - ISSUE_STATUSES.indexOf(b.status) || a.position - b.position;

export const handlers = [
  // ---------- auth ----------
  http.post<never, LoginRequest, AuthResponse | ApiError>(`${API}/auth/login`, async ({ request }) => {
    const { email } = await request.json();
    const user = users.find((u) => u.email === email);
    if (!user) return error(401, 'UNAUTHENTICATED', 'wrong email or password');
    return HttpResponse.json({ accessToken: 'msw.mock.token', user });
  }),
  http.get<never, never, User>(`${API}/auth/me`, () => HttpResponse.json(userDuck)),
  http.get<never, never, User[]>(`${API}/users`, () => HttpResponse.json(users)),

  // ---------- projects / issues ----------
  http.get<never, never, Project[]>(`${API}/projects`, () => HttpResponse.json(projects)),
  http.get<{ projectKey: string }, never, Project | ApiError>(`${API}/projects/:projectKey`, ({ params }) => {
    const project = projects.find((p) => p.key === params.projectKey);
    return project ? HttpResponse.json(project) : error(404, 'NOT_FOUND', `project ${params.projectKey} not found`);
  }),
  http.get<{ projectKey: string }, never, IssueList>(`${API}/projects/:projectKey/issues`, ({ params, request }) => {
    const status = new URL(request.url).searchParams.get('status');
    const items = issues
      .filter((i) => i.projectKey === params.projectKey && (!status || i.status === status))
      .sort(byBoardOrder);
    return HttpResponse.json({ items, page: 1, pageSize: 50, total: items.length });
  }),
  http.get<{ issueKey: string }, never, Issue | ApiError>(`${API}/issues/:issueKey`, ({ params }) => {
    const issue = issues.find((i) => i.key === params.issueKey);
    return issue ? HttpResponse.json(issue) : error(404, 'NOT_FOUND', `issue ${params.issueKey} not found`);
  }),
  http.post<{ issueKey: string }, MoveIssueRequest, Issue | ApiError>(
    `${API}/issues/:issueKey/move`,
    async ({ params, request }) => {
      const issue = issues.find((i) => i.key === params.issueKey);
      if (!issue) return error(404, 'NOT_FOUND', `issue ${params.issueKey} not found`);
      const { status } = await request.json();
      return HttpResponse.json({ ...issue, status });
    },
  ),
  http.get<{ issueKey: string }, never, Comment[]>(`${API}/issues/:issueKey/comments`, ({ params }) =>
    HttpResponse.json(params.issueKey === 'TB-12' ? commentsTB12 : []),
  ),
  http.get<{ issueKey: string }, never, PageSummary[]>(`${API}/issues/:issueKey/links`, ({ params }) =>
    HttpResponse.json(params.issueKey === 'TB-12' ? linkedPagesTB12 : []),
  ),

  // ---------- docs ----------
  http.get<never, never, Space[]>(`${API}/spaces`, () => HttpResponse.json(spaces)),
  http.get<{ spaceKey: string }, never, Space | ApiError>(`${API}/spaces/:spaceKey`, ({ params }) => {
    const space = spaces.find((s) => s.key === params.spaceKey);
    return space ? HttpResponse.json(space) : error(404, 'NOT_FOUND', `space ${params.spaceKey} not found`);
  }),
  http.get<{ spaceKey: string }, never, PageTreeNode[]>(`${API}/spaces/:spaceKey/pages`, ({ params }) =>
    HttpResponse.json(params.spaceKey === 'ENG' ? pageTree : []),
  ),
  http.get<{ pageId: string }, never, Page | ApiError>(`${API}/pages/:pageId`, ({ params }) =>
    params.pageId === pageBoardSpec.id
      ? HttpResponse.json(pageBoardSpec)
      : error(404, 'NOT_FOUND', `page ${params.pageId} not found`),
  ),
  http.get<{ pageId: string }, never, IssueSummary[]>(`${API}/pages/:pageId/linked-issues`, ({ params }) =>
    HttpResponse.json(params.pageId === pageBoardSpec.id ? linkedIssuesBoardSpec : []),
  ),

  // ---------- search ----------
  http.get<never, never, SearchResult | ApiError>(`${API}/search`, ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.trim().toLowerCase();
    if (!q) return error(400, 'VALIDATION_FAILED', 'query/q must not be blank');
    const has = (text: string | null | undefined) => (text ?? '').toLowerCase().includes(q);
    return HttpResponse.json({
      issues: issues.filter((i) => has(i.key) || has(i.title)).map(toSummary),
      pages: linkedPagesTB12.filter((p) => has(p.title)),
    });
  }),
];

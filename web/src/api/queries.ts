/**
 * react-query hooks ของทุก endpoint ที่หน้าเว็บใช้
 *
 * - useXxx()          = อ่านข้อมูล (useQuery) → ได้ { data, isPending, error, ... }
 * - useXxxMutation()  = เขียนข้อมูล (useMutation) → เรียก mutateAsync(...) แล้ว refetch ส่วนที่เกี่ยว
 *
 * queryKey คือ "ชื่อ cache" ของข้อมูลแต่ละชุด รวมไว้ที่ `queryKeys` เพื่อให้ invalidate ถูกตัว
 */
import { useQuery, useMutation, useQueryClient, useQueries, type QueryClient } from '@tanstack/react-query';
import type {
  CreateIssueRequest,
  CreatePageRequest,
  Issue,
  IssueList,
  LoginRequest,
  MoveIssueRequest,
  RegisterRequest,
  UpdateIssueRequest,
  UpdatePageRequest,
} from '@/types/api';
import { computePosition } from '@/lib/position';
import { ISSUE_KEY_PATTERN } from '@/lib/mentions';
import { api, unwrap } from './client';
import { setToken } from './token';

export const queryKeys = {
  me: ['me'] as const,
  users: ['users'] as const,
  projects: ['projects'] as const,
  project: (projectKey: string) => ['projects', projectKey] as const,
  issues: (projectKey: string) => ['issues', projectKey] as const,
  issue: (issueKey: string) => ['issue', issueKey] as const,
  comments: (issueKey: string) => ['comments', issueKey] as const,
  issueLinks: (issueKey: string) => ['issue-links', issueKey] as const,
  spaces: ['spaces'] as const,
  space: (spaceKey: string) => ['spaces', spaceKey] as const,
  pageTree: (spaceKey: string) => ['page-tree', spaceKey] as const,
  page: (pageId: string) => ['page', pageId] as const,
  pageLinkedIssues: (pageId: string) => ['page-linked-issues', pageId] as const,
  search: (query: string) => ['search', query] as const,
};

/** issue เปลี่ยน → ข้อมูลที่โชว์ issue อยู่ต้องโหลดใหม่หมด (board, รายละเอียด, ผลค้นหา, ลิงก์, จำนวนใน sidebar) */
function invalidateIssues(queryClient: QueryClient) {
  for (const key of [['issues'], ['issue'], ['search'], ['page-linked-issues'], queryKeys.projects]) {
    void queryClient.invalidateQueries({ queryKey: key });
  }
}

// ---------- auth / users ----------

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: LoginRequest) => unwrap(api.POST('/auth/login', { body })),
    onSuccess: (auth) => {
      queryClient.clear(); // ข้อมูลของ user คนก่อน (ถ้ามี) ไม่ควรค้าง
      setToken(auth.accessToken);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RegisterRequest) => unwrap(api.POST('/auth/register', { body })),
    onSuccess: (auth) => {
      queryClient.clear();
      setToken(auth.accessToken);
    },
  });
}

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => unwrap(api.GET('/auth/me')) });
}

export function useUsers() {
  return useQuery({ queryKey: queryKeys.users, queryFn: () => unwrap(api.GET('/users')) });
}

// ---------- projects / issues ----------

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: () => unwrap(api.GET('/projects')) });
}

export function useProject(projectKey: string) {
  return useQuery({
    queryKey: queryKeys.project(projectKey),
    queryFn: () => unwrap(api.GET('/projects/{projectKey}', { params: { path: { projectKey } } })),
  });
}

/** issue ทั้ง project (board ใช้ทั้งหมด จึงขอ pageSize สูงสุด) — server เรียงตามคอลัมน์แล้ว position ให้แล้ว */
export function useIssues(projectKey: string) {
  return useQuery({
    queryKey: queryKeys.issues(projectKey),
    queryFn: () =>
      unwrap(api.GET('/projects/{projectKey}/issues', { params: { path: { projectKey }, query: { pageSize: 200 } } })),
  });
}

function issueQuery(issueKey: string) {
  return {
    queryKey: queryKeys.issue(issueKey),
    queryFn: () => unwrap(api.GET('/issues/{issueKey}', { params: { path: { issueKey } } })),
  };
}

export function useIssue(issueKey: string | undefined) {
  return useQuery({ ...issueQuery(issueKey ?? ''), enabled: Boolean(issueKey) });
}

/**
 * โหลด issue ทุกตัวที่ถูก mention ในข้อความ (เช่น "ดู TB-3") ไว้ใน cache
 * แล้ว resolveIssue() ใน AppData จะหาเจอ → chip โชว์ title/status ได้
 */
export function useMentionedIssues(texts: (string | null | undefined)[]) {
  const issueKeys = [...new Set(texts.flatMap((text) => [...(text ?? '').matchAll(new RegExp(ISSUE_KEY_PATTERN))].map((m) => m[0])))];
  return useQueries({ queries: issueKeys.map((key) => ({ ...issueQuery(key), retry: false })) });
}

export function useCreateIssueMutation(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateIssueRequest) =>
      unwrap(api.POST('/projects/{projectKey}/issues', { params: { path: { projectKey } }, body })),
    onSuccess: () => invalidateIssues(queryClient),
  });
}

export function useUpdateIssueMutation(issueKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateIssueRequest) =>
      unwrap(api.PATCH('/issues/{issueKey}', { params: { path: { issueKey } }, body })),
    onSuccess: (issue) => {
      queryClient.setQueryData(queryKeys.issue(issueKey), issue);
      invalidateIssues(queryClient);
    },
  });
}

/**
 * ย้ายการ์ด (drag & drop หรือเปลี่ยน status) แบบ optimistic:
 * แก้ cache ของ board ทันทีให้การ์ดอยู่ที่ใหม่ → ถ้า server ตอบ error ค่อยย้อนกลับ
 */
export function useMoveIssueMutation(projectKey: string) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.issues(projectKey);
  return useMutation({
    mutationFn: ({ issueKey, move }: { issueKey: string; move: MoveIssueRequest }) =>
      unwrap(api.POST('/issues/{issueKey}/move', { params: { path: { issueKey } }, body: move })),
    onMutate: async ({ issueKey, move }) => {
      await queryClient.cancelQueries({ queryKey: listKey }); // กัน refetch เก่ามาทับค่าที่เพิ่งแก้
      const previous = queryClient.getQueryData<IssueList>(listKey);
      if (previous) {
        const moved = (issue: Issue): Issue =>
          issue.key === issueKey ? { ...issue, status: move.status, position: computePosition(previous.items, issueKey, move) } : issue;
        queryClient.setQueryData<IssueList>(listKey, { ...previous, items: previous.items.map(moved) });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => invalidateIssues(queryClient),
  });
}

// ---------- comments / links ----------

export function useComments(issueKey: string | undefined) {
  return useQuery({
    queryKey: queryKeys.comments(issueKey ?? ''),
    queryFn: () => unwrap(api.GET('/issues/{issueKey}/comments', { params: { path: { issueKey: issueKey! } } })),
    enabled: Boolean(issueKey),
  });
}

export function useAddCommentMutation(issueKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      unwrap(api.POST('/issues/{issueKey}/comments', { params: { path: { issueKey } }, body: { body } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.comments(issueKey) }),
  });
}

export function useIssueLinks(issueKey: string | undefined) {
  return useQuery({
    queryKey: queryKeys.issueLinks(issueKey ?? ''),
    queryFn: () => unwrap(api.GET('/issues/{issueKey}/links', { params: { path: { issueKey: issueKey! } } })),
    enabled: Boolean(issueKey),
  });
}

/** ยกเลิกลิงก์ issue ↔ page — โหลดใหม่ทั้งสองฝั่ง */
export function useUnlinkMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueKey, pageId }: { issueKey: string; pageId: string }) =>
      unwrap(api.DELETE('/issues/{issueKey}/links/{pageId}', { params: { path: { issueKey, pageId } } })),
    onSuccess: (_data, { issueKey, pageId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.issueLinks(issueKey) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pageLinkedIssues(pageId) });
      invalidateIssues(queryClient); // linkedPageCount เปลี่ยน
    },
  });
}

// ---------- docs ----------

export function useSpaces() {
  return useQuery({ queryKey: queryKeys.spaces, queryFn: () => unwrap(api.GET('/spaces')) });
}

export function useSpace(spaceKey: string) {
  return useQuery({
    queryKey: queryKeys.space(spaceKey),
    queryFn: () => unwrap(api.GET('/spaces/{spaceKey}', { params: { path: { spaceKey } } })),
  });
}

export function usePageTree(spaceKey: string) {
  return useQuery({
    queryKey: queryKeys.pageTree(spaceKey),
    queryFn: () => unwrap(api.GET('/spaces/{spaceKey}/pages', { params: { path: { spaceKey } } })),
  });
}

export function usePage(pageId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.page(pageId ?? ''),
    queryFn: () => unwrap(api.GET('/pages/{pageId}', { params: { path: { pageId: pageId! } } })),
    enabled: Boolean(pageId),
  });
}

export function usePageLinkedIssues(pageId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pageLinkedIssues(pageId ?? ''),
    queryFn: () => unwrap(api.GET('/pages/{pageId}/linked-issues', { params: { path: { pageId: pageId! } } })),
    enabled: Boolean(pageId),
  });
}

export function useCreatePageMutation(spaceKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePageRequest) =>
      unwrap(api.POST('/spaces/{spaceKey}/pages', { params: { path: { spaceKey } }, body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pageTree(spaceKey) }),
  });
}

export function useUpdatePageMutation(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePageRequest) => unwrap(api.PATCH('/pages/{pageId}', { params: { path: { pageId } }, body })),
    onSuccess: (page) => {
      queryClient.setQueryData(queryKeys.page(pageId), page);
      void queryClient.invalidateQueries({ queryKey: queryKeys.pageTree(page.spaceKey) }); // title ใน tree
      void queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
}

// ---------- search ----------

export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: queryKeys.search(q),
    queryFn: () => unwrap(api.GET('/search', { params: { query: { q } } })),
    enabled: q.length > 0, // spec: q ว่างไม่ได้ → ไม่ต้องยิง
    placeholderData: (previous) => previous, // พิมพ์ต่อแล้วผลเก่ายังโชว์ระหว่างรอ ไม่กระพริบ
  });
}

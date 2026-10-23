import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Issue, IssueList, IssueSummary } from '@/types/api';
import { AppDataProvider, type AppData } from '@/lib/appData';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import {
  queryKeys,
  useCreateProjectMutation,
  useCreateSpaceMutation,
  useMe,
  useProjects,
  useSearch,
  useSpaces,
  useUsers,
} from '@/api/queries';
import { useToast } from '@/components/ui/Toast';
import { setToken } from '@/api/token';

/** หา issue ที่โหลดไว้แล้วใน cache (จาก GET /issues/{key} หรือรายการบน board) — ไม่ยิง API เพิ่ม */
function findCachedIssue(queryClient: QueryClient, issueKey: string): IssueSummary | undefined {
  const single = queryClient.getQueryData<Issue>(queryKeys.issue(issueKey));
  if (single) return single;
  for (const [, list] of queryClient.getQueriesData<IssueList>({ queryKey: ['issues'] })) {
    const found = list?.items.find((issue) => issue.key === issueKey);
    if (found) return found;
  }
  return undefined;
}

/** ค้นหาผ่าน GET /search โดยรอให้หยุดพิมพ์ก่อน */
function useApiSearch(query: string) {
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed);
  const search = useSearch(debounced);
  return {
    results: debounced ? (search.data ?? null) : null,
    loading: trimmed !== debounced || search.isFetching,
  };
}

/** AppData ของแอปจริง: ข้อมูลทั้งหมดมาจาก API (ดู src/lib/appData.tsx) */
export function ApiAppDataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const projects = useProjects();
  const spaces = useSpaces();
  const me = useMe();
  const users = useUsers();
  const navigate = useNavigate();
  const toast = useToast();
  // mutateAsync เป็นฟังก์ชันเดิมทุก render → ใส่ใน useMemo ได้โดยไม่ทำให้ value เปลี่ยนบ่อย
  const { mutateAsync: createProject } = useCreateProjectMutation();
  const { mutateAsync: createSpace } = useCreateSpaceMutation();

  const value = useMemo<AppData>(
    () => ({
      projects: projects.data ?? [],
      spaces: spaces.data ?? [],
      currentUser: me.data,
      users: users.data ?? [],
      resolveIssue: (issueKey) => findCachedIssue(queryClient, issueKey),
      useSearch: useApiSearch,
      onCreateProject: async (request) => {
        const project = await createProject(request);
        toast({ tone: 'success', title: `สร้าง project ${project.key} แล้ว` });
        navigate(`/projects/${project.key}/board`);
      },
      onCreateSpace: async (request) => {
        const space = await createSpace(request);
        toast({ tone: 'success', title: `สร้าง space ${space.key} แล้ว` });
        navigate(`/spaces/${space.key}`);
      },
      onLogout: () => {
        setToken(null); // RequireAuth เห็นว่าไม่มี token → พาไปหน้า login
        queryClient.clear();
      },
    }),
    [projects.data, spaces.data, me.data, users.data, queryClient, createProject, createSpace, navigate, toast],
  );

  return <AppDataProvider value={value}>{children}</AppDataProvider>;
}

import { useParams, useSearchParams } from 'react-router';
import { errorMessage } from '@/api/client';
import {
  useComments,
  useCreateIssueMutation,
  useIssueLinks,
  useIssues,
  useMentionedIssues,
  useMoveIssueMutation,
  useProject,
  useUpdateProjectMutation,
} from '@/api/queries';
import { useToast } from '@/components/ui/Toast';
import { ProjectBoardScreen } from '@/screens/ProjectBoardScreen';
import { ErrorScreen, LoadingScreen } from './StatusScreens';
import { useIssueActions } from './useIssueActions';

/** /projects/:projectKey/board — issue ที่เปิด drawer เก็บใน URL (?issue=TB-12) จะได้แชร์ลิงก์ได้ */
export function BoardPage() {
  const { projectKey = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const openIssueKey = params.get('issue') ?? undefined;
  const toast = useToast();

  const project = useProject(projectKey);
  const issues = useIssues(projectKey);
  const openIssue = issues.data?.items.find((issue) => issue.key === openIssueKey);
  const comments = useComments(openIssue?.key);
  const linkedPages = useIssueLinks(openIssue?.key);
  useMentionedIssues([openIssue?.description, ...(comments.data ?? []).map((comment) => comment.body)]);

  const issueActions = useIssueActions(openIssue, { onDeleted: () => setParams({}) });
  const move = useMoveIssueMutation(projectKey);
  const createIssue = useCreateIssueMutation(projectKey);
  const updateProject = useUpdateProjectMutation(projectKey);

  // error แสดงเฉพาะตอนยังไม่มีข้อมูล: โหลดซ้ำพลาดต้องไม่ปิด drawer ที่กำลังแก้อยู่
  if (project.error && !project.data) return <ErrorScreen error={project.error} onRetry={() => void project.refetch()} />;
  if (issues.error && !issues.data) return <ErrorScreen error={issues.error} onRetry={() => void issues.refetch()} />;
  if (!project.data) return <LoadingScreen />;

  return (
    <ProjectBoardScreen
      project={project.data}
      issues={issues.data?.items ?? []}
      loading={issues.isPending}
      openIssueKey={openIssueKey}
      onOpenIssue={(issueKey) => setParams(issueKey ? { issue: issueKey } : {})}
      openIssueDetails={{
        comments: comments.data ?? [],
        linkedPages: linkedPages.data ?? [],
        loadingComments: comments.isLoading,
      }}
      issueActions={issueActions}
      onMoveIssue={(issueKey, request) =>
        move.mutate(
          { issueKey, move: request },
          { onError: (error) => toast({ tone: 'error', title: `ย้าย ${issueKey} ไม่สำเร็จ`, description: errorMessage(error) }) },
        )
      }
      onUpdateProject={async (changes) => {
        await updateProject.mutateAsync(changes); // error → ฟอร์มโชว์ข้อความเอง
        toast({ tone: 'success', title: 'บันทึก project แล้ว' });
      }}
      onCreateIssue={async (request) => {
        const issue = await createIssue.mutateAsync(request); // error → modal โชว์ข้อความเอง
        toast({ tone: 'success', title: `สร้าง ${issue.key} แล้ว`, description: issue.title });
      }}
    />
  );
}

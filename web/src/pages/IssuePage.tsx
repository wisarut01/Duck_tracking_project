import { useNavigate, useParams } from 'react-router';
import { useComments, useIssue, useIssueLinks, useMentionedIssues } from '@/api/queries';
import { IssueDetailScreen } from '@/screens/IssueDetailScreen';
import { ErrorScreen, LoadingScreen } from './StatusScreens';
import { useIssueActions } from './useIssueActions';

/** /issues/:issueKey */
export function IssuePage() {
  const { issueKey = '' } = useParams();
  const issue = useIssue(issueKey);
  const comments = useComments(issueKey);
  const linkedPages = useIssueLinks(issueKey);
  useMentionedIssues([issue.data?.description, ...(comments.data ?? []).map((comment) => comment.body)]);
  const navigate = useNavigate();
  const actions = useIssueActions(issue.data, {
    onDeleted: () => navigate(`/projects/${issue.data?.projectKey}/board`, { replace: true }),
  });

  // error แสดงเฉพาะตอนยังไม่มีข้อมูล: โหลดซ้ำพลาดต้องไม่ปิดข้อความที่กำลังแก้อยู่
  if (issue.error && !issue.data) return <ErrorScreen error={issue.error} onRetry={() => void issue.refetch()} />;
  if (!issue.data) return <LoadingScreen />;

  return (
    <IssueDetailScreen
      issue={issue.data}
      comments={comments.data ?? []}
      linkedPages={linkedPages.data ?? []}
      loadingComments={comments.isLoading}
      actions={actions}
    />
  );
}

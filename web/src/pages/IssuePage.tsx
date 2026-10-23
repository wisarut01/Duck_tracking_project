import { useParams } from 'react-router';
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
  const actions = useIssueActions(issue.data);

  if (issue.error) return <ErrorScreen error={issue.error} onRetry={() => void issue.refetch()} />;
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

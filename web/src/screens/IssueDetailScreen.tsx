import type { Comment, Issue, PageSummary } from '@/types/api';
import { useAppData } from '@/lib/appData';
import { AppShell } from '@/components/layout/AppShell';
import { IssueDetailPanel, type IssueActions } from '@/components/issues/IssueDetailPanel';

export interface IssueDetailScreenProps {
  issue: Issue;
  comments: Comment[];
  linkedPages: PageSummary[];
  loadingComments?: boolean;
  actions?: IssueActions;
}

/** หน้า /issues/TB-12 แบบเต็มหน้า (ตัวที่ดึงข้อมูลคือ src/pages/IssuePage.tsx) */
export function IssueDetailScreen({ issue, comments, linkedPages, loadingComments, actions }: IssueDetailScreenProps) {
  const { projects, users, currentUser, resolveIssue } = useAppData();
  const project = projects.find((item) => item.key === issue.projectKey);

  return (
    <AppShell
      sidebar={{ activeProjectKey: issue.projectKey }}
      breadcrumbs={[
        { label: project?.name ?? issue.projectKey, to: `/projects/${issue.projectKey}/board` },
        { label: issue.key },
      ]}
    >
      <div className="mx-auto max-w-6xl p-3 sm:p-6">
        <IssueDetailPanel
          // key รวม updatedAt → ข้อมูลจาก server เปลี่ยนเมื่อไหร่ panel เริ่มใหม่จากค่าล่าสุด
          key={`${issue.key}-${issue.updatedAt}`}
          issue={issue}
          comments={comments}
          linkedPages={linkedPages}
          users={users}
          currentUser={currentUser}
          resolveIssue={resolveIssue}
          loadingComments={loadingComments}
          {...actions}
        />
      </div>
    </AppShell>
  );
}

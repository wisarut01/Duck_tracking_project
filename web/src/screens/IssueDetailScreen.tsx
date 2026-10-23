import { useState } from 'react';
import type { Comment, Issue, PageSummary } from '@/types/api';
import { AppShell } from '@/components/layout/AppShell';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { IssueDetailPanel } from '@/components/issues/IssueDetailPanel';
import { findIssueByKey, projects, spaces, userDuck, users } from '@/mocks/fixtures';
import { searchFixtures } from '@/mocks/search';

export interface IssueDetailScreenProps {
  issue: Issue;
  comments: Comment[];
  linkedPages: PageSummary[];
  loadingComments?: boolean;
}

/** หน้า /issues/TB-12 แบบเต็มหน้า */
export function IssueDetailScreen(props: IssueDetailScreenProps) {
  return (
    <ToastProvider>
      <IssueDetailContent {...props} />
    </ToastProvider>
  );
}

function IssueDetailContent({ issue, comments: initialComments, linkedPages: initialPages, loadingComments }: IssueDetailScreenProps) {
  const toast = useToast();
  const [comments, setComments] = useState(initialComments);
  const [linkedPages, setLinkedPages] = useState(initialPages);

  return (
    <AppShell
      sidebar={{ projects, spaces, activeProjectKey: issue.projectKey, currentUser: userDuck }}
      breadcrumbs={[{ label: 'Tracking Board' }, { label: 'Issues' }, { label: issue.key }]}
      search={searchFixtures}
    >
      <div className="mx-auto max-w-6xl p-6">
        <IssueDetailPanel
          issue={issue}
          comments={comments}
          linkedPages={linkedPages}
          users={users}
          currentUser={userDuck}
          resolveIssue={findIssueByKey}
          loadingComments={loadingComments}
          onUpdate={(changes) => toast({ tone: 'info', title: 'PATCH /issues/' + issue.key, description: JSON.stringify(changes) })}
          onStatusChange={(status) => toast({ tone: 'success', title: `ย้าย ${issue.key} → ${status}` })}
          onAddComment={(body) =>
            setComments((current) => [
              ...current,
              { id: crypto.randomUUID(), issueKey: issue.key, author: userDuck, body, createdAt: new Date().toISOString() },
            ])
          }
          onLinkPage={() => toast({ tone: 'info', title: 'เลือกหน้าที่จะลิงก์ (Phase 2)' })}
          onUnlinkPage={(pageId) => {
            setLinkedPages((current) => current.filter((page) => page.id !== pageId));
            toast({ tone: 'success', title: 'ยกเลิกลิงก์แล้ว' });
          }}
        />
      </div>
    </AppShell>
  );
}

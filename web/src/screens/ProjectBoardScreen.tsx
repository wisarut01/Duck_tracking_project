import { useState } from 'react';
import { errorMessage } from '@/api/client';
import { useAppData } from '@/lib/appData';
import { cn } from '@/lib/cn';
import { issueTypeMeta } from '@/lib/issueMeta';
import {
  ISSUE_TYPES,
  type Comment,
  type CreateIssueRequest,
  type Issue,
  type IssueType,
  type MoveIssueRequest,
  type PageSummary,
  type Project,
} from '@/types/api';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { CreateIssueModal } from '@/components/issues/CreateIssueModal';
import { IssueDetailPanel, type IssueActions } from '@/components/issues/IssueDetailPanel';
import { IssueTypeIcon } from '@/components/issues/IssueTypeIcon';
import { KanbanBoard } from '@/components/issues/KanbanBoard';

export interface ProjectBoardScreenProps {
  project: Project;
  issues: Issue[];
  loading?: boolean;
  /** issue ที่เปิด drawer อยู่ (undefined = ปิด) */
  openIssueKey?: string;
  onOpenIssue?: (issueKey: string | undefined) => void;
  /** comment / หน้าที่ลิงก์ของ issue ที่เปิดอยู่ */
  openIssueDetails?: { comments: Comment[]; linkedPages: PageSummary[]; loadingComments?: boolean };
  /** สิ่งที่ทำได้ใน drawer (แก้ field, comment, ยกเลิกลิงก์) */
  issueActions?: IssueActions;
  onMoveIssue?: (issueKey: string, move: MoveIssueRequest) => void;
  /** สร้าง issue — throw เมื่อไม่สำเร็จ แล้ว modal จะโชว์ข้อความ error */
  onCreateIssue?: (request: CreateIssueRequest) => Promise<unknown> | void;
}

/**
 * หน้า Board ของ project — แสดงผลอย่างเดียว ข้อมูลมาจาก props และแจ้งการกระทำผ่าน callback
 * (ตัวที่ดึงข้อมูลจาก API คือ src/pages/BoardPage.tsx)
 */
export function ProjectBoardScreen({
  project,
  issues,
  loading = false,
  openIssueKey,
  onOpenIssue,
  openIssueDetails,
  issueActions,
  onMoveIssue,
  onCreateIssue,
}: ProjectBoardScreenProps) {
  const { users, currentUser, resolveIssue } = useAppData();
  const [createOpen, setCreateOpen] = useState(false);
  // เพิ่มทุกครั้งที่เปิดฟอร์ม → ใช้เป็น key ให้ฟอร์มเริ่มว่างใหม่ ไม่ค้างค่าจากครั้งก่อน
  const [createCount, setCreateCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  // ตัวกรอง: assignee (id) และ type
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<IssueType | null>(null);

  const visibleIssues = issues.filter(
    (issue) => (!assigneeFilter || issue.assignee?.id === assigneeFilter) && (!typeFilter || issue.type === typeFilter),
  );
  const openIssue = issues.find((issue) => issue.key === openIssueKey);
  // KanbanBoard เก็บลำดับการ์ดใน state ของตัวเอง → เปลี่ยน key เมื่อข้อมูลเปลี่ยนเพื่อให้เริ่มใหม่จาก props ล่าสุด
  const boardKey = visibleIssues.map((issue) => `${issue.key}:${issue.status}:${issue.position}`).join(',');

  function openCreate() {
    setCreateCount((count) => count + 1);
    setCreateError(undefined);
    setCreateOpen(true);
  }

  async function handleCreate(request: CreateIssueRequest) {
    setCreating(true);
    setCreateError(undefined);
    try {
      await onCreateIssue?.(request);
      setCreateOpen(false);
    } catch (error) {
      setCreateError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell
      sidebar={{ activeProjectKey: project.key }}
      breadcrumbs={[{ label: project.name }, { label: 'Board' }]}
      onCreate={openCreate}
      onSelectIssue={(issue) => onOpenIssue?.(issue.key)}
      canvas
    >
      <div className="flex h-full">
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          {/* หัวหน้า board */}
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <div className="mr-auto min-w-0 basis-full sm:basis-auto">
              <p className="font-mono text-xs font-bold text-ink-subtle">{project.key}</p>
              <h1 className="text-2xl font-extrabold wrap-anywhere text-ink">{project.name}</h1>
              {project.description && <p className="text-sm text-ink-muted">{project.description}</p>}
            </div>

            {/* filter: คลิก avatar เพื่อดูเฉพาะงานของคนนั้น */}
            <div role="group" aria-label="กรองตามผู้รับผิดชอบ" className="flex items-center -space-x-1.5">
              {users.map((user) => {
                const active = assigneeFilter === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={`เฉพาะงานของ ${user.displayName}`}
                    onClick={() => setAssigneeFilter(active ? null : user.id)}
                    className={cn('rounded-full transition-transform hover:z-10 hover:-translate-y-0.5', active && 'z-10 ring-2 ring-brand ring-offset-2 ring-offset-canvas')}
                  >
                    <Avatar user={user} />
                  </button>
                );
              })}
            </div>

            <div role="group" aria-label="กรองตาม type" className="flex gap-1 rounded-xl border border-border bg-surface p-1 shadow-sm">
              {ISSUE_TYPES.map((type) => {
                const active = typeFilter === type;
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTypeFilter(active ? null : type)}
                    className={cn(
                      'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-colors',
                      active ? 'bg-brand-soft text-ink' : 'text-ink-muted hover:bg-surface-muted',
                    )}
                  >
                    <IssueTypeIcon type={type} size="sm" />
                    {issueTypeMeta[type].label}
                  </button>
                );
              })}
            </div>
          </div>

          <KanbanBoard
            key={boardKey}
            issues={visibleIssues}
            loading={loading}
            onMoveIssue={onMoveIssue}
            onOpenIssue={onOpenIssue}
            onAddIssue={openCreate}
          />
        </div>

        {/* drawer: จอใหญ่ (lg+) อยู่ข้าง board, จอเล็กเปิดทับเต็มจอ */}
        {openIssue && (
          <div className="fixed inset-0 z-30 flex justify-end bg-black/30 lg:sticky lg:inset-auto lg:top-0 lg:z-auto lg:h-full lg:shrink-0 lg:bg-transparent"
            // จอเล็ก: แตะพื้นหลังมืดๆ นอก drawer เพื่อปิด
            onClick={(event) => event.target === event.currentTarget && onOpenIssue?.(undefined)}
          >
            <IssueDetailPanel
              key={openIssue.key}
              layout="panel"
              issue={openIssue}
              comments={openIssueDetails?.comments ?? []}
              linkedPages={openIssueDetails?.linkedPages ?? []}
              loadingComments={openIssueDetails?.loadingComments}
              users={users}
              currentUser={currentUser}
              resolveIssue={resolveIssue}
              onClose={() => onOpenIssue?.(undefined)}
              {...issueActions}
            />
          </div>
        )}
      </div>

      <CreateIssueModal
        key={createCount}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectKey={project.key}
        users={users}
        submitting={creating}
        serverError={createError}
        onSubmit={handleCreate}
      />
    </AppShell>
  );
}

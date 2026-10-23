import { useState } from 'react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/cn';
import { issueTypeMeta } from '@/lib/issueMeta';
import { ISSUE_TYPES, type Issue, type IssueType, type MoveIssueRequest, type Project } from '@/types/api';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { CreateIssueModal } from '@/components/issues/CreateIssueModal';
import { IssueDetailPanel } from '@/components/issues/IssueDetailPanel';
import { IssueTypeIcon } from '@/components/issues/IssueTypeIcon';
import { KanbanBoard } from '@/components/issues/KanbanBoard';
import {
  commentsTB12,
  findIssueByKey,
  linkedPagesTB12,
  projects,
  spaces,
  userDuck,
  users,
} from '@/mocks/fixtures';
import { searchFixtures } from '@/mocks/search';

export interface ProjectBoardScreenProps {
  project: Project;
  issues: Issue[];
  loading?: boolean;
  /** เปิด drawer ของ issue นี้ไว้ตั้งแต่แรก */
  defaultOpenIssueKey?: string;
}

/** คำนวณ position ใหม่แบบเดียวกับ server: ค่ากลางระหว่างการ์ดก่อน/หลัง */
function computePosition(all: Issue[], move: MoveIssueRequest): number {
  const after = all.find((issue) => issue.key === move.afterKey);
  const before = all.find((issue) => issue.key === move.beforeKey);
  if (after && before) return (after.position + before.position) / 2;
  if (after) return after.position + 1024;
  if (before) return before.position - 1024;
  return 1024;
}

/** หน้า Board ของ project — ใช้ mock data + state ในหน้า (Phase 2 เปลี่ยนเป็น react-query) */
export function ProjectBoardScreen(props: ProjectBoardScreenProps) {
  // ToastProvider ต้องอยู่ "เหนือ" component ที่เรียก useToast() จึงแยกเป็น 2 ชั้น
  return (
    <ToastProvider>
      <ProjectBoardContent {...props} />
    </ToastProvider>
  );
}

function ProjectBoardContent({ project, issues: initialIssues, loading = false, defaultOpenIssueKey }: ProjectBoardScreenProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const [issues, setIssues] = useState(initialIssues);
  const [createOpen, setCreateOpen] = useState(false);
  const [openIssueKey, setOpenIssueKey] = useState<string | undefined>(defaultOpenIssueKey);
  // ตัวกรอง: assignee (id) และ type
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<IssueType | null>(null);

  const visibleIssues = issues.filter(
    (issue) => (!assigneeFilter || issue.assignee?.id === assigneeFilter) && (!typeFilter || issue.type === typeFilter),
  );
  const openIssue = issues.find((issue) => issue.key === openIssueKey);

  function handleMove(issueKey: string, move: MoveIssueRequest) {
    setIssues((current) =>
      current.map((issue) =>
        issue.key === issueKey ? { ...issue, status: move.status, position: computePosition(current, move) } : issue,
      ),
    );
    toast({ tone: 'success', title: `ย้าย ${issueKey} แล้ว`, description: `POST /issues/${issueKey}/move → ${move.status}` });
  }

  return (
    <AppShell
      sidebar={{ projects, spaces, activeProjectKey: project.key, currentUser: userDuck }}
      breadcrumbs={[{ label: project.name }, { label: 'Board' }]}
      onCreate={() => setCreateOpen(true)}
      search={searchFixtures}
      onSelectIssue={(issue) => setOpenIssueKey(issue.key)}
      onSelectPage={(page) => navigate(`/spaces/${page.spaceKey}/pages/${page.id}`)}
      canvas
    >
      <div className="flex h-full">
        <div className="min-w-0 flex-1 p-6">
          {/* หัวหน้า board */}
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <div className="mr-auto">
              <p className="font-mono text-xs font-bold text-ink-subtle">{project.key}</p>
              <h1 className="text-2xl font-extrabold text-ink">{project.name}</h1>
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

          {/* key เปลี่ยนเมื่อ filter/จำนวน issue เปลี่ยน → KanbanBoard สร้าง state ใหม่จาก issues ล่าสุด */}
          <KanbanBoard
            key={`${assigneeFilter}-${typeFilter}-${issues.length}`}
            issues={visibleIssues}
            loading={loading}
            onMoveIssue={handleMove}
            onOpenIssue={setOpenIssueKey}
            onAddIssue={() => setCreateOpen(true)}
          />
        </div>

        {openIssue && (
          <div className="sticky top-0 h-full shrink-0">
            <IssueDetailPanel
              key={openIssue.key}
              layout="panel"
              issue={openIssue}
              comments={openIssue.key === 'TB-12' ? commentsTB12 : []}
              linkedPages={openIssue.key === 'TB-12' ? linkedPagesTB12 : []}
              users={users}
              currentUser={userDuck}
              resolveIssue={findIssueByKey}
              onClose={() => setOpenIssueKey(undefined)}
              onAddComment={() => toast({ tone: 'success', title: 'เพิ่ม comment แล้ว' })}
            />
          </div>
        )}
      </div>

      <CreateIssueModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectKey={project.key}
        users={users}
        onSubmit={(request) => {
          const nextNumber = Math.max(...issues.map((issue) => Number(issue.key.split('-')[1]))) + 1;
          const now = new Date().toISOString();
          const created: Issue = {
            id: crypto.randomUUID(),
            key: `${project.key}-${nextNumber}`,
            projectKey: project.key,
            title: request.title,
            type: request.type,
            status: 'TODO',
            priority: request.priority ?? 'MEDIUM',
            assignee: users.find((user) => user.id === request.assigneeId) ?? null,
            reporter: userDuck,
            description: request.description ?? null,
            labels: request.labels ?? [],
            position: 0,
            linkedPageCount: 0,
            createdAt: now,
            updatedAt: now,
          };
          setIssues((current) => [created, ...current]);
          setCreateOpen(false);
          toast({ tone: 'success', title: `สร้าง ${created.key} แล้ว`, description: created.title });
        }}
      />
    </AppShell>
  );
}

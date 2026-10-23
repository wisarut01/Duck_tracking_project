import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { issueStatusMeta, stickyClasses } from '@/lib/issueMeta';
import type { IssueStatus } from '@/types/api';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IssueCardSkeleton } from '@/components/ui/Skeleton';
import type { IssueCardData } from './IssueCard';
import { SortableIssueCard } from './SortableIssueCard';

export interface BoardColumnProps {
  status: IssueStatus;
  /** issue ในคอลัมน์ เรียงตาม position แล้ว */
  issues: IssueCardData[];
  onOpenIssue?: (issueKey: string) => void;
  /** ปุ่ม + บนหัวคอลัมน์ */
  onAddIssue?: (status: IssueStatus) => void;
  loading?: boolean;
}

/**
 * คอลัมน์หนึ่งบน Kanban board — ต้องอยู่ภายใน <DndContext> (KanbanBoard ครอบให้)
 * useDroppable ทำให้วางการ์ดลง "พื้นที่ว่าง" ของคอลัมน์ได้ (ไม่ต้องวางบนการ์ดอื่น)
 */
export function BoardColumn({ status, issues, onOpenIssue, onAddIssue, loading = false }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = issueStatusMeta[status];
  const sticky = stickyClasses[meta.color];
  const StatusIcon = meta.icon;
  const headingId = `column-${status}`;

  return (
    <section
      aria-labelledby={headingId}
      className="flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-surface-muted/80 backdrop-blur-sm"
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-md', sticky.bg, sticky.ink)}>
          <StatusIcon size={14} strokeWidth={2.75} aria-hidden />
        </span>
        <h2 id={headingId} className="text-sm font-bold text-ink">
          {meta.label}
        </h2>
        <span className="rounded-full bg-surface px-2 text-xs font-bold text-ink-muted" aria-label={`${issues.length} issues`}>
          {issues.length}
        </span>
        {onAddIssue && (
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            className="ml-auto h-7 w-7"
            aria-label={`เพิ่ม issue ใน ${meta.label}`}
            onClick={() => onAddIssue(status)}
          >
            <Plus size={16} aria-hidden />
          </Button>
        )}
      </header>

      {/* SortableContext = รายการที่เรียงลำดับใหม่ได้ (items ต้องเป็น id เดียวกับ useSortable) */}
      <SortableContext items={issues.map((issue) => issue.key)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'mx-2 mb-2 flex min-h-32 flex-1 flex-col gap-2.5 rounded-xl p-1 transition-colors',
            isOver && 'bg-brand-soft/70 outline-2 outline-dashed outline-brand',
          )}
        >
          {loading ? (
            <>
              <IssueCardSkeleton />
              <IssueCardSkeleton />
            </>
          ) : issues.length === 0 ? (
            <EmptyState compact title="ว่าง" description="ลากการ์ดมาวางที่นี่" className="my-auto opacity-80" />
          ) : (
            issues.map((issue) => <SortableIssueCard key={issue.key} issue={issue} onOpen={onOpenIssue} />)
          )}
        </div>
      </SortableContext>
    </section>
  );
}

import { useId, useState } from 'react';
import { Link2, Plus, Unlink } from 'lucide-react';
import type { IssueSummary } from '@/types/api';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { IssueMentionChip } from '@/components/issues/IssueMentionChip';
import { IssueTypeIcon } from '@/components/issues/IssueTypeIcon';
import { StatusPill } from '@/components/issues/StatusPill';
import { LinkPickerModal } from '@/components/links/LinkPickerModal';

export interface LinkedIssuesPanelProps {
  /** จาก GET /pages/{pageId}/linked-issues */
  issues: IssueSummary[];
  /** ลิงก์ issue ที่เลือกจากหน้าค้นหา (POST /issues/{key}/links) — ไม่ส่งมา = ไม่มีปุ่ม "Link" */
  onLink?: (issue: IssueSummary) => Promise<unknown> | void;
  /** ยกเลิกลิงก์ (DELETE /issues/{key}/links/{pageId}) */
  onUnlink?: (issueKey: string) => void;
  loading?: boolean;
}

/** กล่องรายการ issue ที่ลิงก์กับหน้า Docs นี้ (แสดงด้านขวาของหน้า) */
export function LinkedIssuesPanel({ issues, onLink, onUnlink, loading = false }: LinkedIssuesPanelProps) {
  const headingId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      {onLink && (
        <LinkPickerModal
          kind="issue"
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          excludeIds={issues.map((issue) => issue.key)}
          onSelect={onLink}
        />
      )}
      <header className="mb-3 flex items-center gap-2">
        <Link2 size={16} className="text-ink-subtle" aria-hidden />
        <h2 id={headingId} className="text-sm font-bold text-ink">
          Linked issues
        </h2>
        {!loading && <span className="rounded-full bg-surface-muted px-2 text-xs font-bold text-ink-muted">{issues.length}</span>}
        {onLink && (
          <Button variant="ghost" size="sm" className="ml-auto" leftIcon={<Plus size={14} aria-hidden />} onClick={() => setPickerOpen(true)}>
            Link
          </Button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-label="กำลังโหลด">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : issues.length === 0 ? (
        <EmptyState compact icon={Link2} title="ยังไม่มี issue ที่ลิงก์" description="พิมพ์ TB-12 ในเนื้อหา หรือกด Link" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {issues.map((issue) => (
            <li
              key={issue.key}
              className="group flex items-center gap-2 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-surface-muted"
            >
              <IssueTypeIcon type={issue.type} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <IssueMentionChip issueKey={issue.key} issue={issue} />
                  <StatusPill status={issue.status} size="sm" iconOnly />
                </div>
                <p className="truncate text-sm font-medium text-ink" title={issue.title}>
                  {issue.title}
                </p>
              </div>
              <Avatar user={issue.assignee} size="sm" />
              {onUnlink && (
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`ยกเลิกลิงก์ ${issue.key}`}
                  onClick={() => onUnlink(issue.key)}
                >
                  <Unlink size={14} aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

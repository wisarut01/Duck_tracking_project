import { Link } from 'react-router';
import { cn } from '@/lib/cn';
import { issueStatusMeta, issueTypeMeta, stickyClasses } from '@/lib/issueMeta';
import type { IssueSummary } from '@/types/api';

export interface IssueMentionChipProps {
  /** เช่น "TB-12" */
  issueKey: string;
  /** ถ้ารู้ข้อมูล issue จะแสดงไอคอน type + ขีดฆ่าเมื่อ Done + title ใน tooltip */
  issue?: Pick<IssueSummary, 'title' | 'type' | 'status'>;
  /** แสดง title ต่อท้าย key ด้วย (ใช้ในรายการ ไม่ใช่กลางประโยค) */
  showTitle?: boolean;
  className?: string;
}

/**
 * Chip ลิงก์ไป issue — ใช้ทั้งใน Markdown (`TB-12` ในเนื้อหา Docs) และในรายการต่างๆ
 * ลิงก์ไปที่ /issues/TB-12 ผ่าน react-router <Link> (ไม่ reload หน้า)
 */
export function IssueMentionChip({ issueKey, issue, showTitle = false, className }: IssueMentionChipProps) {
  const typeMeta = issue ? issueTypeMeta[issue.type] : undefined;
  const TypeIcon = typeMeta?.icon;
  const isDone = issue?.status === 'DONE';
  const label = issue
    ? `${issueKey}: ${issue.title} (${issueStatusMeta[issue.status].label})`
    : `${issueKey} (ไม่พบข้อมูล issue)`;

  return (
    <Link
      to={`/issues/${issueKey}`}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-px align-baseline text-[0.9em] font-bold no-underline',
        'transition-colors hover:-translate-y-px hover:shadow-sm',
        issue
          ? 'border-border-strong bg-surface text-ink hover:bg-brand-soft'
          : 'border-dashed border-border-strong bg-surface-muted text-ink-muted',
        className,
      )}
    >
      {TypeIcon && typeMeta && (
        <TypeIcon size={12} strokeWidth={2.75} className={stickyClasses[typeMeta.color].ink} aria-hidden />
      )}
      <span className={cn('font-mono text-[0.95em] tracking-tight', isDone && 'line-through decoration-2 opacity-70')}>
        {issueKey}
      </span>
      {showTitle && issue && <span className="truncate font-medium text-ink-muted">{issue.title}</span>}
    </Link>
  );
}

import { cn } from '@/lib/cn';
import { issueStatusMeta, stickyClasses } from '@/lib/issueMeta';
import type { IssueStatus } from '@/types/api';

export interface StatusPillProps {
  status: IssueStatus;
  size?: 'sm' | 'md';
  /** แสดงแค่ไอคอน (ยังมี aria-label ให้ screen reader) */
  iconOnly?: boolean;
  className?: string;
}

/** ป้าย status: สี + ไอคอน + ข้อความ (To do / In progress / In review / Done) */
export function StatusPill({ status, size = 'md', iconOnly = false, className }: StatusPillProps) {
  const meta = issueStatusMeta[status];
  const sticky = stickyClasses[meta.color];
  const Icon = meta.icon;

  if (iconOnly) {
    return (
      <span className={cn('inline-flex', sticky.ink, className)} role="img" aria-label={`Status: ${meta.label}`} title={meta.label}>
        <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2.5} aria-hidden />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
        sticky.bg,
        sticky.ink,
        className,
      )}
    >
      <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2.75} aria-hidden />
      {meta.label}
    </span>
  );
}

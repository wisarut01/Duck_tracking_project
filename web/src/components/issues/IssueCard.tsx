import type { HTMLAttributes } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/cn';
import { issueTypeMeta, stickyClasses } from '@/lib/issueMeta';
import type { Issue, IssueSummary } from '@/types/api';
import { Avatar } from '@/components/ui/Avatar';
import { IssueTypeIcon } from './IssueTypeIcon';
import { PriorityIcon } from './PriorityIcon';
import { StatusPill } from './StatusPill';

/** ข้อมูลที่การ์ดต้องใช้: IssueSummary + labels/linkedPageCount (ถ้ามี) */
export type IssueCardData = IssueSummary & Partial<Pick<Issue, 'labels' | 'linkedPageCount'>>;

export interface IssueCardProps extends HTMLAttributes<HTMLDivElement> {
  issue: IssueCardData;
  /** การ์ดตัวจริงที่ถูกลากออกไป → แสดงเป็น "เงา" จางๆ ในตำแหน่งเดิม */
  isDragging?: boolean;
  /** การ์ดที่ลอยตามเมาส์ (DragOverlay) → เอียง + เงาเข้ม เหมือนหยิบ sticky note */
  isOverlay?: boolean;
  selected?: boolean;
  /** แสดง StatusPill บนการ์ด (ปิดไว้ใน board เพราะคอลัมน์บอก status อยู่แล้ว) */
  showStatus?: boolean;
}

/**
 * การ์ด issue สไตล์ sticky note — สีพื้นตาม issue type
 * (ฟ้า = Task, ชมพู = Bug, เขียว = Story) + มีไอคอนกำกับเสมอ
 */
export function IssueCard({
  issue,
  isDragging = false,
  isOverlay = false,
  selected = false,
  showStatus = false,
  className,
  ...rest // เช่น onClick, ref-less props จาก dnd-kit (attributes/listeners)
}: IssueCardProps) {
  const sticky = stickyClasses[issueTypeMeta[issue.type].color];
  const labels = issue.labels ?? [];

  return (
    <div
      className={cn(
        'group relative flex min-w-0 flex-col gap-2.5 rounded-lg p-3 text-left',
        'shadow-sm transition-[box-shadow,transform,opacity] duration-150',
        'hover:-translate-y-0.5 hover:shadow-md',
        sticky.bg,
        // มุมขวาล่างพับ (folded corner) — ใช้ pseudo element ::after
        "after:absolute after:right-0 after:bottom-0 after:h-3 after:w-3 after:rounded-tl-md after:bg-black/5 after:content-['']",
        selected && 'ring-2 ring-focus ring-offset-2 ring-offset-canvas',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-2 cursor-grabbing shadow-lift',
        className,
      )}
      {...rest}
    >
      <div className="flex items-center gap-2">
        <IssueTypeIcon type={issue.type} size="sm" />
        <span className={cn('font-mono text-xs font-bold tracking-tight', sticky.ink)}>{issue.key}</span>
        {showStatus && <StatusPill status={issue.status} size="sm" className="ml-auto" />}
      </div>

      {/* wrap-anywhere = คำยาวที่ไม่มีช่องว่าง (URL, ชื่อไฟล์) ตัดขึ้นบรรทัดใหม่ได้ ไม่ล้นการ์ด */}
      <p className="line-clamp-3 text-sm leading-snug font-semibold wrap-anywhere text-ink">{issue.title}</p>

      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((label) => (
            // บนการ์ดสีอยู่แล้ว → ใช้ป้ายพื้นขาวโปร่ง ไม่แย่งสีกับ sticky note
            <span
              key={label}
              title={label}
              className="inline-flex h-5 max-w-full items-center rounded-full bg-surface/75 px-2 text-[11px] font-semibold text-ink-muted dark:bg-black/25"
            >
              <span className="truncate">{label}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        <PriorityIcon priority={issue.priority} />
        {(issue.linkedPageCount ?? 0) > 0 && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-ink-muted"
            title={`ลิงก์กับ ${issue.linkedPageCount} หน้า`}
          >
            <FileText size={13} aria-hidden />
            <span className="sr-only">หน้า Docs ที่ลิงก์:</span>
            {issue.linkedPageCount}
          </span>
        )}
        <Avatar user={issue.assignee} size="sm" className="ml-auto ring-0" />
      </div>
    </div>
  );
}

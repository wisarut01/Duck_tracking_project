import { cn } from '@/lib/cn';
import { issueTypeMeta, stickyClasses } from '@/lib/issueMeta';
import type { IssueType } from '@/types/api';

export interface IssueTypeIconProps {
  type: IssueType;
  size?: 'sm' | 'md' | 'lg';
  /** แสดงชื่อ type ข้างไอคอนด้วย */
  showLabel?: boolean;
  className?: string;
}

const boxSize = { sm: 'h-5 w-5 rounded-[5px]', md: 'h-6 w-6 rounded-md', lg: 'h-8 w-8 rounded-lg' } as const;
const iconSize = { sm: 12, md: 14, lg: 18 } as const;

/** ไอคอน type ของ issue: Task (ติ๊กถูกในกล่อง/ฟ้า), Bug (แมลง/ชมพู), Story (bookmark/เขียว) */
export function IssueTypeIcon({ type, size = 'md', showLabel = false, className }: IssueTypeIconProps) {
  const meta = issueTypeMeta[type];
  const sticky = stickyClasses[meta.color];
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className={cn('inline-flex shrink-0 items-center justify-center', boxSize[size], sticky.bg, sticky.ink)}
        // ถ้ามี label ข้างๆ แล้ว ไอคอนเป็นแค่ตกแต่ง → ซ่อนจาก screen reader
        role={showLabel ? undefined : 'img'}
        aria-label={showLabel ? undefined : meta.label}
        aria-hidden={showLabel || undefined}
        title={showLabel ? undefined : meta.label}
      >
        <Icon size={iconSize[size]} strokeWidth={2.5} aria-hidden />
      </span>
      {showLabel && <span className="text-sm font-semibold text-ink">{meta.label}</span>}
    </span>
  );
}

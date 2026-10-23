import { cn } from '@/lib/cn';
import { issuePriorityMeta, stickyClasses } from '@/lib/issueMeta';
import type { IssuePriority } from '@/types/api';

export interface PriorityIconProps {
  priority: IssuePriority;
  showLabel?: boolean;
  size?: number;
  className?: string;
}

/**
 * Priority: ใช้ "ทิศลูกศร + จำนวนลูกศร" สื่อความหมาย (ไม่ใช่สีอย่างเดียว)
 * Highest ⇈ · High ↑ · Medium = · Low ↓ · Lowest ⇊
 */
export function PriorityIcon({ priority, showLabel = false, size = 16, className }: PriorityIconProps) {
  const meta = issuePriorityMeta[priority];
  const Icon = meta.icon;
  return (
    <span
      className={cn('inline-flex items-center gap-1', stickyClasses[meta.color].ink, className)}
      title={showLabel ? undefined : `Priority: ${meta.label}`}
    >
      <Icon
        size={size}
        strokeWidth={2.75}
        role={showLabel ? undefined : 'img'}
        aria-label={showLabel ? undefined : `Priority: ${meta.label}`}
        aria-hidden={showLabel || undefined}
      />
      {showLabel && <span className="text-sm font-semibold text-ink">{meta.label}</span>}
    </span>
  );
}

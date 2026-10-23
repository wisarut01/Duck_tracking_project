import type { ReactNode } from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** ปุ่ม call-to-action เช่น <Button>สร้าง issue แรก</Button> */
  action?: ReactNode;
  /** compact = ใช้ในพื้นที่เล็ก เช่นในคอลัมน์ board */
  compact?: boolean;
  className?: string;
}

/**
 * หน้าว่าง — ใช้ "กองโน้ตแปะ" เป็นภาพประกอบแบบ whiteboard
 * ทุกหน้าว่างควรบอก: ทำไมว่าง + ทำอะไรต่อได้
 */
export function EmptyState({ title, description, icon: Icon = Inbox, action, compact = false, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'gap-2 p-4' : 'gap-4 p-10', className)}>
      {/* ภาพประกอบ: sticky note 3 แผ่นซ้อนกัน เอียงนิดๆ */}
      <div className={cn('relative', compact ? 'h-12 w-14' : 'h-24 w-28')} aria-hidden>
        <span className="absolute inset-0 -rotate-6 rounded-lg bg-sticky-blue shadow-sm" />
        <span className="absolute inset-0 rotate-3 rounded-lg bg-sticky-pink shadow-sm" />
        <span className="absolute inset-0 -rotate-1 flex items-center justify-center rounded-lg bg-sticky-yellow shadow-md">
          <Icon size={compact ? 20 : 36} className="text-sticky-yellow-ink" />
        </span>
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <p className={cn('font-bold text-ink', compact ? 'text-sm' : 'text-lg')}>{title}</p>
        {description && <p className={cn('text-ink-muted', compact ? 'text-xs' : 'text-sm')}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { stickyClasses, type StickyColor } from '@/lib/issueMeta';

export interface BadgeProps {
  children: ReactNode;
  /** สีพาสเทลแบบ sticky note */
  color?: StickyColor;
  size?: 'sm' | 'md';
  /** soft = พื้นสี, outline = เส้นขอบ พื้นโปร่ง */
  variant?: 'soft' | 'outline';
  icon?: ReactNode;
  /** ถ้าส่งมา จะมีปุ่ม × สำหรับลบ (ใช้เป็น Tag ในฟอร์ม) */
  onRemove?: () => void;
  className?: string;
}

/** Badge / Tag — ป้ายเล็กๆ เช่น label ของ issue ("frontend") */
export function Badge({
  children,
  color = 'gray',
  size = 'sm',
  variant = 'soft',
  icon,
  onRemove,
  className,
}: BadgeProps) {
  const sticky = stickyClasses[color];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
        sticky.ink,
        variant === 'soft' ? sticky.bg : 'border border-current bg-transparent',
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`ลบ ${typeof children === 'string' ? children : ''}`.trim()}
          className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/15"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  );
}

/**
 * เลือกสีให้ label แบบคงที่ (label เดิม → สีเดิมเสมอ) โดย hash ชื่อ
 * ทำให้ "frontend" เป็นสีเดียวกันทุกที่โดยไม่ต้องตั้งค่าเอง
 */
const labelPalette: StickyColor[] = ['yellow', 'blue', 'green', 'purple', 'orange', 'teal', 'pink'];
export function colorForLabel(label: string): StickyColor {
  let hash = 0;
  for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return labelPalette[hash % labelPalette.length] ?? 'gray';
}

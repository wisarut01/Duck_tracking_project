import { useId, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: ReactNode;
  /** element ที่ hover/focus แล้วโชว์ tooltip (ควรเป็นสิ่งที่ focus ได้ เช่น button) */
  children: ReactElement;
  side?: TooltipSide;
  /** บังคับให้เปิดค้าง (ใช้ใน Storybook / เทสต์) */
  defaultOpen?: boolean;
}

const sideClasses: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

/**
 * Tooltip แบบเบาๆ — เปิดเมื่อ hover หรือ focus ด้วยคีย์บอร์ด, ปิดเมื่อ Esc
 * เป็นแค่ "คำอธิบายเสริม" ห้ามใส่ข้อมูลสำคัญที่หาจากที่อื่นไม่ได้
 */
export function Tooltip({ content, children, side = 'top', defaultOpen = false }: TooltipProps) {
  const [open, setOpen] = useState(defaultOpen);
  const tooltipId = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(defaultOpen)}
      // onFocus/onBlur ของ wrapper จับ focus ของลูกได้ (event bubble ขึ้นมา)
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(defaultOpen)}
      onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
      aria-describedby={open ? tooltipId : undefined}
    >
      {children}
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 w-max max-w-60 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium text-ink-inverse shadow-md',
            sideClasses[side],
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

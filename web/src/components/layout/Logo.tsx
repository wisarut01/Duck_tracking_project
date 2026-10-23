import { cn } from '@/lib/cn';

/**
 * โลโก้ของเราเอง: sticky note สีเหลือง 2 แผ่นซ้อน + ติ๊กถูก
 * (ไม่ใช้โลโก้/ชื่อของผลิตภัณฑ์อื่น)
 */
export function Logo({ showText = true, className }: { showText?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative h-8 w-8 shrink-0" aria-hidden>
        <span className="absolute inset-0 translate-x-1 translate-y-1 rotate-6 rounded-lg bg-sticky-blue" />
        <span className="absolute inset-0 flex -rotate-3 items-center justify-center rounded-lg bg-brand shadow-sm">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#1c1c1e" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 12.5l4 4 8-9" />
          </svg>
        </span>
      </span>
      {showText ? (
        <span className="text-base leading-none font-extrabold tracking-tight text-ink">
          Tracking<span className="text-ink-muted">Board</span>
        </span>
      ) : (
        <span className="sr-only">Tracking Board</span>
      )}
    </span>
  );
}

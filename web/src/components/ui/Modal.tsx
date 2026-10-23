import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  /** เรียกเมื่อผู้ใช้กด Esc, คลิกพื้นหลัง หรือกดปุ่ม × */
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  /** ปุ่มด้านล่าง เช่น [ยกเลิก] [บันทึก] */
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/** selector ของ element ที่ focus ได้ — ใช้ทำ focus trap */
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal / Dialog
 * - render ผ่าน Portal ไปที่ document.body (อยู่เหนือทุกอย่าง ไม่โดน overflow ของ parent ตัด)
 * - a11y: role="dialog" + aria-modal, Esc ปิดได้, focus ย้ายเข้า dialog และวนอยู่ข้างใน (focus trap)
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  // useRef = กล่องเก็บค่าที่ไม่ทำให้ re-render — ที่นี่ใช้อ้างถึง DOM ของ dialog
  const dialogRef = useRef<HTMLDivElement>(null);
  // เก็บ onClose ล่าสุดไว้ใน ref → effect ด้านล่างไม่ต้องรันใหม่ทุกครั้งที่ parent ส่งฟังก์ชันใหม่มา
  // (ถ้ารันใหม่ focus จะเด้งกลับไปช่องแรกระหว่างพิมพ์)
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // useEffect = โค้ดที่รัน "หลัง" render — ใช้ผูก event กับ document และคืน cleanup เมื่อปิด
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    // focus element แรกใน dialog (ยกเว้นมีช่องที่ autoFocus อยู่แล้ว)
    if (dialog && !dialog.contains(document.activeElement)) {
      dialog.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      // focus trap: Tab ที่ตัวสุดท้าย → กลับไปตัวแรก (และกลับกันเมื่อ Shift+Tab)
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus(); // คืน focus กลับไปที่ปุ่มที่เปิด modal
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* พื้นหลังมืด — คลิกแล้วปิด */}
      <div className="absolute inset-0 bg-overlay backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          'animate-pop-in relative flex max-h-[90vh] w-full flex-col rounded-2xl border border-border bg-surface shadow-lg',
          sizeClasses[size],
        )}
      >
        <header className="flex items-start gap-3 px-6 pt-5 pb-3">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" iconOnly aria-label="ปิด" onClick={onClose}>
            <X size={18} aria-hidden />
          </Button>
        </header>
        {children && <div className="overflow-y-auto px-6 py-2">{children}</div>}
        {footer && <footer className="flex justify-end gap-2 px-6 pt-3 pb-5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

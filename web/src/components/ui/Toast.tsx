import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** ปุ่มเสริม เช่น "Undo" */
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
}

const toneMeta: Record<ToastTone, { icon: LucideIcon; iconClass: string; bar: string }> = {
  success: { icon: CircleCheck, iconClass: 'text-success', bar: 'bg-success' },
  error: { icon: CircleAlert, iconClass: 'text-danger', bar: 'bg-danger' },
  warning: { icon: TriangleAlert, iconClass: 'text-warning', bar: 'bg-warning' },
  info: { icon: Info, iconClass: 'text-info', bar: 'bg-info' },
};

/** หน้าตา Toast หนึ่งอัน (ใช้เดี่ยวๆ ได้ หรือผ่าน useToast) */
export function Toast({ tone = 'info', title, description, action, onDismiss }: ToastProps) {
  const meta = toneMeta[tone];
  const Icon = meta.icon; // component ต้องขึ้นต้นตัวใหญ่ถึงใช้เป็น <Icon /> ได้
  return (
    <div
      // error ใช้ role="alert" (อ่านทันที), อื่นๆ ใช้ status (อ่านเมื่อว่าง)
      role={tone === 'error' ? 'alert' : 'status'}
      className="animate-pop-in relative flex w-80 items-start gap-3 overflow-hidden rounded-xl border border-border bg-surface p-4 pl-5 shadow-lg"
    >
      <span className={cn('absolute inset-y-0 left-0 w-1.5', meta.bar)} aria-hidden />
      <Icon size={20} className={cn('mt-0.5 shrink-0', meta.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">{title}</p>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 text-sm font-bold text-link underline-offset-2 hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="ปิดการแจ้งเตือน"
          className="rounded-md p-1 text-ink-subtle hover:bg-surface-muted hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

// ---------- ระบบ Toast ทั้งแอป (Context) ----------
// Context = วิธีส่งค่าให้ component ลูกหลานทุกชั้นโดยไม่ต้องส่ง props ต่อกันเป็นทอดๆ

type ToastInput = Omit<ToastProps, 'onDismiss'>;
interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

/** ครอบแอปไว้ชั้นบนสุด แล้วเรียก useToast() ที่ไหนก็ได้ */
export function ToastProvider({ children, durationMs = 4000 }: { children: ReactNode; durationMs?: number }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // useCallback = จำฟังก์ชันไว้ ไม่สร้างใหม่ทุก render (component ที่ใช้มันจะไม่ re-render โดยไม่จำเป็น)
  const show = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss, durationMs],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onDismiss={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** const toast = useToast(); toast({ tone: 'success', title: 'บันทึกแล้ว' }) */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast() ต้องใช้ภายใน <ToastProvider>');
  return show;
}

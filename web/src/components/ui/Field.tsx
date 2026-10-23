import type { ReactNode } from 'react';

export interface FieldProps {
  /** id ของ input ข้างใน — ใช้เชื่อม <label htmlFor> กับ input */
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/**
 * กรอบมาตรฐานของ form field: label ด้านบน + hint/error ด้านล่าง
 * ใช้ร่วมกันใน Input, TextArea, Select
 */
export function Field({ id, label, hint, error, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** class ร่วมของกล่อง input ทุกแบบ */
export const inputBaseClass =
  'w-full rounded-lg border bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle ' +
  'transition-colors focus:outline-none focus-visible:outline-none focus:border-focus focus:ring-3 focus:ring-focus/20 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-subtle';

/** สร้าง aria-describedby ให้ screen reader อ่าน hint/error ต่อจาก label */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

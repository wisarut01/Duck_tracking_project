import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Props ของ Button = props ปกติของ <button> ทั้งหมด (onClick, disabled, type...)
 * + props เพิ่มของเรา — ใช้ `extends` เพื่อไม่ต้องประกาศซ้ำเอง
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** แสดง spinner และกดไม่ได้ */
  loading?: boolean;
  /** ไอคอนด้านซ้ายข้อความ เช่น <Plus size={16} /> */
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** ปุ่มไอคอนอย่างเดียว (สี่เหลี่ยมจัตุรัส) — ต้องใส่ aria-label ด้วย */
  iconOnly?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand-hover shadow-sm',
  secondary: 'bg-surface text-ink border border-border-strong hover:bg-surface-muted shadow-sm',
  ghost: 'bg-transparent text-ink hover:bg-surface-muted',
  danger: 'bg-danger text-ink-inverse hover:opacity-90 shadow-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-10 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

const iconOnlySize: Record<ButtonSize, string> = {
  sm: 'h-8 w-8 rounded-md',
  md: 'h-10 w-10 rounded-lg',
  lg: 'h-12 w-12 rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  disabled,
  className,
  children,
  type = 'button', // default เป็น "button" กันฟอร์ม submit โดยไม่ตั้งใจ
  ...rest // props ที่เหลือ (onClick, aria-*, ...) ส่งต่อให้ <button> ทั้งหมด
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap',
        'transition-[background-color,transform,box-shadow] duration-150 active:translate-y-px',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
        variantClasses[variant],
        iconOnly ? iconOnlySize[size] : sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader size={16} className="animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

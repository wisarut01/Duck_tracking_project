import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Field, describedBy, inputBaseClass } from './Field';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  /** ไอคอนด้านซ้ายในกล่อง เช่น <Search size={16} /> */
  leftIcon?: ReactNode;
}

export function Input({ label, hint, error, leftIcon, id, className, required, ...rest }: InputProps) {
  // useId() สร้าง id ไม่ซ้ำให้อัตโนมัติ ถ้าผู้ใช้ไม่ได้ส่ง id มา
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(inputId, error, hint)}
          className={cn(
            inputBaseClass,
            'h-10',
            leftIcon && 'pl-9',
            error ? 'border-danger' : 'border-border-strong',
            className,
          )}
          {...rest}
        />
      </div>
    </Field>
  );
}

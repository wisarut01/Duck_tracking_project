import { useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Field, describedBy, inputBaseClass } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  /** ข้อความตัวเลือกแรกที่ว่าง เช่น "— ไม่ระบุ —" */
  placeholder?: string;
}

/**
 * ใช้ <select> ของ browser จริง (เข้าถึงได้ดีที่สุด, ใช้ keyboard ได้ทันที)
 * แค่ตกแต่งหน้าตาให้เข้ากับ design system
 */
export function Select({ label, hint, error, options, placeholder, id, className, required, ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field id={selectId} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(selectId, error, hint)}
          className={cn(
            inputBaseClass,
            'h-10 cursor-pointer appearance-none pr-9',
            error ? 'border-danger' : 'border-border-strong',
            className,
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle"
        />
      </div>
    </Field>
  );
}

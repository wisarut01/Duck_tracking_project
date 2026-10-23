import { useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Field, describedBy, inputBaseClass } from './Field';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function TextArea({ label, hint, error, id, className, rows = 4, required, ...rest }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(inputId, error, hint)}
        className={cn(
          inputBaseClass,
          'resize-y py-2 leading-relaxed',
          error ? 'border-danger' : 'border-border-strong',
          className,
        )}
        {...rest}
      />
    </Field>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { InfoDot } from './InfoDot';

export interface FieldProps {
  label: string;
  hint?: ReactNode;
  info?: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, info, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="hc-label flex items-center gap-1.5 text-[0.6875rem] normal-case tracking-[0.06em] text-graphite-300"
        >
          {label}
          {info && <InfoDot text={info} />}
        </label>
        {hint && <span className="text-2xs text-graphite-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

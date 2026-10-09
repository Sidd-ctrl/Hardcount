import { useEffect, useId, useState } from 'react';
import { cn } from '@/lib/cn';
import { clamp } from '@/domain/normalize';

export type NumberFormat = 'plain' | 'money' | 'decimal';

const moneyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const plainFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function display(value: number, format: NumberFormat): string {
  if (format === 'money') return moneyFormatter.format(value / 100);
  if (format === 'decimal') return decimalFormatter.format(value);
  return plainFormatter.format(value);
}

export interface NumberFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: NumberFormat;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  format = 'plain',
  prefix,
  suffix,
  disabled = false,
  className,
  ariaLabel,
}: NumberFieldProps) {
  const autoId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw.replace(/[^0-9.-]/g, ''));
    if (Number.isNaN(parsed)) {
      setDraft(null);
      return;
    }
    onChange(clamp(parsed, min, max));
    setDraft(null);
  };

  const shown = draft ?? display(value, format);

  return (
    <div
      className={cn(
        'flex h-9 items-center gap-1 rounded-lg border border-white/[0.08] bg-graphite-850/90 px-2.5 transition-colors focus-within:border-amber-glow/45 focus-within:bg-graphite-800',
        disabled && 'opacity-50',
        className,
      )}
    >
      {prefix && <span className="text-xs text-graphite-500">{prefix}</span>}
      <input
        id={autoId}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        value={shown}
        step={step}
        onFocus={(event) => {
          setDraft(String(value));
          event.currentTarget.select();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
            return;
          }
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const direction = event.key === 'ArrowUp' ? 1 : -1;
            onChange(clamp(value + direction * step, min, max));
          }
        }}
        className="hc-figure w-full min-w-0 bg-transparent text-right text-sm text-graphite-100 outline-none placeholder:text-graphite-500"
      />
      {suffix && <span className="shrink-0 text-xs text-graphite-500">{suffix}</span>}
    </div>
  );
}

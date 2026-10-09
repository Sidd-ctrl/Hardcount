import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface OptionCard<T extends string> {
  value: T;
  label: string;
  detail?: string;
  metric?: string;
}

export interface OptionGridProps<T extends string> {
  options: OptionCard<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3 | 4;
  ariaLabel: string;
}

const COLUMNS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
};

export function OptionGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
  ariaLabel,
}: OptionGridProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('grid grid-cols-1 gap-2', COLUMNS[columns])}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-xl border p-3 text-left transition-all duration-150',
              active
                ? 'border-amber-glow/45 bg-amber-glow/[0.07] shadow-[0_0_0_1px_rgba(255,181,71,0.12)]'
                : 'border-white/[0.07] bg-graphite-850/60 hover:border-white/[0.15] hover:bg-graphite-800/60',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  'text-[0.8125rem] font-medium leading-tight',
                  active ? 'text-graphite-50' : 'text-graphite-200',
                )}
              >
                {option.label}
              </span>
              <Check
                className={cn(
                  'mt-0.5 h-3.5 w-3.5 shrink-0 transition-opacity',
                  active ? 'text-amber-glow opacity-100' : 'opacity-0',
                )}
              />
            </div>
            {option.detail && (
              <span className="mt-1 block text-2xs leading-snug text-graphite-500">{option.detail}</span>
            )}
            {option.metric && (
              <span
                className={cn(
                  'hc-figure mt-2 block text-2xs font-semibold',
                  active ? 'text-amber-glow' : 'text-graphite-400',
                )}
              >
                {option.metric}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

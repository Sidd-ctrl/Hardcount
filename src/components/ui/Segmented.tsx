import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  ariaLabel?: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-white/[0.07] bg-graphite-850/80 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-[0.6rem] font-medium transition-colors duration-150',
              size === 'sm' ? 'px-2.5 py-1 text-2xs' : 'px-3 py-1.5 text-xs',
              active
                ? 'bg-graphite-700 text-graphite-50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07)]'
                : 'text-graphite-400 hover:text-graphite-200',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

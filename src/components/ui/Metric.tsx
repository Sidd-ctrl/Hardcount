import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { InfoDot } from './InfoDot';

export interface MetricProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  info?: string;
  tone?: 'default' | 'amber' | 'steel' | 'alert' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TONE_TEXT = {
  default: 'text-graphite-50',
  amber: 'text-amber-glow',
  steel: 'text-steel-glow',
  alert: 'text-alert-glow',
  muted: 'text-graphite-300',
};

const SIZE_TEXT = {
  sm: 'text-base',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-[2rem]',
};

export function Metric({
  label,
  value,
  sub,
  info,
  tone = 'default',
  size = 'md',
  className,
}: MetricProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1.5">
        <span className="hc-label truncate">{label}</span>
        {info && <InfoDot text={info} />}
      </div>
      <div
        className={cn(
          'hc-figure mt-1 truncate font-semibold leading-none tracking-tight',
          TONE_TEXT[tone],
          SIZE_TEXT[size],
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 truncate text-2xs text-graphite-500">{sub}</div>}
    </div>
  );
}

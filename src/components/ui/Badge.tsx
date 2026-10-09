import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'amber' | 'steel' | 'alert' | 'positive';

const TONES: Record<Tone, string> = {
  neutral: 'border-white/10 bg-white/[0.05] text-graphite-300',
  amber: 'border-amber-glow/25 bg-amber-glow/10 text-amber-glow',
  steel: 'border-steel-glow/25 bg-steel-glow/10 text-steel-glow',
  alert: 'border-alert-glow/25 bg-alert-glow/10 text-alert-glow',
  positive: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-2xs font-medium tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

import * as Slider from '@radix-ui/react-slider';
import { cn } from '@/lib/cn';

export interface RangeFieldProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
  ariaLabel: string;
  accent?: 'amber' | 'steel';
}

export function RangeField({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  ariaLabel,
  accent = 'amber',
}: RangeFieldProps) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const trackColor = accent === 'steel' ? 'bg-steel-glow' : 'bg-amber-glow';

  return (
    <Slider.Root
      aria-label={ariaLabel}
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={(values) => onChange(values[0])}
      className={cn('relative flex h-5 w-full touch-none select-none items-center', className)}
    >
      <Slider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-graphite-700">
        <Slider.Range className={cn('absolute h-full rounded-full', trackColor)} style={{ width: `${fill}%` }} />
      </Slider.Track>
      <Slider.Thumb
        aria-label={ariaLabel}
        className="block h-4 w-4 rounded-full border border-black/40 bg-graphite-100 shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-glow/70"
      />
    </Slider.Root>
  );
}

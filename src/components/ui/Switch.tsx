import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled = false, className }: SwitchProps) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-4 rounded-lg px-1 py-1.5 transition-opacity',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-[0.8125rem] leading-tight text-graphite-200">{label}</span>
        {description && (
          <span className="mt-0.5 block text-2xs leading-snug text-graphite-500">{description}</span>
        )}
      </span>
      <SwitchPrimitive.Root
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={label}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-200',
          checked ? 'border-amber-glow/50 bg-amber-deep/70' : 'border-white/10 bg-graphite-700',
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block h-4 w-4 translate-x-0.5 rounded-full bg-graphite-100 shadow transition-transform duration-200 will-change-transform',
            checked && 'translate-x-[1.15rem]',
          )}
        />
      </SwitchPrimitive.Root>
    </label>
  );
}

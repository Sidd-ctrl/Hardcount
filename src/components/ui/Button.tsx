import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-amber-glow to-amber-deep text-graphite-950 font-semibold shadow-[0_10px_28px_-14px_rgba(255,181,71,0.75)] hover:from-[#ffc163] hover:to-[#ee9a2a] active:translate-y-px',
  secondary:
    'bg-graphite-750 text-graphite-100 border border-white/[0.07] hover:bg-graphite-700 active:translate-y-px',
  ghost: 'text-graphite-300 hover:text-graphite-100 hover:bg-white/[0.05] active:translate-y-px',
  danger:
    'bg-alert-deep/20 text-alert-glow border border-alert-glow/30 hover:bg-alert-deep/35 active:translate-y-px',
  outline:
    'border border-white/[0.12] text-graphite-200 hover:border-white/[0.22] hover:bg-white/[0.04] active:translate-y-px',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[0.9375rem] gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-lg justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'secondary',
    size = 'md',
    asChild = false,
    icon,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const classes = cn(
    'inline-flex select-none items-center justify-center whitespace-nowrap transition-[background-color,color,border-color,transform,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button ref={ref} type={type} className={classes} {...props}>
      {icon}
      {children}
    </button>
  );
});

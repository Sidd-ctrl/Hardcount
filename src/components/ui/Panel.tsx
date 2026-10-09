import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  padded?: boolean;
  solid?: boolean;
}

export function Panel({
  title,
  subtitle,
  actions,
  padded = true,
  solid = false,
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <section className={cn(solid ? 'hc-panel-solid' : 'hc-panel', className)} {...props}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.055] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-[0.8125rem] font-semibold tracking-tight text-graphite-100">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs leading-snug text-graphite-400">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-4 sm:p-5')}>{children}</div>
    </section>
  );
}

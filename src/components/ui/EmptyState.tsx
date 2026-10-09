import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.09] px-6 py-10 text-center',
        className,
      )}
    >
      {icon && <div className="text-graphite-500">{icon}</div>}
      <div>
        <p className="text-sm font-medium text-graphite-200">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-graphite-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

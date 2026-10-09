import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ConfigSectionProps {
  id: string;
  title: string;
  summary: string;
  badge?: ReactNode;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function ConfigSection({
  id,
  title,
  summary,
  badge,
  icon,
  defaultOpen = false,
  children,
}: ConfigSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="hc-panel overflow-hidden" aria-labelledby={`section-${id}`}>
      <button
        type="button"
        id={`section-${id}`}
        aria-expanded={open}
        aria-controls={`panel-${id}`}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.02] sm:px-5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-graphite-800 text-graphite-300">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] font-semibold text-graphite-100">{title}</span>
          <span className="mt-0.5 block truncate text-2xs text-graphite-500">{summary}</span>
        </span>
        {badge}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-graphite-500 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      <motion.div
        id={`panel-${id}`}
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div className="space-y-5 border-t border-white/[0.055] px-4 py-5 sm:px-5">{children}</div>
      </motion.div>
    </section>
  );
}

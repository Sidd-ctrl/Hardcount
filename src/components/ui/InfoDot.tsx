import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Info } from 'lucide-react';

export interface InfoDotProps {
  text: string;
}

export function InfoDot({ text }: InfoDotProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={120}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          <span
            tabIndex={0}
            aria-label={text}
            className="inline-flex cursor-help text-graphite-500 transition-colors hover:text-steel-glow"
          >
            <Info className="h-3 w-3" />
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            side="top"
            className="z-50 max-w-[16rem] rounded-lg border border-white/10 bg-graphite-800/95 px-3 py-2 text-xs leading-relaxed text-graphite-200 shadow-raised backdrop-blur-xl"
          >
            {text}
            <TooltipPrimitive.Arrow className="fill-graphite-800" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

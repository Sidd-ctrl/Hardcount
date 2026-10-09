import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { DRIVE_TYPES } from '@/domain/catalog';
import { effectiveServerCount } from '@/domain/derive';
import type { HardwareConfig } from '@/domain/types';

export interface RackVisualProps {
  config: HardwareConfig;
  live: boolean;
  intensity?: number;
  className?: string;
  compact?: boolean;
}

const RACK_UNITS = 22;

interface SlotSpec {
  id: string;
  kind: 'patch' | 'server' | 'storage' | 'switch' | 'ups' | 'cooling' | 'blank';
  height: number;
  label: string;
  drives?: number;
}

function buildSlots(config: HardwareConfig): SlotSpec[] {
  const slots: SlotSpec[] = [];
  const servers = effectiveServerCount(config);
  const serverUnits = Math.min(servers, 5);

  if (config.facility.networkCost > 0) {
    slots.push({ id: 'patch', kind: 'patch', height: 1, label: 'Patch panel' });
  }

  for (let index = 0; index < serverUnits; index += 1) {
    slots.push({ id: `server-${index}`, kind: 'server', height: 2, label: `Database node ${index + 1}` });
  }

  if (servers > serverUnits) {
    slots.push({
      id: 'server-more',
      kind: 'server',
      height: 1,
      label: `+${servers - serverUnits} more node(s)`,
    });
  }

  const driveCount = config.storage.driveCount + config.storage.spareDrives;
  const storageUnits = driveCount > 48 ? 4 : driveCount > 24 ? 3 : 2;
  slots.push({
    id: 'storage',
    kind: 'storage',
    height: storageUnits,
    label: `${DRIVE_TYPES[config.storage.driveType].short} array`,
    drives: Math.min(driveCount, storageUnits * 15),
  });

  if (config.facility.networkCost > 0) {
    slots.push({ id: 'switch', kind: 'switch', height: 1, label: 'Top-of-rack switch' });
  }

  if (config.facility.upsCost > 0) {
    slots.push({ id: 'ups', kind: 'ups', height: 3, label: 'Online UPS' });
  }

  if (config.facility.cooling !== 'none') {
    slots.push({ id: 'cooling', kind: 'cooling', height: 2, label: 'Cooling unit' });
  }

  const used = slots.reduce((sum, slot) => sum + slot.height, 0);
  if (used < RACK_UNITS) {
    slots.push({ id: 'blank', kind: 'blank', height: RACK_UNITS - used, label: 'Reserved rack space' });
  }

  return slots;
}

function DriveBay({ index, live, intensity, spare }: { index: number; live: boolean; intensity: number; spare: boolean }) {
  const reduceMotion = useReducedMotion();
  const delay = (index % 15) * 0.19;
  const duration = 2.2 + (index % 7) * 0.31;

  return (
    <div className="group relative flex h-full items-center gap-[3px] rounded-[2px] border border-black/50 bg-gradient-to-b from-graphite-700 to-graphite-800 px-[3px]">
      <span className="h-[55%] w-[2px] rounded-full bg-graphite-500/70" />
      <span className="h-[55%] w-[2px] rounded-full bg-graphite-500/40" />
      <span className="ml-auto flex items-center gap-[2px]">
        <span
          className={cn(
            'h-[3px] w-[3px] rounded-full',
            spare ? 'bg-graphite-500' : live ? 'bg-amber-glow' : 'bg-amber-deep/40',
          )}
          style={
            live && !spare && !reduceMotion
              ? { animation: `breathe ${duration}s ease-in-out ${delay}s infinite`, opacity: 0.35 + intensity * 0.6 }
              : undefined
          }
        />
        <span className={cn('h-[3px] w-[3px] rounded-full', live ? 'bg-steel-glow/80' : 'bg-graphite-600')} />
      </span>
    </div>
  );
}

export function RackVisual({ config, live, intensity = 0.5, className, compact = false }: RackVisualProps) {
  const reduceMotion = useReducedMotion();
  const slots = useMemo(() => buildSlots(config), [config]);
  const unitHeight = compact ? 18 : 24;

  return (
    <div className={cn('relative select-none', className)}>
      <div
        className="pointer-events-none absolute -inset-x-10 -inset-y-6 rounded-[2rem] opacity-70 blur-3xl"
        style={{
          background: live
            ? 'radial-gradient(60% 55% at 50% 45%, rgba(255,181,71,0.14), transparent 70%)'
            : 'radial-gradient(60% 55% at 50% 45%, rgba(90,176,240,0.09), transparent 70%)',
        }}
      />

      <div className="relative mx-auto" style={{ width: compact ? 208 : 300 }}>
        <div className="hc-brushed relative overflow-hidden rounded-[10px] border border-white/[0.09] p-[7px] shadow-raised">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <div
            className="relative flex flex-col gap-[3px] rounded-[6px] border border-black/45 bg-graphite-950/85 p-[6px]"
            style={{ minHeight: RACK_UNITS * unitHeight }}
          >
            <div className="pointer-events-none absolute inset-y-0 left-[3px] w-[3px] rounded bg-gradient-to-b from-white/10 via-white/[0.03] to-white/10" />
            <div className="pointer-events-none absolute inset-y-0 right-[3px] w-[3px] rounded bg-gradient-to-b from-white/10 via-white/[0.03] to-white/10" />

            {live && !reduceMotion && (
              <div
                className="pointer-events-none absolute inset-x-0 h-16 animate-sweep bg-gradient-to-b from-transparent via-amber-glow/[0.07] to-transparent"
                aria-hidden
              />
            )}

            {slots.map((slot) => (
              <div
                key={slot.id}
                style={{ height: slot.height * unitHeight - 3 }}
                className={cn(
                  'relative ml-[7px] mr-[7px] overflow-hidden rounded-[3px] border',
                  slot.kind === 'blank'
                    ? 'border-dashed border-white/[0.05] bg-transparent'
                    : 'border-white/[0.07] bg-gradient-to-b from-[#1e242b] to-[#12161a] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
                )}
              >
                {slot.kind === 'patch' && (
                  <div className="flex h-full items-center gap-[3px] px-2">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <span
                        key={index}
                        className={cn(
                          'h-[55%] w-[3px] rounded-sm',
                          index % 3 === 0 ? 'bg-steel-glow/50' : 'bg-graphite-600',
                        )}
                      />
                    ))}
                  </div>
                )}

                {slot.kind === 'server' && (
                  <div className="flex h-full items-center gap-2 px-2">
                    <div className="flex h-[62%] flex-1 items-center gap-[2px]">
                      {Array.from({ length: compact ? 14 : 22 }).map((_, index) => (
                        <span key={index} className="h-full w-[2px] rounded-full bg-graphite-600/80" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={cn('h-1 w-1 rounded-full', live ? 'bg-amber-glow animate-breathe' : 'bg-amber-deep/40')}
                      />
                      <span className={cn('h-1 w-1 rounded-full', live ? 'bg-steel-glow' : 'bg-graphite-600')} />
                    </div>
                  </div>
                )}

                {slot.kind === 'storage' && slot.drives && (
                  <div
                    className="grid h-full w-full gap-[2px] p-[3px]"
                    style={{ gridTemplateColumns: `repeat(${compact ? 8 : 15}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: slot.drives }).map((_, index) => (
                      <DriveBay
                        key={index}
                        index={index}
                        live={live}
                        intensity={intensity}
                        spare={index >= config.storage.driveCount}
                      />
                    ))}
                  </div>
                )}

                {slot.kind === 'switch' && (
                  <div className="flex h-full items-center justify-between px-2">
                    <span className="hc-figure text-[6px] tracking-widest text-graphite-500">10GbE</span>
                    <div className="flex gap-[2px]">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <span
                          key={index}
                          className={cn(
                            'h-1 w-1 rounded-[1px]',
                            live && index % 2 === 0 ? 'bg-steel-glow animate-breathe' : 'bg-graphite-600',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {slot.kind === 'ups' && (
                  <div className="flex h-full flex-col justify-center gap-1 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="hc-figure rounded-[2px] border border-amber-glow/30 bg-black/40 px-1 text-[6px] text-amber-glow">
                        {live ? 'ONLINE' : 'STANDBY'}
                      </span>
                      <span className="hc-figure text-[6px] text-graphite-500">3 kVA</span>
                    </div>
                    <div className="flex gap-[2px]">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <span
                          key={index}
                          className={cn(
                            'h-1.5 w-[3px] rounded-[1px]',
                            index < 11 ? 'bg-emerald-400/60' : 'bg-graphite-700',
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {slot.kind === 'cooling' && (
                  <div className="flex h-full items-center gap-2 px-2">
                    <div
                      className="flex h-[70%] w-[70%] items-center justify-center rounded-full border border-white/10 bg-black/30"
                      style={live && !reduceMotion ? { animation: 'spin 6s linear infinite' } : undefined}
                    >
                      <span className="block h-[3px] w-[70%] rounded-full bg-graphite-500/70" />
                    </div>
                    <span className="hc-figure text-[6px] tracking-widest text-graphite-500">
                      PUE {config.facility.pue.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-1 h-2 w-[86%] rounded-b-lg bg-gradient-to-b from-graphite-800 to-transparent" />
        <div className="mx-auto h-1.5 w-[62%] rounded-full bg-black/50 blur-[2px]" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="pointer-events-none absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
    </div>
  );
}

import { MS_PER_DAY, MS_PER_YEAR } from './money';
import type { SpeedId } from './types';

export interface SpeedSpec {
  id: SpeedId;
  label: string;
  simMsPerRealMs: number;
  hint: string;
}

export const SPEEDS: SpeedSpec[] = [
  { id: '1x', label: '1\u00D7', simMsPerRealMs: 1, hint: 'Real time. One simulated second per real second.' },
  { id: '60x', label: '60\u00D7', simMsPerRealMs: 60, hint: 'One simulated minute per real second.' },
  { id: 'day', label: '1 d/s', simMsPerRealMs: MS_PER_DAY / 1000, hint: 'One simulated day per real second.' },
  { id: 'month', label: '1 mo/s', simMsPerRealMs: MS_PER_DAY * 30.4375 / 1000, hint: 'One simulated month per real second.' },
  { id: 'year', label: '1 yr/s', simMsPerRealMs: MS_PER_YEAR / 1000, hint: 'One simulated year per real second.' },
];

export function speedById(id: SpeedId): SpeedSpec {
  return SPEEDS.find((speed) => speed.id === id) ?? SPEEDS[0];
}

export function simulatedMs(bankedMs: number, anchorWallMs: number | null, speed: SpeedId, wallNow: number): number {
  if (anchorWallMs === null) return bankedMs;
  const elapsedReal = Math.max(0, wallNow - anchorWallMs);
  return bankedMs + elapsedReal * speedById(speed).simMsPerRealMs;
}

export function formatElapsed(atMs: number): { years: number; days: number; hours: number; minutes: number; seconds: number; label: string } {
  const clamped = Math.max(0, atMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const years = Math.floor(clamped / MS_PER_YEAR);
  const remainder = clamped - years * MS_PER_YEAR;
  const days = Math.floor(remainder / MS_PER_DAY);
  const hours = Math.floor((remainder % MS_PER_DAY) / 3600000);
  const minutes = Math.floor((remainder % 3600000) / 60000);
  const seconds = totalSeconds % 60;
  const label = `${years}y ${String(days).padStart(3, '0')}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { years, days, hours, minutes, seconds, label };
}

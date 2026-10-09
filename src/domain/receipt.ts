import { demandAtTb } from './capacity';
import { accruedEnergyAt, categoryTotals, eventsUpTo } from './simulate';
import { MS_PER_YEAR, formatMoney, formatPercent } from './money';
import type { HardwareConfig, LedgerCategory, SimulationPlan } from './types';

export interface ReceiptLine {
  label: string;
  amountPaise: number;
  note: string;
  credit: boolean;
}

export interface CostReceipt {
  reference: string;
  configSummary: string;
  startDate: Date;
  asOfDate: Date;
  elapsedYears: number;
  lines: ReceiptLine[];
  grossPaise: number;
  accruedEnergyPaise: number;
  residualValuePaise: number;
  recoveryPaise: number;
  netPaise: number;
  installedTb: number;
  usableTb: number;
  consumedTb: number;
  availableTb: number;
  insight: string | null;
}

interface ReceiptGroup {
  label: string;
  categories: LedgerCategory[];
  note: string;
}

const GROUPS: ReceiptGroup[] = [
  { label: 'Original hardware investment', categories: ['hardware', 'facility'], note: 'Servers, media, rack, power and cooling' },
  { label: 'Commissioning labour', categories: ['commissioning'], note: 'Installation, deployment and backup setup' },
  { label: 'Energy for the IT load', categories: ['electricity'], note: 'Metered server, drive and switch consumption' },
  { label: 'Cooling and facility energy', categories: ['cooling'], note: 'PUE overhead billed on the same meter' },
  { label: 'Administration and software', categories: ['labor', 'software'], note: 'DBA retainers, monitoring and backup tooling' },
  { label: 'Vendor support', categories: ['support'], note: 'Post-warranty hardware contracts' },
  { label: 'Preventive maintenance', categories: ['maintenance'], note: 'Scheduled service visits' },
  { label: 'Planned replacements', categories: ['replacement'], note: 'Media and server refreshes' },
  { label: 'Capacity expansion', categories: ['upgrade'], note: 'Shelves added as demand grew' },
  { label: 'Failures and downtime', categories: ['incident', 'downtime'], note: 'Drive faults and degraded availability' },
  { label: 'Security and room overhead', categories: ['security', 'overhead'], note: 'Access control, insurance and floor space' },
  { label: 'Decommissioning', categories: ['decommission'], note: 'Migration, sanitisation and disposal' },
  { label: 'Asset recovery', categories: ['recovery'], note: 'Resale credited against residual value' },
];

function receiptReference(startDate: Date, asOfDate: Date): string {
  const stamp = (date: Date) =>
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `HC-${stamp(startDate)}-${stamp(asOfDate)}`;
}

function buildInsight(
  plan: SimulationPlan,
  totals: Record<LedgerCategory, number>,
  grossPaise: number,
  elapsedYears: number,
): string | null {
  if (grossPaise <= 0 || elapsedYears <= 0) return null;

  const energy = totals.electricity + totals.cooling;
  const energyShare = (energy / grossPaise) * 100;
  if (energyShare >= 15) {
    return `Electricity and cooling account for ${formatPercent(energyShare, 1)} of modelled ownership expenditure so far.`;
  }

  if (plan.exhaustionYear !== null && plan.exhaustionYear <= elapsedYears + 1) {
    return `At the modelled growth rate the array runs out of headroom around year ${plan.exhaustionYear.toFixed(1)}, and every rupee after that point is spent without room to grow.`;
  }

  const capex = totals.hardware + totals.facility + totals.commissioning;
  const opex = grossPaise - capex - totals.recovery;
  if (opex > capex) {
    return `Recurring operating spend of ${formatMoney(opex)} has already overtaken the ${formatMoney(capex)} you paid to build this system.`;
  }

  return `Modelled ownership is running at ${formatMoney(Math.round(grossPaise / elapsedYears))} per simulated year.`;
}

export function buildReceipt(
  config: HardwareConfig,
  plan: SimulationPlan,
  atMs: number,
  startDate: Date,
  configSummary: string,
): CostReceipt {
  const clamped = Math.max(0, Math.min(atMs, plan.horizonMs));
  const elapsedYears = clamped / MS_PER_YEAR;
  const asOfDate = new Date(startDate.getTime() + clamped);
  const events = eventsUpTo(plan, clamped);
  const totals = categoryTotals(events);
  const accrued = accruedEnergyAt(plan, clamped);

  const lines: ReceiptLine[] = [];
  let grossPaise = 0;
  let accrualApplied = false;

  for (const group of GROUPS) {
    const amount = group.categories.reduce((sum, category) => sum + totals[category], 0);
    const isEnergy = group.categories.includes('electricity') || group.categories.includes('cooling');
    const applyAccrual = isEnergy && !accrualApplied;
    if (applyAccrual) accrualApplied = true;
    const total = applyAccrual ? amount + accrued : amount;
    if (total === 0) continue;
    grossPaise += total;
    lines.push({
      label: group.label,
      amountPaise: total,
      note: group.note,
      credit: total < 0,
    });
  }

  const recovery = Math.abs(totals.recovery);
  const netPaise = grossPaise;
  const elapsedYearsSafe = Math.max(elapsedYears, 0);
  const consumedTb = demandAtTb(config.storage, elapsedYearsSafe);
  const step = [...plan.capacitySteps].reverse().find((entry) => entry.atMs <= clamped);
  const usableTb = step ? step.usableTb : plan.derived.usableTb;

  return {
    reference: receiptReference(startDate, asOfDate),
    configSummary,
    startDate,
    asOfDate,
    elapsedYears: elapsedYearsSafe,
    lines,
    grossPaise,
    accruedEnergyPaise: accrued,
    residualValuePaise: plan.residualValuePaise,
    recoveryPaise: recovery,
    netPaise,
    installedTb: plan.derived.installedTb,
    usableTb,
    consumedTb,
    availableTb: Math.max(0, usableTb - consumedTb),
    insight: buildInsight(plan, totals, grossPaise, elapsedYearsSafe),
  };
}

export function receiptToRows(receipt: CostReceipt): (string | number)[][] {
  const rows: (string | number)[][] = [
    ['HARDCOUNT — Cost Receipt'],
    ['Reference', receipt.reference],
    ['System', receipt.configSummary],
    ['Commissioned', receipt.startDate.toISOString().slice(0, 10)],
    ['Statement as of', receipt.asOfDate.toISOString().slice(0, 10)],
    ['Simulated operating period (years)', receipt.elapsedYears.toFixed(2)],
    [],
    ['Item', 'Amount (INR)', 'Note'],
  ];

  for (const line of receipt.lines) {
    rows.push([line.label, (line.amountPaise / 100).toFixed(2), line.note]);
  }

  rows.push([]);
  rows.push(['Energy accrued but not yet billed (INR)', (receipt.accruedEnergyPaise / 100).toFixed(2), 'Included in the energy lines above']);
  rows.push(['Total net ownership cost (INR)', (receipt.netPaise / 100).toFixed(2), 'Cash basis']);
  rows.push(['Modelled residual asset value (INR)', (receipt.residualValuePaise / 100).toFixed(2), 'Not yet realised']);
  rows.push(['Asset recovery realised (INR)', (receipt.recoveryPaise / 100).toFixed(2), 'Credit already applied']);
  rows.push(['Usable capacity (TB)', receipt.usableTb.toFixed(2), 'After redundancy and reserve']);
  rows.push(['Modelled consumption (TB)', receipt.consumedTb.toFixed(2), 'Growth projection']);
  rows.push(['Available headroom (TB)', receipt.availableTb.toFixed(2), '']);

  return rows;
}

const RUPEE_SYMBOL = '\u20B9';

export const PAISE_PER_RUPEE = 100;

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const DAYS_PER_YEAR = 365.25;
export const MS_PER_YEAR = DAYS_PER_YEAR * MS_PER_DAY;

export function toPaise(rupees: number): number {
  return Math.round(rupees * PAISE_PER_RUPEE);
}

export function toRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

export function roundPaise(value: number): number {
  return Math.round(value);
}

const exactFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const decimalFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatMoney(paise: number, withSymbol = true): string {
  const body = exactFormatter.format(toRupees(paise));
  return withSymbol ? `${RUPEE_SYMBOL}${body}` : body;
}

export function formatMoneyWhole(paise: number, withSymbol = true): string {
  const body = wholeFormatter.format(toRupees(paise));
  return withSymbol ? `${RUPEE_SYMBOL}${body}` : body;
}

export function indianScale(paise: number): { value: string; suffix: string } {
  const rupees = toRupees(paise);
  const magnitude = Math.abs(rupees);
  if (magnitude >= 1e7) {
    return { value: decimalFormatter.format(rupees / 1e7), suffix: 'Cr' };
  }
  if (magnitude >= 1e5) {
    return { value: decimalFormatter.format(rupees / 1e5), suffix: 'L' };
  }
  if (magnitude >= 1e3) {
    return { value: decimalFormatter.format(rupees / 1e3), suffix: 'K' };
  }
  return { value: decimalFormatter.format(rupees), suffix: '' };
}

export function formatMoneyCompact(paise: number, withSymbol = true): string {
  const { value, suffix } = indianScale(paise);
  const prefix = withSymbol ? RUPEE_SYMBOL : '';
  return suffix ? `${prefix}${value}${suffix}` : `${prefix}${value}`;
}

export function formatRupees(rupees: number): string {
  return `${RUPEE_SYMBOL}${exactFormatter.format(rupees)}`;
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatCapacity(tb: number): string {
  if (tb >= 1024) return `${formatNumber(tb / 1024, 2)} PB`;
  return `${formatNumber(tb, 1)} TB`;
}

export function formatPower(watts: number): string {
  if (watts >= 1000) return `${formatNumber(watts / 1000, 2)} kW`;
  return `${formatNumber(watts, 0)} W`;
}

export function currencySymbol(): string {
  return RUPEE_SYMBOL;
}

export function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
}

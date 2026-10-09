import type { LedgerCategory } from '@/domain/types';

export const CATEGORY_COLORS: Record<LedgerCategory, string> = {
  hardware: '#5ab0f0',
  facility: '#3d7fa8',
  commissioning: '#8494a5',
  electricity: '#ffb547',
  cooling: '#e08b1c',
  software: '#9aa7b4',
  labor: '#c9d0d8',
  support: '#6f8fa8',
  maintenance: '#c19a5e',
  replacement: '#d98b3f',
  upgrade: '#4f9fd8',
  incident: '#ff6b5e',
  downtime: '#c2503f',
  security: '#7d8794',
  overhead: '#5b6672',
  decommission: '#9a7f66',
  recovery: '#4fbf8f',
};

export const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  hardware: 'Hardware',
  facility: 'Facility & power',
  commissioning: 'Commissioning',
  electricity: 'Electricity',
  cooling: 'Cooling energy',
  software: 'Software',
  labor: 'Labour & DBA',
  support: 'Vendor support',
  maintenance: 'Maintenance',
  replacement: 'Replacements',
  upgrade: 'Capacity upgrades',
  incident: 'Failures',
  downtime: 'Downtime',
  security: 'Security',
  overhead: 'Room & insurance',
  decommission: 'Decommissioning',
  recovery: 'Asset recovery',
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as LedgerCategory[];

export const STACKABLE_CATEGORIES: LedgerCategory[] = [
  'hardware',
  'facility',
  'commissioning',
  'electricity',
  'cooling',
  'labor',
  'software',
  'support',
  'maintenance',
  'replacement',
  'upgrade',
  'incident',
  'security',
  'overhead',
];

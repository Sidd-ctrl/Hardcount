import type { CoolingId, DriveTypeId, ProcessorClassId, RaidLevelId, RedundancyId } from './types';
import { toPaise } from './money';

export interface ProcessorClassSpec {
  id: ProcessorClassId;
  label: string;
  family: string;
  baseWatts: number;
  basePrice: number;
  extraSocketPrice: number;
  maxSockets: number;
  blurb: string;
}

export const PROCESSOR_CLASSES: Record<ProcessorClassId, ProcessorClassSpec> = {
  entry: {
    id: 'entry',
    label: 'Entry single-socket',
    family: 'Xeon E-2400 class',
    baseWatts: 380,
    basePrice: toPaise(210000),
    extraSocketPrice: 0,
    maxSockets: 1,
    blurb: 'One socket, modest core count. Fine for a departmental workload.',
  },
  midrange: {
    id: 'midrange',
    label: 'Dual-socket workhorse',
    family: 'Xeon Silver / Gold class',
    baseWatts: 640,
    basePrice: toPaise(520000),
    extraSocketPrice: toPaise(180000),
    maxSockets: 2,
    blurb: 'The default choice for a production database with headroom.',
  },
  performance: {
    id: 'performance',
    label: 'High-core dual-socket',
    family: 'EPYC 9004 class',
    baseWatts: 950,
    basePrice: toPaise(980000),
    extraSocketPrice: toPaise(340000),
    maxSockets: 2,
    blurb: 'Dense cores and eight memory channels. Higher draw, higher throughput.',
  },
  flagship: {
    id: 'flagship',
    label: 'Four-socket flagship',
    family: 'Mission-critical class',
    baseWatts: 1500,
    basePrice: toPaise(1750000),
    extraSocketPrice: toPaise(520000),
    maxSockets: 4,
    blurb: 'Maximum memory and RAS features. The power bill notices.',
  },
};

export const RAM_PRICE_PER_GB = toPaise(170);
export const RAM_WATTS_PER_GB = 0.25;
export const NETWORK_IDLE_WATTS = 140;

export interface DriveTypeSpec {
  id: DriveTypeId;
  label: string;
  short: string;
  watts: number;
  pricePerTb: number;
  defaultAfrPct: number;
  capacities: number[];
  blurb: string;
}

export const DRIVE_TYPES: Record<DriveTypeId, DriveTypeSpec> = {
  hdd: {
    id: 'hdd',
    label: 'Nearline HDD',
    short: 'HDD',
    watts: 7.5,
    pricePerTb: toPaise(1625),
    defaultAfrPct: 1.8,
    capacities: [2, 4, 8, 12, 16, 20],
    blurb: 'Cheapest rupee per terabyte. Spins, warms the room, and dies eventually.',
  },
  'sata-ssd': {
    id: 'sata-ssd',
    label: 'SATA SSD',
    short: 'SATA SSD',
    watts: 3,
    pricePerTb: toPaise(9400),
    defaultAfrPct: 0.6,
    capacities: [1.92, 3.84, 7.68, 15.36],
    blurb: 'A middle path: far less power than spinning media, still SATA-bound.',
  },
  'nvme-ssd': {
    id: 'nvme-ssd',
    label: 'NVMe SSD',
    short: 'NVMe',
    watts: 8,
    pricePerTb: toPaise(15400),
    defaultAfrPct: 0.5,
    capacities: [1.92, 3.84, 7.68, 15.36],
    blurb: 'Lowest latency and highest endurance. The most expensive bytes you own.',
  },
};

export interface RaidSpec {
  id: RaidLevelId;
  label: string;
  minDrives: number;
  blurb: string;
}

export const RAID_LEVELS: Record<RaidLevelId, RaidSpec> = {
  jbod: {
    id: 'jbod',
    label: 'JBOD / no parity',
    minDrives: 1,
    blurb: 'Every installed terabyte is addressable. No protection at all.',
  },
  raid5: {
    id: 'raid5',
    label: 'RAID 5',
    minDrives: 3,
    blurb: 'Single-drive tolerance. Rebuilds get uncomfortable past 10 TB drives.',
  },
  raid6: {
    id: 'raid6',
    label: 'RAID 6',
    minDrives: 4,
    blurb: 'Two-drive tolerance. The usual choice for large nearline arrays.',
  },
  raid10: {
    id: 'raid10',
    label: 'RAID 10',
    minDrives: 4,
    blurb: 'Mirrored stripes. Half the capacity, the best rebuild behaviour.',
  },
};

export const REDUNDANCY_MODES: Record<RedundancyId, { label: string; minServers: number; blurb: string }> = {
  single: { label: 'Single node', minServers: 1, blurb: 'One box. Any hardware fault is an outage.' },
  'ha-pair': { label: 'HA pair', minServers: 2, blurb: 'Two nodes with failover. Roughly doubles compute spend.' },
  cluster: { label: 'Three-node cluster', minServers: 3, blurb: 'Quorum-based. Survives a node without a manual decision.' },
};

export interface CoolingSpec {
  id: CoolingId;
  label: string;
  cost: number;
  referencePue: number;
  blurb: string;
}

export const COOLING_OPTIONS: Record<CoolingId, CoolingSpec> = {
  none: {
    id: 'none',
    label: 'No dedicated cooling',
    cost: toPaise(0),
    referencePue: 1.62,
    blurb: 'Room air only. Cheap on day one, expensive every hour after.',
  },
  split: {
    id: 'split',
    label: 'Split AC units',
    cost: toPaise(120000),
    referencePue: 1.42,
    blurb: 'The most common server-room setup in an office building.',
  },
  precision: {
    id: 'precision',
    label: 'Precision / in-row CRAC',
    cost: toPaise(650000),
    referencePue: 1.28,
    blurb: 'Purpose-built cooling with redundancy and humidity control.',
  },
};

export const DEFAULT_ELECTRICITY_RATE = toPaise(8.5);

export const FACILITY_REFERENCE_COSTS = {
  rack: toPaise(85000),
  ups: toPaise(145000),
  network: toPaise(180000),
};

export function drivePriceFor(driveType: DriveTypeId, capacityTb: number): number {
  return Math.round(DRIVE_TYPES[driveType].pricePerTb * capacityTb);
}

export function redundancyEfficiency(level: RaidLevelId, dataDrives: number): number {
  if (dataDrives <= 0) return 0;
  switch (level) {
    case 'jbod':
      return 1;
    case 'raid5':
      return dataDrives >= 2 ? (dataDrives - 1) / dataDrives : 1;
    case 'raid6':
      return dataDrives >= 3 ? (dataDrives - 2) / dataDrives : 1;
    case 'raid10': {
      const mirroredPairs = Math.floor(dataDrives / 2);
      return mirroredPairs > 0 ? mirroredPairs / dataDrives : 1;
    }
  }
}

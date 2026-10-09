import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../defaults';
import { deriveModel } from '../derive';
import { RAID_LEVELS, redundancyEfficiency } from '../catalog';
import { toPaise } from '../money';

describe('redundancy efficiency', () => {
  it('halves capacity on a mirrored stripe', () => {
    expect(redundancyEfficiency('raid10', 8)).toBeCloseTo(0.5, 10);
  });

  it('discards two drives on RAID 6', () => {
    expect(redundancyEfficiency('raid6', 24)).toBeCloseTo(22 / 24, 10);
  });

  it('discards one drive on RAID 5', () => {
    expect(redundancyEfficiency('raid5', 10)).toBeCloseTo(0.9, 10);
  });

  it('keeps everything on JBOD', () => {
    expect(redundancyEfficiency('jbod', 12)).toBe(1);
  });

  it('every published level has a documented minimum drive count', () => {
    Object.values(RAID_LEVELS).forEach((level) => {
      expect(level.minDrives).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('deriveModel', () => {
  const config = defaultConfig();
  const model = deriveModel(config);

  it('counts spares as purchased hardware but not as usable capacity', () => {
    expect(model.installedTb).toBe(24 * 16);
    expect(model.totalDriveCount).toBe(26);
    expect(model.usableTb).toBeLessThan(model.installedTb);
  });

  it('derives usable capacity from redundancy and the reserve', () => {
    const arrayTb = 24 * 16 * (22 / 24);
    expect(model.arrayTb).toBeCloseTo(arrayTb, 6);
    expect(model.reserveTb).toBeCloseTo(arrayTb * 0.1, 6);
    expect(model.usableTb).toBeCloseTo(arrayTb * 0.9, 6);
  });

  it('scales facility power by PUE without adding a second cooling multiplier', () => {
    expect(model.facilityPowerWatts).toBeCloseTo(model.itPowerWatts * config.facility.pue, 6);
    expect(model.overheadPowerWatts).toBeCloseTo(model.itPowerWatts * (config.facility.pue - 1), 6);
    expect(model.annualCoolingPaise).toBeLessThan(model.annualElectricityPaise);
  });

  it('computes energy from kilowatts times operating hours', () => {
    const expected = (model.itPowerWatts / 1000) * 24 * 365.25;
    expect(model.annualItEnergyKwh).toBeCloseTo(expected, 4);
  });

  it('prices electricity from energy and the configured tariff', () => {
    expect(model.annualElectricityPaise).toBe(Math.round(model.annualItEnergyKwh * config.facility.electricityRate));
  });

  it('sums the bill of materials into capital expenditure', () => {
    const fromBom = model.bom.reduce((sum, line) => sum + line.quantity * line.unitPricePaise, 0);
    expect(model.hardwareCapexPaise + model.facilityCapexPaise).toBe(fromBom);
  });

  it('adds commissioning labour to the initial capital outlay', () => {
    expect(model.commissioningPaise).toBe(
      Math.round(config.assumptions.commissioningHours * config.service.laborHourlyRate),
    );
    expect(model.initialCapexPaise).toBe(
      model.hardwareCapexPaise + model.facilityCapexPaise + model.commissioningPaise,
    );
  });

  it('reports cost per usable terabyte against usable capacity, not installed', () => {
    expect(model.costPerUsableTbPaise).toBe(Math.round(model.initialCapexPaise / model.usableTb));
    expect(model.costPerUsableTbPaise).toBeGreaterThan(
      Math.round(model.initialCapexPaise / model.installedTb),
    );
  });

  it('grows the power draw when drives are added', () => {
    const baseline = deriveModel(defaultConfig());
    const heavier = deriveModel({
      ...defaultConfig(),
      storage: { ...defaultConfig().storage, driveCount: 48, spareDrives: 4 },
    });
    expect(heavier.itPowerWatts).toBeGreaterThan(baseline.itPowerWatts);
    expect(heavier.annualCoolingPaise).toBeGreaterThan(baseline.annualCoolingPaise);
  });

  it('holds every monetary field in integer paise', () => {
    const values = [
      model.hardwareCapexPaise,
      model.facilityCapexPaise,
      model.commissioningPaise,
      model.initialCapexPaise,
      model.monthlyFixedOpexPaise,
      model.annualFixedOpexPaise,
      model.annualElectricityPaise,
      model.annualCoolingPaise,
      model.annualMaintenancePaise,
      model.annualSupportPaise,
      model.annualOpexPaise,
      model.costPerUsableTbPaise,
    ];
    values.forEach((value) => {
      expect(Number.isInteger(value)).toBe(true);
    });
  });

  it('converts rupee inputs to paise without drift', () => {
    expect(toPaise(8.5)).toBe(850);
    expect(toPaise(1843.19)).toBe(184319);
  });
});

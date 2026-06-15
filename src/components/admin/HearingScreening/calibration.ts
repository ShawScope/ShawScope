/**
 * Calibration system for hearing screening.
 *
 * Maps "screening dB HL estimate" steps to Web Audio gain values
 * using the clinician-set referenceGain at 1 kHz and optional
 * per-frequency correction points.
 */

export interface CalibrationGain {
  /** Gain fraction (0–1) that represents 0 dB HL at 1 kHz reference */
  referenceGain: number;
  /** Optional per-frequency reference gains for multi-point calibration */
  perFrequencyGains: Record<number, number>;
}

/**
 * Default calibration profile for Sennheiser HD 300 Pro (wired, iPad 50% volume).
 *
 * Derived from the HD 300 Pro's published sensitivity (~110 dB SPL/V @ 1 kHz),
 * a typical iPad headphone-jack output of ~0.5 Vrms at 50% volume, and the
 * IEC 60318-1 circumaural RETSPL values for converting SPL → dB HL.
 *
 * These are sensible STARTING values. Every clinic environment differs —
 * the clinician should still fine-tune in the Calibration panel against a
 * known reference (audiometer or 2cc coupler) for defensible results.
 */
export const DEFAULT_CALIBRATION: CalibrationGain = {
  // Recalibrated 2026-05: previous values were ~4× too loud — every patient
  // floored out at -5/-10 dB HL. New values bring 0 dB HL close to the
  // Sennheiser reference app on the same hardware.
  referenceGain: 0.00022, // 1 kHz reference (0.022%)
  perFrequencyGains: {
    500: 0.00035,   // 0.035%
    1000: 0.00022,  // 0.022% — reference
    2000: 0.00025,  // 0.025%
    4000: 0.00018,  // 0.018%
    8000: 0.00015,  // 0.015%
  },
};

/**
 * Relative gain multipliers for each screening dB step.
 * The 0 dB row is defined as 1.00 × referenceGain.
 */
const DB_MULTIPLIERS: Record<number, number> = {
  [-10]: 0.40,
  [-5]: 0.70,
  0: 1.00,
  5: 1.30,
  10: 1.60,
  15: 2.00,
  20: 2.50,
  25: 3.20,
  30: 4.00,
  35: 5.00,
  40: 6.30,
  50: 10.0,
  60: 16.0,
  70: 25.0,
  80: 40.0,
};

/** All dB HL steps the engine can use (must match types.ts DB_HL_STEPS) */
export const CALIBRATED_DB_STEPS = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80];

/** Calibration frequency presets for 5-point calibration */
export const CALIBRATION_FREQUENCIES = [500, 1000, 2000, 4000, 8000] as const;

/**
 * Multi-point frequency interpolation.
 * Linearly interpolates (in log-freq space) for intermediate frequencies.
 * Falls back to `referenceGain` when no points exist.
 */
function referenceGainForFrequency(freq: number, cal: CalibrationGain): number {
  const entries = Object.entries(cal.perFrequencyGains)
    .map(([k, v]) => [Number(k), v] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  if (entries.length === 0) return cal.referenceGain;

  // Exact match
  const exact = entries.find(([f]) => f === freq);
  if (exact) return exact[1];

  // Below lowest calibrated point
  if (freq <= entries[0][0]) return entries[0][1];
  // Above highest calibrated point
  if (freq >= entries[entries.length - 1][0]) return entries[entries.length - 1][1];

  // Interpolate in log-freq space
  for (let i = 0; i < entries.length - 1; i++) {
    if (freq >= entries[i][0] && freq <= entries[i + 1][0]) {
      const logLow = Math.log2(entries[i][0]);
      const logHigh = Math.log2(entries[i + 1][0]);
      const logFreq = Math.log2(freq);
      const t = (logFreq - logLow) / (logHigh - logLow);
      return entries[i][1] + t * (entries[i + 1][1] - entries[i][1]);
    }
  }

  return cal.referenceGain;
}

/**
 * Convert a screening dB step + frequency into a Web Audio gain fraction.
 *
 * Gain floor: 0.0001 (0.01 %)
 * Gain ceiling: 0.35 (35 %)
 */
export function dbStepToGain(dbStep: number, frequencyHz: number, cal: CalibrationGain): number {
  const refGain = referenceGainForFrequency(frequencyHz, cal);
  const multiplier = DB_MULTIPLIERS[dbStep] ?? 1.0;
  const raw = refGain * multiplier;
  return Math.max(0.0001, Math.min(0.35, raw));
}

/**
 * Given a raw gain fraction and calibration, estimate the closest
 * screening dB value (used when storing locked thresholds).
 */
export function gainToDbEstimate(gain: number, frequencyHz: number, cal: CalibrationGain): number {
  const refGain = referenceGainForFrequency(frequencyHz, cal);
  if (refGain <= 0) return 0;
  const ratio = gain / refGain;

  let closest = 0;
  let closestDist = Infinity;
  for (const [db, mult] of Object.entries(DB_MULTIPLIERS)) {
    const dist = Math.abs(ratio - mult);
    if (dist < closestDist) {
      closestDist = dist;
      closest = Number(db);
    }
  }
  return closest;
}

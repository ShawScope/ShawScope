export type Ear = 'left' | 'right';
export type Classification = 'normal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe' | 'profound' | 'inconclusive';
export type Recommendation = 'reassure' | 'retest' | 'refer_audiology' | 'urgent_gp_ent';
export type RoomNoiseStatus = 'pass' | 'fail' | 'not_checked';
export type ServiceContext = 'earwax_removal' | 'ear_wellness' | 'standalone';
export type StaircaseMode = 'automatic' | 'manual_assisted';
export type TrialPacing = 'automatic' | 'clinician_paced';

export interface ScreeningPoint {
  ear: Ear;
  frequency_hz: number;
  step_level: number;
  estimated_dbhl: number;
  stimulus_db_step: number;
  heard: boolean;
  attempts: number;
  presentations: number;
  catch_trials: number;
  false_positives: number;
  raw_log: TrialLog[];
}

export interface TrialLog {
  timestamp: number;
  frequency_hz: number;
  step_level: number;
  estimated_dbhl: number;
  is_catch: boolean;
  responded: boolean;
  response_time_ms: number | null;
}

export interface ThresholdResult {
  frequency_hz: number;
  estimated_dbhl: number;
  step_level: number;
  presentations: number;
  catch_trials: number;
  false_positives: number;
  reliable: boolean;
  reversals?: number;
  capped?: boolean;
  mode?: StaircaseMode;
  /** True when clinician used manual override lock without meeting confirmation criteria */
  unverified?: boolean;
  /** The locked gain fraction for this threshold */
  locked_gain?: number;
}

export interface EarResults {
  thresholds: ThresholdResult[];
  classification: Classification;
  false_positive_rate: number;
}

export interface ScreeningResults {
  left: EarResults;
  right: EarResults;
  overall_recommendation: Recommendation;
  clinical_summary: string;
  patient_friendly_summary: string;
  age_context_text: string;
}

export interface SetupChecklist {
  quiet_room: boolean;
  headphones_fitted: boolean;
  volume_max: boolean;
  dnd_mode: boolean;
  patient_understands: boolean;
}

/** Extended dB HL steps including negative values for sub-threshold testing */
export const DB_HL_STEPS = [-10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80];

export type FrequencySet = 'standard' | 'advanced';

export const STANDARD_FREQUENCIES = [500, 1000, 2000, 4000];
export const ADVANCED_FREQUENCIES = [250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000];

// Legacy alias
export const TEST_FREQUENCIES = STANDARD_FREQUENCIES;

export const ADAPTIVE_CONFIG = {
  standard: { minPresentations: 12, reversals: 3, hardCap: 24, estPerFreq: 16, estMinPerEar: 5 },
  advanced: { minPresentations: 10, reversals: 3, hardCap: 20, estPerFreq: 13, estMinPerEar: 10 },
} as const;

export const CLASSIFICATION_BANDS: { label: string; key: Classification; min: number; max: number; colour: string }[] = [
  { label: 'Normal', key: 'normal', min: -10, max: 25, colour: '#22c55e' },
  { label: 'Mild', key: 'mild', min: 26, max: 40, colour: '#eab308' },
  { label: 'Moderate', key: 'moderate', min: 41, max: 55, colour: '#f97316' },
  { label: 'Moderately Severe', key: 'moderately_severe', min: 56, max: 70, colour: '#ef4444' },
  { label: 'Severe', key: 'severe', min: 71, max: 90, colour: '#dc2626' },
  { label: 'Profound', key: 'profound', min: 91, max: 120, colour: '#7f1d1d' },
];

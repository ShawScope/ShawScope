import { useState, useRef, useCallback, useEffect } from 'react';
import { Ear, DB_HL_STEPS, STANDARD_FREQUENCIES, ADVANCED_FREQUENCIES, ThresholdResult, TrialLog, Classification, Recommendation, FrequencySet, StaircaseMode } from './types';
import { CalibrationGain, DEFAULT_CALIBRATION, dbStepToGain } from './calibration';

interface EngineState {
  phase: 'idle' | 'testing' | 'paused' | 'ear_complete' | 'done';
  currentEar: Ear;
  currentFreqIndex: number;
  currentStepIndex: number;
  trialNumber: number;
  toneActive: boolean;
  beepNumber: number;
  totalBeeps: number;
  responseWindowOpen: boolean;
}

export interface ProgressInfo {
  overallPercent: number;
  leftPercent: number;
  rightPercent: number;
  estimatedSecondsRemaining: number;
}

export interface ManualTrialInfo {
  ear: Ear;
  frequencyHz: number;
  stepIndex: number;
  estimatedDbhl: number;
  responded: boolean | null;
  responseTimeMs: number | null;
}

/** Per-frequency tracking for locking rule enforcement */
interface FreqTrialTracker {
  /** Total presentations at the *current* step level */
  presentationsAtLevel: number;
  /** Number of "heard" confirmations at the *current* step level */
  confirmationsAtLevel: number;
  /** The step index being tracked */
  trackedStepIndex: number;
}

/** Minimum presentations before locking is enabled */
const MIN_PRESENTATIONS_FOR_LOCK = 3;
/** Minimum confirmations (out of MIN_PRESENTATIONS_FOR_LOCK) */
const MIN_CONFIRMATIONS_FOR_LOCK = 2;

// ===== Automatic (Hughson-Westlake) constants =====
const HW_DOWN_DB = 10;
const HW_UP_DB = 5;
const HW_REQUIRED_ASCENDING_HITS = 2;
const HW_HARD_CAP = 18;
const HW_CATCH_TRIAL_EVERY = 6;
const HW_RESPONSE_WINDOW_MS = 1500;
const HW_ISI_MIN = 700;
const HW_ISI_MAX = 1300;
const FPR_UNRELIABLE_THRESHOLD = 0.25;
/** Starting step index = 40 dB HL (index 10 in DB_HL_STEPS) — clearly audible familiarisation level */
const HW_START_STEP_INDEX = 10;
/** Delay between locking one frequency and starting the next */
const HW_INTER_FREQ_DELAY_MS = 250;

// 4-beep pattern constants
const BEEP_DURATION_MS = 150;
const BEEP_GAP_MS = 120;
const BEEP_FADE_MS = 10;
const BEEPS_PER_TRIAL = 4;

/** Per-frequency tracking for automatic Hughson-Westlake staircase */
interface AutoFreqState {
  presentations: number;
  catchTrials: number;
  falsePositives: number;
  reversals: number;
  lastDirection: 'up' | 'down' | null;
  ascendingHitsByLevel: Record<number, number>;
  ascendingAttemptsByLevel: Record<number, number>;
  lastStepIndex: number;
  thresholdStepIndex: number | null;
  capped: boolean;
}

function emptyAutoState(startStep: number): AutoFreqState {
  return {
    presentations: 0, catchTrials: 0, falsePositives: 0, reversals: 0,
    lastDirection: null, ascendingHitsByLevel: {}, ascendingAttemptsByLevel: {},
    lastStepIndex: startStep, thresholdStepIndex: null, capped: false,
  };
}

function clampStepByDb(db: number): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < DB_HL_STEPS.length; i++) {
    const d = Math.abs(DB_HL_STEPS[i] - db);
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

export function useScreeningEngine(
  frequencySet: FrequencySet = 'advanced',
  calibrationGain?: CalibrationGain,
  staircaseMode: StaircaseMode = 'manual_assisted',
) {
  const frequencies = frequencySet === 'advanced' ? ADVANCED_FREQUENCIES : STANDARD_FREQUENCIES;
  const cal = calibrationGain ?? DEFAULT_CALIBRATION;

  const [state, setState] = useState<EngineState>({
    phase: 'idle',
    currentEar: 'left',
    currentFreqIndex: 0,
    currentStepIndex: HW_START_STEP_INDEX,
    trialNumber: 0,
    toneActive: false,
    beepNumber: 0,
    totalBeeps: BEEPS_PER_TRIAL,
    responseWindowOpen: false,
  });

  const [leftResults, setLeftResults] = useState<ThresholdResult[]>([]);
  const [rightResults, setRightResults] = useState<ThresholdResult[]>([]);
  const [progress, setProgress] = useState<ProgressInfo>({
    overallPercent: 0, leftPercent: 0, rightPercent: 0, estimatedSecondsRemaining: 0,
  });
  const [manualTrialLog, setManualTrialLog] = useState<ManualTrialInfo[]>([]);
  /** Whether locked thresholds appear to all be at the gain floor */
  const [floorWarning, setFloorWarning] = useState(false);
  /** Whether the current frequency meets lock criteria */
  const [lockReady, setLockReady] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const toneStartTimeRef = useRef<number>(0);
  const waitingForResponseRef = useRef(false);
  const phaseRef = useRef(state.phase);
  const frequenciesRef = useRef(frequencies);
  const presentationsRef = useRef(0);
  const calRef = useRef(cal);
  calRef.current = cal;
  frequenciesRef.current = frequencies;

  // Per-frequency trial tracker
  const freqTrackerRef = useRef<FreqTrialTracker>({ presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: state.currentStepIndex });

  // ===== Automatic mode state =====
  const modeRef = useRef<StaircaseMode>(staircaseMode);
  modeRef.current = staircaseMode;
  const autoStateRef = useRef<AutoFreqState>(emptyAutoState(HW_START_STEP_INDEX));
  const autoTimersRef = useRef<number[]>([]);
  const isCatchTrialRef = useRef(false);
  const responseTimerRef = useRef<number | null>(null);

  const clearAutoTimers = useCallback(() => {
    autoTimersRef.current.forEach(t => clearTimeout(t));
    autoTimersRef.current = [];
    if (responseTimerRef.current !== null) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }
  }, []);

  const resetAutoFreq = useCallback((startStepIdx: number) => {
    autoStateRef.current = emptyAutoState(startStepIdx);
    isCatchTrialRef.current = false;
  }, []);

  useEffect(() => { phaseRef.current = state.phase; }, [state.phase]);

  // Reset tracker when frequency or level changes
  useEffect(() => {
    if (freqTrackerRef.current.trackedStepIndex !== state.currentStepIndex) {
      freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: state.currentStepIndex };
      setLockReady(false);
    }
  }, [state.currentStepIndex]);

  const updateLockReady = useCallback(() => {
    const t = freqTrackerRef.current;
    setLockReady(t.presentationsAtLevel >= MIN_PRESENTATIONS_FOR_LOCK && t.confirmationsAtLevel >= MIN_CONFIRMATIONS_FOR_LOCK);
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, [getAudioContext]);

  const playBeepPattern = useCallback((frequencyHz: number, volumeFraction: number, ear: Ear) => {
    const ctx = getAudioContext();
    activeOscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    activeOscillatorsRef.current = [];

    const panNode = ctx.createStereoPanner();
    panNode.pan.value = ear === 'left' ? -1 : 1;
    panNode.connect(ctx.destination);

    for (let i = 0; i < BEEPS_PER_TRIAL; i++) {
      const startOffset = i * (BEEP_DURATION_MS + BEEP_GAP_MS) / 1000;
      const beepDur = BEEP_DURATION_MS / 1000;
      const fadeDur = BEEP_FADE_MS / 1000;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequencyHz;

      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(volumeFraction, ctx.currentTime + startOffset + fadeDur);
      gain.gain.setValueAtTime(volumeFraction, ctx.currentTime + startOffset + beepDur - fadeDur);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startOffset + beepDur);

      osc.connect(gain);
      gain.connect(panNode);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + beepDur);
      activeOscillatorsRef.current.push(osc);

      const beepIdx = i + 1;
      setTimeout(() => {
        if (phaseRef.current === 'testing') {
          setState(prev => ({ ...prev, beepNumber: beepIdx }));
        }
      }, startOffset * 1000);
    }

    const totalDur = BEEPS_PER_TRIAL * (BEEP_DURATION_MS + BEEP_GAP_MS) - BEEP_GAP_MS;
    setTimeout(() => {
      setState(prev => ({ ...prev, toneActive: false }));
    }, totalDur);
  }, [getAudioContext]);

  // ===== PLAY STIMULUS (clinician triggers) =====
  const playStimulus = useCallback((silent: boolean = false) => {
    if (phaseRef.current !== 'testing') return;

    presentationsRef.current++;
    freqTrackerRef.current.presentationsAtLevel++;
    isCatchTrialRef.current = silent;
    if (modeRef.current === 'automatic') {
      const s = autoStateRef.current;
      s.presentations++;
      if (silent) s.catchTrials++;
    }

    setState(prev => {
      const freqs = frequenciesRef.current;
      const freq = freqs[prev.currentFreqIndex];
      if (!silent) {
        const volume = dbStepToGain(DB_HL_STEPS[prev.currentStepIndex], freq, calRef.current);
        playBeepPattern(freq, volume, prev.currentEar);
      } else {
        const totalDur = BEEPS_PER_TRIAL * (BEEP_DURATION_MS + BEEP_GAP_MS) - BEEP_GAP_MS;
        setTimeout(() => setState(p => ({ ...p, toneActive: false })), totalDur);
      }
      toneStartTimeRef.current = Date.now();
      waitingForResponseRef.current = true;
      return {
        ...prev,
        toneActive: !silent,
        beepNumber: 0,
        responseWindowOpen: true,
        trialNumber: prev.trialNumber + 1,
      };
    });
  }, [playBeepPattern]);

  // ===== REPEAT (same freq/level) =====
  const repeatTrial = useCallback(() => {
    waitingForResponseRef.current = false;
    setState(prev => ({ ...prev, responseWindowOpen: false, toneActive: false, beepNumber: 0 }));
    setTimeout(() => playStimulus(), 200);
  }, [playStimulus]);

  // ===== PATIENT RESPONSE =====
  const handleResponse = useCallback(() => {
    if (phaseRef.current !== 'testing') return;
    if (!waitingForResponseRef.current) return;

    const responseTime = Date.now() - toneStartTimeRef.current;
    waitingForResponseRef.current = false;

    // Track confirmation
    freqTrackerRef.current.confirmationsAtLevel++;
    updateLockReady();

    // Automatic mode: classify response (catch trial response = false positive)
    const wasCatch = isCatchTrialRef.current;
    if (modeRef.current === 'automatic') {
      const s = autoStateRef.current;
      if (wasCatch) {
        s.falsePositives++;
      } else if (s.lastDirection === 'up') {
        const lvl = s.lastStepIndex;
        s.ascendingHitsByLevel[lvl] = (s.ascendingHitsByLevel[lvl] || 0) + 1;
      }
      if (responseTimerRef.current !== null) {
        clearTimeout(responseTimerRef.current);
        responseTimerRef.current = null;
      }
    }

    activeOscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    activeOscillatorsRef.current = [];

    setState(prev => {
      const freqs = frequenciesRef.current;
      setManualTrialLog(log => [...log, {
        ear: prev.currentEar,
        frequencyHz: freqs[prev.currentFreqIndex],
        stepIndex: prev.currentStepIndex,
        estimatedDbhl: DB_HL_STEPS[prev.currentStepIndex],
        responded: true,
        responseTimeMs: responseTime,
      }]);
      return { ...prev, toneActive: false, beepNumber: 0, responseWindowOpen: false };
    });

    if (modeRef.current === 'automatic') {
      // schedule next step (defined below; ref via setTimeout to avoid TDZ issues handled by closure)
      autoScheduleRef.current?.(wasCatch ? 'catch_responded' : 'heard');
    }
  }, [updateLockReady]);

  // ===== AUTOMATIC SCHEDULER (defined via ref to break circular dependency) =====
  const autoScheduleRef = useRef<((outcome: 'heard' | 'missed' | 'catch_responded' | 'catch_silent') => void) | null>(null);
  const autoFinalizeRef = useRef<((lockStepIdx: number) => void) | null>(null);

  const startResponseTimeout = useCallback((stepIdxAtPresentation: number, freqIdx: number, ear: Ear, isCatch: boolean) => {
    const toneDur = BEEPS_PER_TRIAL * (BEEP_DURATION_MS + BEEP_GAP_MS) - BEEP_GAP_MS;
    responseTimerRef.current = window.setTimeout(() => {
      if (!waitingForResponseRef.current) return;
      waitingForResponseRef.current = false;
      responseTimerRef.current = null;
      setState(p => ({ ...p, responseWindowOpen: false, toneActive: false }));
      setManualTrialLog(log => [...log, {
        ear, frequencyHz: frequenciesRef.current[freqIdx],
        stepIndex: stepIdxAtPresentation,
        estimatedDbhl: DB_HL_STEPS[stepIdxAtPresentation],
        responded: false, responseTimeMs: null,
      }]);
      autoScheduleRef.current?.(isCatch ? 'catch_silent' : 'missed');
    }, toneDur + HW_RESPONSE_WINDOW_MS);
  }, []);

  const scheduleAutoNext = useCallback((outcome: 'heard' | 'missed' | 'catch_responded' | 'catch_silent') => {
    if (modeRef.current !== 'automatic') return;
    if (phaseRef.current !== 'testing') return;

    const s = autoStateRef.current;

    let nextStep: number;
    if (outcome === 'heard') {
      if (s.lastDirection === 'up') s.reversals++;
      s.lastDirection = 'down';
      nextStep = clampStepByDb(DB_HL_STEPS[s.lastStepIndex] - HW_DOWN_DB);
    } else if (outcome === 'missed') {
      if (s.lastDirection === 'down') s.reversals++;
      s.lastDirection = 'up';
      nextStep = clampStepByDb(DB_HL_STEPS[s.lastStepIndex] + HW_UP_DB);
    } else {
      nextStep = s.lastStepIndex;
    }

    // Convergence check (2-of-3 ascending rule)
    // Convergence: 2 ascending hits at the same level (standard HW shortcut)
    let converged: number | null = null;
    for (const [lvlStr, hits] of Object.entries(s.ascendingHitsByLevel)) {
      const lvl = Number(lvlStr);
      if (hits >= HW_REQUIRED_ASCENDING_HITS) {
        if (converged === null || DB_HL_STEPS[lvl] < DB_HL_STEPS[converged]) converged = lvl;
      }
    }

    const capped = s.presentations >= HW_HARD_CAP;
    if (converged !== null || capped) {
      s.thresholdStepIndex = converged;
      s.capped = capped && converged === null;
      const lockStep = converged !== null ? converged : s.lastStepIndex;
      autoFinalizeRef.current?.(lockStep);
      return;
    }

    const isCatch = (s.presentations % HW_CATCH_TRIAL_EVERY === 0) && s.presentations > 0;
    const isi = HW_ISI_MIN + Math.floor(Math.random() * (HW_ISI_MAX - HW_ISI_MIN));

    const t = window.setTimeout(() => {
      if (phaseRef.current !== 'testing') return;
      setState(prev => ({ ...prev, currentStepIndex: nextStep }));
      s.lastStepIndex = nextStep;
      if (!isCatch && s.lastDirection === 'up') {
        s.ascendingAttemptsByLevel[nextStep] = (s.ascendingAttemptsByLevel[nextStep] || 0) + 1;
      }
      const ear = state.currentEar;
      const freqIdx = state.currentFreqIndex;
      const t2 = window.setTimeout(() => {
        playStimulus(isCatch);
        startResponseTimeout(nextStep, freqIdx, ear, isCatch);
      }, 60);
      autoTimersRef.current.push(t2);
    }, isi);
    autoTimersRef.current.push(t);
  }, [playStimulus, startResponseTimeout, state.currentEar, state.currentFreqIndex]);

  const finalizeAutoFreq = useCallback((lockStepIdx: number) => {
    clearAutoTimers();
    waitingForResponseRef.current = false;
    activeOscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    activeOscillatorsRef.current = [];

    const s = autoStateRef.current;
    const fpr = s.catchTrials > 0 ? s.falsePositives / s.catchTrials : 0;
    const reliable = !s.capped && fpr <= FPR_UNRELIABLE_THRESHOLD && s.reversals >= 2;

    setState(prev => {
      const freqs = frequenciesRef.current;
      const freq = freqs[prev.currentFreqIndex];
      const lockedGain = dbStepToGain(DB_HL_STEPS[lockStepIdx], freq, calRef.current);

      const result: ThresholdResult = {
        frequency_hz: freq,
        estimated_dbhl: DB_HL_STEPS[lockStepIdx],
        step_level: lockStepIdx,
        presentations: s.presentations,
        catch_trials: s.catchTrials,
        false_positives: s.falsePositives,
        reliable,
        reversals: s.reversals,
        capped: s.capped,
        mode: 'automatic',
        unverified: s.capped,
        locked_gain: lockedGain,
      };

      if (prev.currentEar === 'left') {
        setLeftResults(r => {
          const existing = r.filter(t => t.frequency_hz !== result.frequency_hz);
          return [...existing, result].sort((a, b) => a.frequency_hz - b.frequency_hz);
        });
      } else {
        setRightResults(r => {
          const existing = r.filter(t => t.frequency_hz !== result.frequency_hz);
          return [...existing, result].sort((a, b) => a.frequency_hz - b.frequency_hz);
        });
      }

      presentationsRef.current = 0;
      freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };

      const nextIdx = prev.currentFreqIndex + 1;
      const startStep = HW_START_STEP_INDEX;
      resetAutoFreq(startStep);
      if (nextIdx < freqs.length) {
        const ear = prev.currentEar;
        const t = window.setTimeout(() => {
          if (phaseRef.current !== 'testing') return;
          autoStateRef.current.lastStepIndex = startStep;
          playStimulus(false);
          startResponseTimeout(startStep, nextIdx, ear, false);
        }, HW_INTER_FREQ_DELAY_MS);
        autoTimersRef.current.push(t);
        return { ...prev, currentFreqIndex: nextIdx, currentStepIndex: startStep, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
      }
      if (prev.currentEar === 'left') {
        return { ...prev, phase: 'ear_complete' as const, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
      }
      return { ...prev, phase: 'done' as const, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
    });
  }, [clearAutoTimers, playStimulus, resetAutoFreq, startResponseTimeout]);

  // Wire scheduler refs
  useEffect(() => {
    autoScheduleRef.current = scheduleAutoNext;
    autoFinalizeRef.current = finalizeAutoFreq;
  }, [scheduleAutoNext, finalizeAutoFreq]);

  // ===== FREQUENCY CONTROL =====
  const frequencyUp = useCallback(() => {
    waitingForResponseRef.current = false;
    freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };
    setLockReady(false);
    setState(prev => {
      const freqs = frequenciesRef.current;
      const next = Math.min(prev.currentFreqIndex + 1, freqs.length - 1);
      return { ...prev, currentFreqIndex: next, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
    });
  }, []);

  const frequencyDown = useCallback(() => {
    waitingForResponseRef.current = false;
    freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };
    setLockReady(false);
    setState(prev => {
      const next = Math.max(prev.currentFreqIndex - 1, 0);
      return { ...prev, currentFreqIndex: next, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
    });
  }, []);

  // ===== LEVEL CONTROL =====
  const levelUp = useCallback(() => {
    waitingForResponseRef.current = false;
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.min(prev.currentStepIndex + 1, DB_HL_STEPS.length - 1),
      responseWindowOpen: false, toneActive: false, beepNumber: 0,
    }));
  }, []);

  const levelDown = useCallback(() => {
    waitingForResponseRef.current = false;
    setState(prev => ({
      ...prev,
      currentStepIndex: Math.max(prev.currentStepIndex - 1, 0),
      responseWindowOpen: false, toneActive: false, beepNumber: 0,
    }));
  }, []);

  // ===== EAR CONTROL =====
  const switchEar = useCallback((ear: Ear) => {
    waitingForResponseRef.current = false;
    freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };
    setLockReady(false);
    setState(prev => ({
      ...prev,
      currentEar: ear,
      responseWindowOpen: false, toneActive: false, beepNumber: 0,
    }));
  }, []);

  // ===== LOCK THRESHOLD =====
  const lockThreshold = useCallback((forceOverride = false) => {
    // Check locking criteria unless overriding
    if (!forceOverride) {
      const t = freqTrackerRef.current;
      if (t.presentationsAtLevel < MIN_PRESENTATIONS_FOR_LOCK || t.confirmationsAtLevel < MIN_CONFIRMATIONS_FOR_LOCK) {
        return false; // Cannot lock — criteria not met
      }
    }

    waitingForResponseRef.current = false;
    activeOscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    activeOscillatorsRef.current = [];

    setState(prev => {
      const freqs = frequenciesRef.current;
      const freq = freqs[prev.currentFreqIndex];
      const lockedGain = dbStepToGain(DB_HL_STEPS[prev.currentStepIndex], freq, calRef.current);

      const result: ThresholdResult = {
        frequency_hz: freq,
        estimated_dbhl: DB_HL_STEPS[prev.currentStepIndex],
        step_level: prev.currentStepIndex,
        presentations: presentationsRef.current,
        catch_trials: 0,
        false_positives: 0,
        reliable: !forceOverride,
        reversals: 0,
        capped: false,
        mode: 'manual_assisted',
        unverified: forceOverride,
        locked_gain: lockedGain,
      };

      if (prev.currentEar === 'left') {
        setLeftResults(r => {
          const existing = r.filter(t => t.frequency_hz !== result.frequency_hz);
          return [...existing, result].sort((a, b) => a.frequency_hz - b.frequency_hz);
        });
      } else {
        setRightResults(r => {
          const existing = r.filter(t => t.frequency_hz !== result.frequency_hz);
          return [...existing, result].sort((a, b) => a.frequency_hz - b.frequency_hz);
        });
      }

      presentationsRef.current = 0;
      freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };
      setLockReady(false);
      return { ...prev, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
    });
    return true;
  }, []);

  // ===== NEXT FREQUENCY =====
  const nextFrequency = useCallback(() => {
    waitingForResponseRef.current = false;
    presentationsRef.current = 0;
    freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };
    setLockReady(false);
    setState(prev => {
      const freqs = frequenciesRef.current;
      const nextIdx = prev.currentFreqIndex + 1;
      if (nextIdx < freqs.length) {
        return {
          ...prev,
          currentFreqIndex: nextIdx,
          currentStepIndex: HW_START_STEP_INDEX,
          responseWindowOpen: false, toneActive: false, beepNumber: 0,
        };
      }
      if (prev.currentEar === 'left') {
        return { ...prev, phase: 'ear_complete' as const, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
      }
      return { ...prev, phase: 'done' as const, responseWindowOpen: false, toneActive: false, beepNumber: 0 };
    });
  }, []);

  // ===== FINISH TEST =====
  const finishTest = useCallback(() => {
    waitingForResponseRef.current = false;
    activeOscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    activeOscillatorsRef.current = [];
    setState(prev => ({ ...prev, phase: 'done', responseWindowOpen: false, toneActive: false, beepNumber: 0 }));
  }, []);

  // ===== START =====
  const startScreening = useCallback(() => {
    getAudioContext();
    unlockAudio();
    setLeftResults([]);
    setRightResults([]);
    setManualTrialLog([]);
    setFloorWarning(false);
    setLockReady(false);
    presentationsRef.current = 0;
    freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };
    clearAutoTimers();
    resetAutoFreq(HW_START_STEP_INDEX);

    setState({
      phase: 'testing',
      currentEar: 'left',
      currentFreqIndex: 0,
      currentStepIndex: HW_START_STEP_INDEX,
      trialNumber: 0,
      toneActive: false,
      beepNumber: 0,
      totalBeeps: BEEPS_PER_TRIAL,
      responseWindowOpen: false,
    });

    if (modeRef.current === 'automatic') {
      autoStateRef.current.lastStepIndex = 6;
      const t = window.setTimeout(() => {
        if (phaseRef.current !== 'testing') return;
        playStimulus(false);
        startResponseTimeout(6, 0, 'left', false);
      }, 700);
      autoTimersRef.current.push(t);
    }
  }, [getAudioContext, unlockAudio, clearAutoTimers, resetAutoFreq, playStimulus, startResponseTimeout]);

  const startRightEar = useCallback(() => {
    presentationsRef.current = 0;
    freqTrackerRef.current = { presentationsAtLevel: 0, confirmationsAtLevel: 0, trackedStepIndex: -1 };
    setLockReady(false);
    clearAutoTimers();
    resetAutoFreq(6);
    setState(prev => ({
      ...prev,
      phase: 'testing',
      currentEar: 'right',
      currentFreqIndex: 0,
      currentStepIndex: 6,
      trialNumber: 0,
      toneActive: false,
      beepNumber: 0,
      responseWindowOpen: false,
    }));
    if (modeRef.current === 'automatic') {
      const t = window.setTimeout(() => {
        if (phaseRef.current !== 'testing') return;
        autoStateRef.current.lastStepIndex = 6;
        playStimulus(false);
        startResponseTimeout(6, 0, 'right', false);
      }, 700);
      autoTimersRef.current.push(t);
    }
  }, [clearAutoTimers, resetAutoFreq, playStimulus, startResponseTimeout]);

  // ===== PAUSE / RESUME =====
  const pause = useCallback(() => {
    if (phaseRef.current !== 'testing' && phaseRef.current !== 'ear_complete') return;
    activeOscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    activeOscillatorsRef.current = [];
    waitingForResponseRef.current = false;
    clearAutoTimers();
    setState(prev => ({ ...prev, phase: 'paused', toneActive: false, beepNumber: 0, responseWindowOpen: false }));
  }, [clearAutoTimers]);

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    setState(prev => ({ ...prev, phase: 'testing' }));
    if (modeRef.current === 'automatic') {
      const t = window.setTimeout(() => autoScheduleRef.current?.('missed'), 500);
      autoTimersRef.current.push(t);
    }
  }, []);

  const cleanup = useCallback(() => {
    clearAutoTimers();
    activeOscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    activeOscillatorsRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, [clearAutoTimers]);

  useEffect(() => () => cleanup(), [cleanup]);

  // Update progress
  useEffect(() => {
    const totalFreqs = frequenciesRef.current.length * 2;
    const done = leftResults.length + rightResults.length;
    setProgress({
      overallPercent: totalFreqs > 0 ? Math.round((done / totalFreqs) * 100) : 0,
      leftPercent: Math.round((leftResults.length / frequenciesRef.current.length) * 100),
      rightPercent: Math.round((rightResults.length / frequenciesRef.current.length) * 100),
      estimatedSecondsRemaining: 0,
    });
  }, [leftResults.length, rightResults.length]);

  // Floor warning: check if 3+ thresholds locked at minimum dB step (floor)
  useEffect(() => {
    const all = [...leftResults, ...rightResults];
    if (all.length >= 3) {
      const minStep = DB_HL_STEPS[0]; // -10 dB
      const atFloor = all.filter(t => t.estimated_dbhl === minStep).length;
      setFloorWarning(atFloor >= 3);
    } else {
      setFloorWarning(false);
    }
  }, [leftResults, rightResults]);

  return {
    state,
    leftResults,
    rightResults,
    progress,
    frequencies,
    startScreening,
    startRightEar,
    handleResponse,
    pause,
    resume,
    cleanup,
    manualTrialLog,
    playStimulus,
    repeatTrial,
    frequencyUp,
    frequencyDown,
    levelUp,
    levelDown,
    switchEar,
    lockThreshold,
    nextFrequency,
    finishTest,
    lockReady,
    floorWarning,
    staircaseMode,
  };
}

// Classification logic
export function classifyEar(thresholds: ThresholdResult[]): Classification {
  if (thresholds.length === 0) return 'inconclusive';
  const avgDbhl = thresholds.reduce((s, t) => s + t.estimated_dbhl, 0) / thresholds.length;
  if (avgDbhl <= 25) return 'normal';
  if (avgDbhl <= 40) return 'mild';
  if (avgDbhl <= 55) return 'moderate';
  if (avgDbhl <= 70) return 'moderately_severe';
  if (avgDbhl <= 90) return 'severe';
  return 'profound';
}

export function getRecommendation(left: Classification, right: Classification): Recommendation {
  const severityOrder: Classification[] = ['normal', 'mild', 'moderate', 'moderately_severe', 'severe', 'profound', 'inconclusive'];
  const worst = severityOrder.indexOf(left) > severityOrder.indexOf(right) ? left : right;
  if (worst === 'inconclusive') return 'retest';
  if (worst === 'normal') return 'reassure';
  if (worst === 'mild') return 'retest';
  if (worst === 'moderate' || worst === 'moderately_severe') return 'refer_audiology';
  return 'urgent_gp_ent';
}

export function getClassificationLabel(c: Classification): string {
  const labels: Record<Classification, string> = {
    normal: 'Normal', mild: 'Mild', moderate: 'Moderate',
    moderately_severe: 'Moderately Severe', severe: 'Severe',
    profound: 'Profound', inconclusive: 'Inconclusive',
  };
  return labels[c];
}

export function getRecommendationLabel(r: Recommendation): string {
  const labels: Record<Recommendation, string> = {
    reassure: 'Reassure — No Further Action',
    retest: 'Retest Recommended',
    refer_audiology: 'Refer to Audiology',
    urgent_gp_ent: 'Urgent GP/ENT Referral',
  };
  return labels[r];
}

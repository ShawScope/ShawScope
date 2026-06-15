import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Ear, Volume2, ShieldCheck, Play, Loader2, FileDown, Settings, Search, User, ChevronRight, Pause, Minimize2, Monitor, Smartphone, CheckCircle, ArrowUp, ArrowDown, Lock, FastForward, RotateCcw, Clock, ChevronUp, ChevronDown, AlertTriangle, X } from 'lucide-react';
import { useScreeningEngine, classifyEar, getRecommendation, getClassificationLabel, getRecommendationLabel } from './useScreeningEngine';
import { usePromptAudio } from './usePromptAudio';
import { ServiceContext, RoomNoiseStatus, DB_HL_STEPS, FrequencySet, StaircaseMode } from './types';
import Audiogram from './Audiogram';
import SettingsPanel, { VolumeTarget, CalibrationGain } from './SettingsPanel';
import { DEFAULT_CALIBRATION } from './calibration';
import { getPatientFriendlySummary, getClinicalSummary, getAgeContextText } from './interpretations';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { generateScreeningPdf } from './pdfGenerator';

interface HearingScreeningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string | null;
  patientName?: string | null;
  patientDob?: string | null;
  patientEmail?: string | null;
  consultationId?: string | null;
  serviceContext?: ServiceContext;
  onComplete?: () => void;
}

type Step = 'entry' | 'setup' | 'volume_check' | 'intro' | 'testing' | 'results';
type ViewMode = 'practitioner' | 'patient';

const HearingScreeningDialog = ({
  open, onOpenChange, patientId: initialPatientId, patientName: initialPatientName,
  patientDob: initialPatientDob, patientEmail: initialPatientEmail,
  consultationId, serviceContext = 'standalone', onComplete,
}: HearingScreeningDialogProps) => {
  const { user } = useAuth();
  const promptAudio = usePromptAudio();

  const [patientId, setPatientId] = useState<string | null>(initialPatientId || null);
  const [patientName, setPatientName] = useState<string | null>(initialPatientName || null);
  const [patientDob, setPatientDob] = useState<string | null>(initialPatientDob || null);
  const [patientEmail, setPatientEmail] = useState<string | null>(initialPatientEmail || null);
  const [isGeneralMode, setIsGeneralMode] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [step, setStep] = useState<Step>('entry');
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const [volumeConfirmed, setVolumeConfirmed] = useState(false);
  const [roomNoise, setRoomNoise] = useState<RoomNoiseStatus>('not_checked');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [promptPlaying, setPromptPlaying] = useState(false);
  const [frequencySet, setFrequencySet] = useState<FrequencySet>('advanced');
  const [isMinimised, setIsMinimised] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('practitioner');
  const [pendingViewSwitch, setPendingViewSwitch] = useState<ViewMode | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [volumeTarget, setVolumeTarget] = useState<VolumeTarget>(50);
  const [buttonFlash, setButtonFlash] = useState(false);
  const [calibrationGain, setCalibrationGain] = useState<CalibrationGain>({ ...DEFAULT_CALIBRATION });
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [staircaseMode, setStaircaseMode] = useState<StaircaseMode>('manual_assisted');

  const {
    state, leftResults, rightResults, progress, frequencies,
    startScreening, startRightEar, handleResponse: engineHandleResponse, pause, resume, cleanup,
    manualTrialLog, playStimulus, repeatTrial,
    frequencyUp, frequencyDown, levelUp, levelDown,
    switchEar, lockThreshold, nextFrequency, finishTest,
    lockReady, floorWarning,
  } = useScreeningEngine(frequencySet, calibrationGain, staircaseMode);

  const handleResponse = useCallback(() => {
    if (state.responseWindowOpen) {
      setButtonFlash(true);
      setTimeout(() => setButtonFlash(false), 300);
    }
    engineHandleResponse();
  }, [engineHandleResponse, state.responseWindowOpen]);

  const isManualPrompt = promptAudio.mode !== 'off';
  const [currentPromptSlot, setCurrentPromptSlot] = useState<'introduction' | 'left_ear_start' | 'right_ear_transition' | 'right_ear_start' | 'completion'>('left_ear_start');

  useEffect(() => {
    if (open) {
      setIsMinimised(false);
      if (initialPatientId) {
        setPatientId(initialPatientId);
        setPatientName(initialPatientName || null);
        setPatientDob(initialPatientDob || null);
        setPatientEmail(initialPatientEmail || null);
        setIsGeneralMode(false);
        setStep('setup');
      } else {
        setStep('entry');
      }
    }
  }, [open, initialPatientId]);

  const patientAge = patientDob ? Math.floor((Date.now() - new Date(patientDob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase.from('patients')
      .select('id, client_name, client_email, client_phone, date_of_birth')
      .or(`client_name.ilike.%${searchQuery}%,client_email.ilike.%${searchQuery}%,client_phone.ilike.%${searchQuery}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const selectPatient = (p: any) => {
    setPatientId(p.id);
    setPatientName(p.client_name);
    setPatientEmail(p.client_email);
    setPatientDob(p.date_of_birth);
    setIsGeneralMode(false);
    setStep('setup');
  };

  const startGeneralMode = () => {
    setPatientId(null); setPatientName(null); setPatientEmail(null); setPatientDob(null);
    setIsGeneralMode(true); setStep('setup');
  };

  useEffect(() => {
    if (state.phase === 'done') {
      setStep('results');
      setCurrentPromptSlot('completion');
    }
  }, [state.phase]);

  const hasTestData = step !== 'entry' && step !== 'setup';
  
  const handleClose = () => {
    if (hasTestData) { setShowExitConfirm(true); return; }
    cleanup(); promptAudio.stopPlayback();
    setStep('entry'); setIsMinimised(false); setSetupConfirmed(false); setVolumeConfirmed(false);
    setSearchQuery(''); setSearchResults([]); setViewMode('practitioner');
    onOpenChange(false);
  };

  const forceClose = () => {
    setShowExitConfirm(false); cleanup(); promptAudio.stopPlayback();
    setStep('entry'); setIsMinimised(false); setSetupConfirmed(false); setVolumeConfirmed(false);
    setSearchQuery(''); setSearchResults([]); setViewMode('practitioner');
    onOpenChange(false);
  };

  const switchViewMode = useCallback((target: ViewMode) => {
    if (state.toneActive) { setPendingViewSwitch(target); } else { setViewMode(target); }
  }, [state.toneActive]);

  useEffect(() => {
    if (pendingViewSwitch && !state.toneActive) { setViewMode(pendingViewSwitch); setPendingViewSwitch(null); }
  }, [state.toneActive, pendingViewSwitch]);

  const handleStartIntro = async () => { setStep('volume_check'); };

  const handleVolumeConfirmAndContinue = async () => { setStep('intro'); };

  const playTestBeeps = useCallback(() => {
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = 0;
    panNode.connect(ctx.destination);
    const midVolume = 0.15;
    for (let i = 0; i < 4; i++) {
      const startOffset = i * 0.27;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(midVolume, ctx.currentTime + startOffset + 0.01);
      gain.gain.setValueAtTime(midVolume, ctx.currentTime + startOffset + 0.14);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startOffset + 0.15);
      osc.connect(gain); gain.connect(panNode);
      osc.start(ctx.currentTime + startOffset); osc.stop(ctx.currentTime + startOffset + 0.15);
    }
    setTimeout(() => ctx.close().catch(() => {}), 2000);
  }, []);

  const handleBeginTest = async () => {
    setStep('testing');
    setCurrentPromptSlot('left_ear_start');
    startScreening();
  };

  const handleStartRightEar = async () => {
    setCurrentPromptSlot('right_ear_start');
    startRightEar();
  };

  const handleManualPlayPrompt = async () => {
    if (state.toneActive || state.responseWindowOpen) {
      promptAudio.setPromptQueued(true);
      return;
    }
    setPromptPlaying(true);
    await new Promise(r => setTimeout(r, 800));
    await promptAudio.playPrompt(currentPromptSlot);
    await new Promise(r => setTimeout(r, 800));
    setPromptPlaying(false);
  };

  const handlePause = () => { pause(); };
  const handleResume = () => { resume(); };

  const handleMinimise = () => { pause(); setIsMinimised(true); onOpenChange(false); };
  const handleRestoreFromMinimise = () => { setIsMinimised(false); onOpenChange(true); };

  const leftClassification = classifyEar(leftResults);
  const rightClassification = classifyEar(rightResults);
  const recommendation = getRecommendation(leftClassification, rightClassification);

  const clinicalSummary = getClinicalSummary(leftClassification, rightClassification, recommendation, roomNoise, 0, 0);
  const patientFriendlySummary = getPatientFriendlySummary(leftClassification, rightClassification, recommendation, patientAge);
  const ageContextText = getAgeContextText(patientAge);

  const generatePdf = (): Blob => {
    return generateScreeningPdf({
      patientName, patientDob, patientAge, isGeneralMode, serviceContext,
      volumeTarget, frequencySet, frequencies, roomNoise,
      leftResults, rightResults, leftClassification, rightClassification,
      recommendation, clinicalSummary, ageContextText, notes,
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (isGeneralMode) {
      const blob = generatePdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `hearing-screening-general-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
      handleClose();
      return;
    }

    if (!patientId) return;
    setSaving(true);

    try {
      const { data: screening, error: screenErr } = await supabase.from('hearing_screenings').insert({
        patient_id: patientId,
        consultation_id: consultationId || null,
        clinician_id: user.id,
        service_context: serviceContext,
        room_noise_status: roomNoise,
        headphones_model: 'Sennheiser HD 300 Pro',
        volume_protocol: `${volumeTarget}%`,
        volume_confirmed: volumeConfirmed,
        volume_target_percent: volumeTarget,
        dnd_confirmed: true,
        disclaimer_ack: true,
        screening_method: 'shawscope',
        left_classification: leftClassification,
        right_classification: rightClassification,
        overall_recommendation: recommendation,
        clinical_summary: clinicalSummary,
        patient_friendly_summary: patientFriendlySummary,
        age_context_text: ageContextText,
        notes: notes.trim() || null,
        frequency_set: frequencySet,
        left_thresholds: leftResults,
        right_thresholds: rightResults,
      } as any).select().single();

      if (screenErr || !screening) throw screenErr;
      const screeningId = (screening as any).id;

      const allPoints = [
        ...leftResults.map(t => ({
          screening_id: screeningId, ear: 'left' as const,
          frequency_hz: t.frequency_hz, step_level: t.step_level,
          estimated_dbhl: t.estimated_dbhl, stimulus_db_step: DB_HL_STEPS[t.step_level],
          heard: true, attempts: t.presentations, presentations: t.presentations,
          catch_trials: 0, false_positives: 0, raw_log: [],
        })),
        ...rightResults.map(t => ({
          screening_id: screeningId, ear: 'right' as const,
          frequency_hz: t.frequency_hz, step_level: t.step_level,
          estimated_dbhl: t.estimated_dbhl, stimulus_db_step: DB_HL_STEPS[t.step_level],
          heard: true, attempts: t.presentations, presentations: t.presentations,
          catch_trials: 0, false_positives: 0, raw_log: [],
        })),
      ];

      if (allPoints.length > 0) {
        await supabase.from('hearing_screening_points').insert(allPoints as any);
      }

      const pdfBlob = generatePdf();
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      const storagePath = `patient-files/${patientId}/hearing-screenings/${dateStr}_${screeningId}.pdf`;

      const { error: uploadErr } = await supabase.storage.from('shawscope')
        .upload(storagePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (!uploadErr) {
        await supabase.from('hearing_screenings').update({ pdf_storage_path: storagePath } as any).eq('id', screeningId);
        if (patientEmail) {
          await supabase.from('patient_files').insert({
            client_email: patientEmail,
            file_name: `Hearing Screening ${dateStr}.pdf`,
            file_path: storagePath,
            file_type: 'application/pdf',
            description: `Hearing screening – ${getClassificationLabel(leftClassification)}L / ${getClassificationLabel(rightClassification)}R`,
            uploaded_by: user.id,
          });
        }
      }

      toast.success('Hearing screening saved');
      onComplete?.();
      handleClose();
    } catch (err: any) {
      toast.error('Failed to save: ' + (err?.message || 'Unknown error'));
    }
    setSaving(false);
  };

  const isTestPhase = step === 'testing';
  const isPaused = state.phase === 'paused';

  // Minimised banner
  if (isMinimised) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2 min-w-0">
          <Ear className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium truncate">Hearing Screening Paused</span>
        </div>
        <Button size="sm" variant="secondary" onClick={handleRestoreFromMinimise} className="shrink-0">
          Resume
        </Button>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className={`p-0 ${isTestPhase ? 'max-w-full w-full h-[100dvh] max-h-[100dvh] rounded-none border-0 sm:rounded-none' : 'max-w-md max-h-[95vh] overflow-y-auto'}`}>

          {/* ===== ENTRY SCREEN ===== */}
          {step === 'entry' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-2">
                  <Ear className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Hearing Screening</h2>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <Badge variant="outline" className="text-[10px]">Screening Estimate – Not Diagnostic</Badge>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Patient</Label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="Search name, email or phone..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <Button size="icon" onClick={handleSearch} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-1">
                    {searchResults.map(p => (
                      <button key={p.id} onClick={() => selectPatient(p)}
                        className="w-full text-left p-2 rounded hover:bg-muted flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.client_name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{p.client_email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <Button variant="outline" className="w-full" onClick={startGeneralMode}>
                  <Play className="h-4 w-4 mr-2" /> Run General Hearing Test (No Patient Linked)
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1 text-center">
                  Results will not be saved to any patient record
                </p>
              </div>
            </div>
          )}

          {/* ===== SETUP SCREEN ===== */}
          {step === 'setup' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between pr-8">
                <div className="flex items-center gap-2">
                  <Ear className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-base">Sennheiser HD 300 Pro Setup</h2>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                </Button>
              </div>

              {patientName && (
                <p className="text-sm text-muted-foreground">
                  Patient: <span className="font-medium text-foreground">{patientName}</span>
                  {patientAge !== null && <span className="ml-1 text-xs">({patientAge} yrs)</span>}
                </p>
              )}
              {isGeneralMode && <Badge variant="secondary" className="text-xs">General Test Mode</Badge>}

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Checkbox checked={setupConfirmed} onCheckedChange={(v) => setSetupConfirmed(!!v)} className="mt-0.5 h-5 w-5" id="setup-confirm" />
                  <Label htmlFor="setup-confirm" className="text-sm cursor-pointer leading-relaxed">
                    I confirm:
                    <ul className="mt-1.5 space-y-1 text-muted-foreground font-normal">
                      <li>• Sennheiser HD 300 Pro connected via <strong>wired 3.5 mm</strong> (NOT Bluetooth)</li>
                      <li>• Headphones placed correctly: <strong>red cup on right ear, blue/black on left</strong></li>
                      <li>• Ear cups fully covering the ears with a good seal</li>
                      <li>• Device in Do Not Disturb / Silent mode</li>
                      <li>• Quiet environment confirmed (no TV, fan, traffic)</li>
                      <li>• Patient understands this is a screening, not a diagnostic test</li>
                    </ul>
                  </Label>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-3">
                  ⚠ Bluetooth headphones will produce inaccurate results — wired connection is required.
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Volume: {volumeTarget}% • Freq: {frequencySet === 'advanced' ? 'Advanced' : 'Standard'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm">Room Noise:</Label>
                <div className="flex gap-2">
                  {(['pass', 'fail', 'not_checked'] as const).map(v => (
                    <Button key={v} size="sm" variant={roomNoise === v ? 'default' : 'outline'}
                      onClick={() => setRoomNoise(v)} className="text-xs capitalize">
                      {v.replace('_', ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 items-center">
                <Button onClick={handleStartIntro} disabled={!setupConfirmed} className="w-full" size="lg">
                  <ChevronRight className="h-4 w-4 mr-2" /> Volume Check
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-1" /> Close
                </Button>
              </div>
            </div>
          )}

          {/* ===== VOLUME CHECK ===== */}
          {step === 'volume_check' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2 pr-8">
                <Volume2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-base">Volume Check</h2>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm leading-relaxed">
                  Use the <strong>physical volume buttons</strong> to adjust to the target level.
                </p>
                <div className="flex items-center gap-2 bg-background rounded-md p-3 border">
                  <Volume2 className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Target: {volumeTarget}%</p>
                    <p className="text-[10px] text-muted-foreground">
                      {volumeTarget === 50 && 'iPhone default when headphones connect'}
                      {volumeTarget === 75 && 'Raised from default — confirm manually'}
                      {volumeTarget === 100 && 'Maximum output — confirm manually'}
                    </p>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={playTestBeeps}>
                <Play className="h-4 w-4 mr-2" /> Play Test Beeps
              </Button>
              <p className="text-[10px] text-muted-foreground text-center -mt-2">
                Plays 4 beeps at mid-level (1000 Hz) to confirm audio output is working.
              </p>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <Checkbox checked={volumeConfirmed} onCheckedChange={(v) => setVolumeConfirmed(!!v)} className="mt-0.5 h-5 w-5" id="volume-confirm" />
                  <Label htmlFor="volume-confirm" className="text-sm cursor-pointer leading-relaxed">
                    I confirm the device volume is set to <strong>{volumeTarget}%</strong> and test beeps were audible.
                  </Label>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <Button onClick={handleVolumeConfirmAndContinue} disabled={!volumeConfirmed} className="w-full" size="lg">
                  <CheckCircle className="h-4 w-4 mr-2" /> Confirm & Continue
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-1" /> Close
                </Button>
              </div>
            </div>
          )}

          {/* ===== INTRO ===== */}
          {step === 'intro' && (
            <div className="p-4 space-y-6 text-center">
              <Volume2 className={`h-12 w-12 mx-auto ${promptPlaying ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {promptAudio.mode === 'off'
                  ? 'Prompts are off — explain the procedure verbally, then start the test.'
                  : 'Use the button below to play the introduction prompt.'}
              </p>

              {promptAudio.promptCountdown !== null && promptAudio.promptCountdown > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-primary">
                  <Clock className="h-4 w-4" />
                  <span>Prompt playing… 00:{String(promptAudio.promptCountdown).padStart(2, '0')}</span>
                </div>
              )}

              {isManualPrompt && (
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={async () => {
                    setPromptPlaying(true);
                    await promptAudio.playPrompt('introduction');
                    setPromptPlaying(false);
                  }} disabled={promptPlaying}>
                    <Play className="h-3.5 w-3.5 mr-1" /> Play Prompt
                  </Button>
                </div>
              )}

              <div className="flex flex-col gap-2 items-center">
                <Button onClick={handleBeginTest} disabled={promptPlaying} size="lg" className="w-full">
                  {promptPlaying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Speaking...</>
                    : <><ChevronRight className="h-4 w-4 mr-2" /> Start Test</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs text-muted-foreground">
                  <X className="h-3.5 w-3.5 mr-1" /> Close
                </Button>
              </div>
            </div>
          )}

          {/* ===== TEST SCREEN - PATIENT VIEW ===== */}
          {step === 'testing' && viewMode === 'patient' && (
            <div className="flex flex-col items-center justify-center" style={{ height: '100dvh', overflow: 'hidden' }}>
              <p className="text-sm text-muted-foreground mb-6 px-8 text-center">
                Tap when you hear the beeps
              </p>
              <button
                onClick={handleResponse}
                className={`w-[85%] rounded-xl font-bold text-xl select-none touch-none transition-all duration-200 ${
                  buttonFlash ? 'bg-green-500 scale-[1.03]' : 'bg-primary'
                } text-primary-foreground active:scale-[0.97]`}
                style={{ WebkitTapHighlightColor: 'transparent', height: '30vh', minHeight: '120px' }}
              >
                I HEARD IT
              </button>
              {!state.responseWindowOpen && (
                <p className="text-xs text-muted-foreground mt-2">Waiting for next tone…</p>
              )}
            </div>
          )}

          {/* ===== TEST SCREEN - PRACTITIONER VIEW ===== */}
          {step === 'testing' && viewMode === 'practitioner' && (
            <div className="flex flex-col" style={{ height: '100dvh', overflow: 'hidden' }}>

              {/* Paused overlay */}
              {isPaused && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                  <Pause className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-semibold">Screening Paused</p>
                  <p className="text-sm text-muted-foreground text-center">
                    {state.currentEar.toUpperCase()} ear • {frequencies[state.currentFreqIndex]} Hz
                  </p>
                  <Button onClick={handleResume} size="lg" className="w-full max-w-xs">
                    <Play className="h-4 w-4 mr-2" /> Resume Screening
                  </Button>
                </div>
              )}

              {/* Main Layout */}
              {!isPaused && state.phase !== 'ear_complete' && (
                <div className="flex-1 flex flex-col min-h-0">

                  {/* ROW 1: I HEARD IT (left) + Freq/Level/Ear (right) */}
                  <div className="shrink-0 px-2 pt-2 pb-1">
                    <div className="grid grid-cols-2 gap-2" style={{ minHeight: '120px' }}>
                      {/* I HEARD IT — big box top-left */}
                      <button
                        onClick={handleResponse}
                        className={`rounded-xl font-bold text-lg select-none touch-none transition-all duration-200 flex flex-col items-center justify-center ${
                          buttonFlash
                            ? 'bg-green-500 scale-[1.02] text-white'
                            : state.responseWindowOpen
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                        } active:scale-[0.97]`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        <span className="text-3xl mb-1">{buttonFlash ? '✓' : state.responseWindowOpen ? '👂' : state.toneActive ? '🔊' : '⏸'}</span>
                        <span className="text-base font-bold">{buttonFlash ? 'HEARD' : state.responseWindowOpen ? 'I HEARD IT' : state.toneActive ? 'Playing…' : 'Waiting'}</span>
                      </button>

                      {/* Frequency & Level — top-right */}
                      <div className="rounded-xl border bg-card p-2 flex flex-col justify-between gap-1">
                        {/* Ear toggle */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={state.currentEar === 'left' ? 'default' : 'outline'}
                            className={`text-xs h-8 px-3 font-bold flex-1 ${state.currentEar === 'left' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                            onClick={() => switchEar('left')}
                          >
                            LEFT
                          </Button>
                          <Button
                            size="sm"
                            variant={state.currentEar === 'right' ? 'default' : 'outline'}
                            className={`text-xs h-8 px-3 font-bold flex-1 ${state.currentEar === 'right' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                            onClick={() => switchEar('right')}
                          >
                            RIGHT
                          </Button>
                        </div>
                        {/* Frequency */}
                        <div className="flex items-center justify-between">
                          <Button size="icon" variant="outline" className="h-9 w-9" onClick={frequencyDown}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <div className="text-center">
                            <p className="text-lg font-bold leading-none">{frequencies[state.currentFreqIndex]} Hz</p>
                            <p className="text-[9px] text-muted-foreground">Freq</p>
                          </div>
                          <Button size="icon" variant="outline" className="h-9 w-9" onClick={frequencyUp}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </div>
                        {/* Level */}
                        <div className="flex items-center justify-between">
                          <Button size="icon" variant="outline" className="h-9 w-9" onClick={levelDown}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <div className="text-center">
                            <p className="text-lg font-bold leading-none">{DB_HL_STEPS[state.currentStepIndex]} dB</p>
                            <p className="text-[9px] text-muted-foreground">Level</p>
                          </div>
                          <Button size="icon" variant="outline" className="h-9 w-9" onClick={levelUp}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Status indicator */}
                    <div className={`mt-1.5 rounded-lg px-3 py-1.5 text-center text-xs font-semibold transition-colors duration-300 ${
                      state.toneActive
                        ? 'bg-green-500 text-white'
                        : state.responseWindowOpen
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                    }`}>
                      {state.toneActive ? '🔊 PLAYING — tone active' : state.responseWindowOpen ? '👂 Listening for response…' : '🟡 READY — tap Play when ready'}
                    </div>
                  </div>

                  {/* ROW 2: Large Action Tiles */}
                  <div className="shrink-0 px-2 py-1.5">
                    {staircaseMode === 'automatic' ? (
                      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">Automatic Mode</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Hughson-Westlake running. Tap <strong>I HEARD IT</strong> on each tone you hear. Test advances automatically.
                        </p>
                      </div>
                    ) : (
                    <div className="grid grid-cols-4 gap-1.5">
                      <button
                        onClick={() => playStimulus()}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-primary bg-primary/10 p-2 text-primary font-bold text-xs active:scale-95 transition-transform"
                        style={{ minHeight: '64px' }}
                      >
                        <Play className="h-5 w-5" />
                        Play
                      </button>
                      <button
                        onClick={repeatTrial}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-muted-foreground/30 bg-muted/50 p-2 text-foreground font-bold text-xs active:scale-95 transition-transform"
                        style={{ minHeight: '64px' }}
                      >
                        <RotateCcw className="h-5 w-5" />
                        Repeat
                      </button>
                      <button
                        onClick={() => {
                          if (lockReady) {
                            lockThreshold(false);
                          } else {
                            setShowLockConfirm(true);
                          }
                        }}
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 font-bold text-xs active:scale-95 transition-all ${
                          lockReady
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                            : 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                        }`}
                        style={{ minHeight: '64px' }}
                        title={lockReady ? 'Lock threshold (criteria met)' : 'Lock with warning — fewer than recommended confirmations'}
                      >
                        <Lock className="h-5 w-5" />
                        {lockReady ? 'Lock ✓' : 'Lock'}
                      </button>
                      <button
                        onClick={nextFrequency}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-muted-foreground/30 bg-muted/50 p-2 text-foreground font-bold text-xs active:scale-95 transition-transform"
                        style={{ minHeight: '64px' }}
                      >
                        <FastForward className="h-5 w-5" />
                        Next
                      </button>
                    </div>
                    )}

                    {/* Secondary actions row */}
                    <div className="flex gap-1 mt-1.5">
                      {isManualPrompt && (
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] flex-1" onClick={handleManualPlayPrompt} disabled={promptPlaying}>
                          <Play className="h-3 w-3 mr-0.5" /> Prompt
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] flex-1" onClick={finishTest}>
                        <CheckCircle className="h-3 w-3 mr-0.5" /> Finish
                      </Button>
                    </div>

                    {/* Floor warning */}
                    {floorWarning && (
                      <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-md px-2 py-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                        <p className="text-[9px] text-amber-700 dark:text-amber-300">
                          Floor reached — adjust calibration or retest.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Audiogram graph */}
                  <div className="flex-1 min-h-0 px-1 py-0.5 flex items-center overflow-hidden">
                    <Audiogram leftThresholds={leftResults} rightThresholds={rightResults} compact frequencies={frequencies} currentMarker={state.phase === 'testing' ? { ear: state.currentEar, frequency_hz: frequencies[state.currentFreqIndex], estimated_dbhl: DB_HL_STEPS[state.currentStepIndex] } : null} />
                  </div>

                  {/* BOTTOM BAR: Progress + controls (moved from top) */}
                  <div className="shrink-0 px-2 py-1.5 border-t bg-muted/20 flex items-center justify-center gap-3">
                    <span className="text-[10px] text-muted-foreground font-medium">{progress.overallPercent}%</span>
                    <Progress value={progress.overallPercent} className="h-1.5 w-20" />
                    <Badge variant="outline" className="text-[8px] h-4">Trial {state.trialNumber}</Badge>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => switchViewMode('patient')} title="Patient View">
                        <Smartphone className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePause} title="Pause">
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleMinimise} title="Minimise">
                        <Minimize2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={handleClose} title="Close">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Ear complete overlay */}
              {!isPaused && state.phase === 'ear_complete' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                  <ShieldCheck className="h-10 w-10 text-primary" />
                  <p className="font-semibold text-lg">Left Ear Complete</p>
                  <p className="text-sm text-muted-foreground">
                    {leftResults.length} frequencies locked
                  </p>
                  <Button onClick={handleStartRightEar} size="lg" className="w-full max-w-xs">
                    <ChevronRight className="h-4 w-4 mr-2" /> Test Right Ear
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ===== RESULTS SCREEN ===== */}
          {step === 'results' && (
            <div className="p-4 space-y-4 max-h-[95vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <Ear className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-base">Screening Results</h2>
                {isGeneralMode && <Badge variant="secondary" className="text-[10px]">General Test</Badge>}
              </div>

              <Audiogram leftThresholds={leftResults} rightThresholds={rightResults} frequencies={frequencies} />

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Left Ear</p>
                  <p className="font-semibold text-sm">{getClassificationLabel(leftClassification)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Right Ear</p>
                  <p className="font-semibold text-sm">{getClassificationLabel(rightClassification)}</p>
                </div>
              </div>

              <div className={`rounded-lg p-2.5 text-center ${
                recommendation === 'reassure' ? 'bg-green-50 dark:bg-green-950/30' :
                recommendation === 'retest' ? 'bg-yellow-50 dark:bg-yellow-950/30' :
                recommendation === 'refer_audiology' ? 'bg-orange-50 dark:bg-orange-950/30' :
                'bg-red-50 dark:bg-red-950/30'
              }`}>
                <p className="text-[10px] text-muted-foreground mb-0.5">Recommendation</p>
                <p className="font-semibold text-sm">{getRecommendationLabel(recommendation)}</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-2.5">
                <p className="text-[10px] font-medium mb-1">Locked Thresholds</p>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                  {leftResults.map((t, i) => (
                    <span key={`l-${i}`} className="text-blue-600">
                      L {t.frequency_hz}Hz: {t.estimated_dbhl}dB ({t.presentations}p){t.unverified ? ' ⚠️' : ''}
                    </span>
                  ))}
                  {rightResults.map((t, i) => (
                    <span key={`r-${i}`} className="text-red-600">
                      R {t.frequency_hz}Hz: {t.estimated_dbhl}dB ({t.presentations}p){t.unverified ? ' ⚠️' : ''}
                    </span>
                  ))}
                </div>
                {[...leftResults, ...rightResults].some(t => t.unverified) && (
                  <p className="text-[9px] text-amber-600 mt-1">⚠️ = manually overridden (unverified lock)</p>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-2.5">
                <p className="text-[10px] font-medium mb-0.5">Clinical Summary</p>
                <p className="text-[11px] text-muted-foreground">{clinicalSummary}</p>
              </div>

              {ageContextText && (
                <div className="bg-muted/50 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium mb-0.5">Age Context</p>
                  <p className="text-[11px] text-muted-foreground">{ageContextText}</p>
                </div>
              )}

              <div>
                <Label className="text-sm">Additional Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Optional clinician notes..." className="mt-1" rows={2} />
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2.5 border border-amber-200 dark:border-amber-800">
                <p className="text-[9px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <strong>Disclaimer:</strong> This digital hearing screening is designed for preliminary assessment only.
                  It is not a calibrated diagnostic audiogram and does not replace formal audiological testing.
                  Results are screening estimates and should be interpreted alongside clinical findings.
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => {
                  const blob = generatePdf();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `hearing-screening-${(patientName || 'general').replace(/\s/g, '-')}.pdf`;
                  a.click(); URL.revokeObjectURL(url);
                }}>
                  <FileDown className="h-4 w-4 mr-1" /> PDF
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {isGeneralMode ? 'Download & Close' : 'Save & Close'}
                </Button>
                <Button variant="ghost" onClick={handleClose}>
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        promptAudio={promptAudio}
        frequencySet={frequencySet}
        onFrequencySetChange={setFrequencySet}
        volumeTarget={volumeTarget}
        onVolumeTargetChange={setVolumeTarget}
        calibrationGain={calibrationGain}
        onCalibrationGainChange={setCalibrationGain}
        staircaseMode={staircaseMode}
        onStaircaseModeChange={setStaircaseMode}
      />

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close screening?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose all screening data if you close now. Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={forceClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm & Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock confirmation when criteria not met */}
      <AlertDialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fewer than recommended confirmations</AlertDialogTitle>
            <AlertDialogDescription>
              This threshold has not met the recommended minimum of 3 presentations with 2/3 confirmations at this level. 
              Locking now will mark this threshold as unverified. Lock anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { lockThreshold(true); setShowLockConfirm(false); }}
              className="bg-amber-600 text-white hover:bg-amber-700">
              Lock Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default HearingScreeningDialog;

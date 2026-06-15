import { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Upload, Trash2, Play, Volume2, VolumeX, Mic, BarChart3, Settings2, RotateCcw, Minus, Plus } from 'lucide-react';
import { PromptMode, PromptSlot, usePromptAudio } from './usePromptAudio';
import { FrequencySet, StaircaseMode } from './types';
import { CalibrationGain, DEFAULT_CALIBRATION, CALIBRATION_FREQUENCIES, dbStepToGain } from './calibration';

export type VolumeTarget = 50 | 75 | 100;

// Re-export CalibrationGain so existing imports from SettingsPanel still work
export type { CalibrationGain } from './calibration';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptAudio: ReturnType<typeof usePromptAudio>;
  frequencySet: FrequencySet;
  onFrequencySetChange: (v: FrequencySet) => void;
  volumeTarget: VolumeTarget;
  onVolumeTargetChange: (v: VolumeTarget) => void;
  calibrationGain: CalibrationGain;
  onCalibrationGainChange: (g: CalibrationGain) => void;
  staircaseMode: StaircaseMode;
  onStaircaseModeChange: (m: StaircaseMode) => void;
}

const SLOTS: PromptSlot[] = ['introduction', 'left_ear_start', 'right_ear_transition', 'right_ear_start', 'completion'];

const formatFreqLabel = (freq: number) => freq >= 1000 ? `${freq / 1000}k` : String(freq);

const SettingsPanel = ({ open, onOpenChange, promptAudio, frequencySet, onFrequencySetChange, volumeTarget, onVolumeTargetChange, calibrationGain, onCalibrationGainChange, staircaseMode, onStaircaseModeChange }: SettingsPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSlotRef = useRef<PromptSlot | 'test_voice'>('introduction');
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isPromptOff = promptAudio.mode === 'off';

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
    const validExts = ['.mp3', '.wav', '.m4a'];
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast.error('Invalid file type. Please upload MP3, WAV, or M4A.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      await promptAudio.uploadPrompt(uploadSlotRef.current, file);
      toast.success('File uploaded');
    } catch {
      toast.error('Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const playCalibrationTone = useCallback((freqHz: number = 1000) => {
    const gainForFreq = calibrationGain.perFrequencyGains[freqHz] ?? calibrationGain.referenceGain;
    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freqHz;
    gain.gain.value = gainForFreq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
    setTimeout(() => ctx.close().catch(() => {}), 2000);
  }, [calibrationGain]);

  const getGainForFreq = (freq: number): number => {
    if (freq === 1000) return calibrationGain.referenceGain;
    return calibrationGain.perFrequencyGains[freq] ?? calibrationGain.referenceGain;
  };

  const setGainForFreq = (freq: number, value: number) => {
    const clamped = Math.max(0.00001, Math.min(0.0035, value));
    if (freq === 1000) {
      onCalibrationGainChange({
        ...calibrationGain,
        referenceGain: clamped,
        perFrequencyGains: { ...calibrationGain.perFrequencyGains, 1000: clamped },
      });
    } else {
      onCalibrationGainChange({
        ...calibrationGain,
        perFrequencyGains: { ...calibrationGain.perFrequencyGains, [freq]: clamped },
      });
    }
  };

  const stepGain = (freq: number, delta: number) => {
    const current = getGainForFreq(freq);
    setGainForFreq(freq, current + delta * 0.00001); // 0.001% step
  };

  const handleResetCalibration = () => {
    onCalibrationGainChange({ ...DEFAULT_CALIBRATION });
    setShowResetConfirm(false);
    toast.success('Calibration reset to Sennheiser HD 300 Pro defaults');
  };

  const handleGainInput = (freq: number, rawValue: string) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;
    // User enters in %, e.g. 0.050 = 0.050% = 0.0005 gain
    const gain = num / 100;
    setGainForFreq(freq, gain);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto p-5">
          <DialogHeader className="pb-3 pr-8">
            <DialogTitle className="text-base">Screening Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Frequency Set */}
            <div>
              <Label className="text-sm font-medium">Frequency Set</Label>
              <RadioGroup
                value={frequencySet}
                onValueChange={(v) => onFrequencySetChange(v as FrequencySet)}
                className="mt-3 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="advanced" id="fs-advanced" />
                  <Label htmlFor="fs-advanced" className="text-sm flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Advanced (10 frequencies)
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="standard" id="fs-standard" />
                  <Label htmlFor="fs-standard" className="text-sm flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> Standard (4 frequencies)
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {frequencySet === 'advanced'
                  ? '250, 500, 750, 1k, 1.5k, 2k, 3k, 4k, 6k, 8k Hz'
                  : '500, 1k, 2k, 4k Hz'}
              </p>
            </div>

            {/* Test Procedure */}
            <div>
              <Label className="text-sm font-medium">Test Procedure</Label>
              <RadioGroup
                value={staircaseMode}
                onValueChange={(v) => onStaircaseModeChange(v as StaircaseMode)}
                className="mt-3 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="automatic" id="sm-auto" />
                  <Label htmlFor="sm-auto" className="text-sm">Automatic (Hughson-Westlake)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="manual_assisted" id="sm-manual" />
                  <Label htmlFor="sm-manual" className="text-sm">Manual-assisted (clinician-paced)</Label>
                </div>
              </RadioGroup>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {staircaseMode === 'automatic'
                  ? '10 dB down on heard, 5 dB up on missed, locks on 2-of-3 ascending responses. Catch trials measure false-positive rate.'
                  : 'Clinician drives presentations and locks thresholds manually.'}
              </p>
            </div>

            {/* Test Volume Target */}
            <div>
              <Label className="text-sm font-medium">Test Volume Target</Label>
              <RadioGroup
                value={String(volumeTarget)}
                onValueChange={(v) => onVolumeTargetChange(Number(v) as VolumeTarget)}
                className="mt-3 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="50" id="vt-50" />
                  <Label htmlFor="vt-50" className="text-sm">50% (Default — iPhone auto-sets)</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="75" id="vt-75" />
                  <Label htmlFor="vt-75" className="text-sm">75%</Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="100" id="vt-100" />
                  <Label htmlFor="vt-100" className="text-sm">100%</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Calibration Mode */}
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" /> Calibration
                </Label>
                <Button size="sm" variant={calibrationMode ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setCalibrationMode(!calibrationMode)}>
                  {calibrationMode ? 'Close' : 'Open'}
                </Button>
              </div>
              {calibrationMode && (
                <div className="space-y-4">
                  <p className="text-[10px] text-muted-foreground">
                    Play reference tones and adjust gain until each represents your perceived 0 dB HL screening level.
                    Gain range: 0.001% – 0.350%. Intermediate frequencies are interpolated automatically.
                  </p>

                  {/* Reset button */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() => setShowResetConfirm(true)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1.5" />
                    Reset (Sennheiser HD 300 Pro – wired – iPad 50%)
                  </Button>

                  {/* 5-point calibration rows */}
                  <div className="space-y-4">
                    {CALIBRATION_FREQUENCIES.map(freq => {
                      const currentGain = getGainForFreq(freq);
                      const displayPercent = (currentGain * 100).toFixed(3);
                      const isPrimary = freq === 1000;
                      return (
                        <div key={freq} className={`space-y-2 ${isPrimary ? 'bg-primary/5 rounded-lg p-2.5 border border-primary/20' : 'p-1'}`}>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-10 w-20 text-xs font-semibold shrink-0"
                              onClick={() => playCalibrationTone(freq)}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              {formatFreqLabel(freq)} Hz
                            </Button>
                            <div className="flex items-center gap-1 flex-1 justify-end">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 shrink-0"
                                onClick={() => stepGain(freq, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={displayPercent}
                                onChange={(e) => handleGainInput(freq, e.target.value)}
                                className="h-10 w-20 text-center text-sm font-mono px-1"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 shrink-0"
                                onClick={() => stepGain(freq, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <span className="text-[10px] text-muted-foreground w-4">%</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 px-1">
                            <VolumeX className="h-3 w-3 text-muted-foreground shrink-0" />
                            <Slider
                              value={[currentGain * 100000]}
                              onValueChange={([v]) => setGainForFreq(freq, v / 100000)}
                              min={1}
                              max={350}
                              step={1}
                              className="flex-1"
                            />
                            <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          </div>
                          {isPrimary && (
                            <p className="text-[9px] text-primary font-medium text-center">Primary Reference</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[9px] text-muted-foreground">
                    Interpolated frequencies: 750 Hz (500↔1k), 1.5 kHz (1k↔2k), 3 kHz (2k↔4k), 6 kHz (4k↔8k)
                  </p>

                  <p className="text-[9px] text-amber-600 dark:text-amber-400">
                    ⚠ Without calibrated equipment, all results remain "Screening Estimate — not calibrated dB HL".
                  </p>
                </div>
              )}
            </div>

            {/* Prompt Mode */}
            <div>
              <Label className="text-sm font-medium">Prompt Mode</Label>
              <RadioGroup
                value={promptAudio.mode}
                onValueChange={(v) => promptAudio.setMode(v as PromptMode)}
                className="mt-3 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="recorded" id="pm-recorded" />
                  <Label htmlFor="pm-recorded" className="text-sm flex items-center gap-1.5">
                    <Mic className="h-3.5 w-3.5" /> Recorded Audio
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="tts" id="pm-tts" />
                  <Label htmlFor="pm-tts" className="text-sm flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5" /> Text-to-Speech
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="off" id="pm-off" />
                  <Label htmlFor="pm-off" className="text-sm flex items-center gap-1.5">
                    <VolumeX className="h-3.5 w-3.5" /> Off
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Prompt Volume */}
            <div className={isPromptOff ? 'opacity-50 pointer-events-none' : ''}>
              <Label className="text-sm font-medium">Prompt Volume</Label>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Slider
                    value={[promptAudio.promptVolumePercent]}
                    onValueChange={([v]) => promptAudio.setPromptVolumePercent(v)}
                    min={0} max={100} step={5}
                    disabled={isPromptOff} className="flex-1"
                  />
                  <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-mono w-10 text-right">{promptAudio.promptVolumePercent}%</span>
                </div>
              </div>
            </div>

            {/* Test Voice */}
            <div className={isPromptOff ? 'opacity-50 pointer-events-none' : ''}>
              <Label className="text-sm font-medium">Test Voice</Label>
              <div className="mt-2 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => promptAudio.playTestVoice()} disabled={isPromptOff}>
                  <Play className="h-3.5 w-3.5 mr-1" /> Play Test Voice
                </Button>
                <Button size="icon" variant="outline" className="h-8 w-8"
                  onClick={() => { uploadSlotRef.current = 'test_voice'; fileInputRef.current?.click(); }} disabled={isPromptOff}>
                  <Upload className="h-3.5 w-3.5" />
                </Button>
                {promptAudio.testVoiceFile && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                    onClick={() => promptAudio.removePrompt('test_voice')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Recorded Prompts */}
            <div>
              <Label className="text-sm font-medium">Recorded Prompts</Label>
              <div className="mt-3 space-y-2">
                {SLOTS.map(slot => (
                  <div key={slot} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{promptAudio.PROMPT_LABELS[slot]}</p>
                      {promptAudio.uploadedFiles[slot] ? (
                        <p className="text-[10px] text-muted-foreground truncate">{promptAudio.uploadedFiles[slot]}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">Not uploaded</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      {promptAudio.uploadedFiles[slot] && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => promptAudio.testPlayback(slot)}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => promptAudio.removePrompt(slot)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="outline" className="h-8 w-8"
                        onClick={() => { uploadSlotRef.current = slot; fileInputRef.current?.click(); }}>
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" className="hidden" onChange={handleFileSelect} />
        </DialogContent>
      </Dialog>

      {/* Reset confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Calibration?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all 5 calibration points to the default Sennheiser HD 300 Pro profile (wired connection, iPad 50% volume).
              Your current calibration values will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetCalibration}>
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SettingsPanel;

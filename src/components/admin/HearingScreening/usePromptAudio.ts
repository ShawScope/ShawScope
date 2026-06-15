import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSpeech } from './useSpeech';

export type PromptMode = 'recorded' | 'tts' | 'off';
// Removed automatic mode - prompts are always manual now
export type PromptPlaybackMode = 'manual';

export type PromptSlot = 'introduction' | 'left_ear_start' | 'right_ear_transition' | 'right_ear_start' | 'completion';

const PROMPT_LABELS: Record<PromptSlot, string> = {
  introduction: 'Introduction',
  left_ear_start: 'Left Ear Start',
  right_ear_transition: 'Right Ear Transition',
  right_ear_start: 'Right Ear Start',
  completion: 'Completion',
};

const TTS_SCRIPTS: Record<PromptSlot, string> = {
  introduction: "We are about to begin a ShawScope hearing screen. You will hear short groups of soft beeps, one ear at a time. Each time you clearly hear the beeps, press the button. If you are unsure, do not press. The sound will repeat. Some beeps may be very quiet. This is normal. We will begin with your left ear.",
  left_ear_start: "We are now testing your left ear. Press the button only when you are confident you hear a sound. If you are unsure, the sound will repeat.",
  right_ear_transition: "That completes the left ear screening. We will now repeat the same process for your right ear. Please keep the headphones on and remain relaxed.",
  right_ear_start: "We are now testing your right ear.",
  completion: "The hearing screening is now complete. You may remove the headphones. Your results are ready to review.",
};

const STORAGE_PATH = 'app-assets/hearing-prompts';

export function usePromptAudio() {
  const [mode, setMode] = useState<PromptMode>('tts');
  const [promptVolumePercent, setPromptVolumePercent] = useState(30);
  const [uploadedFiles, setUploadedFiles] = useState<Record<PromptSlot, string | null>>({
    introduction: null, left_ear_start: null, right_ear_transition: null,
    right_ear_start: null, completion: null,
  });
  const [loading, setLoading] = useState(false);
  const [promptQueued, setPromptQueued] = useState(false);
  const [lastPlayedSlot, setLastPlayedSlot] = useState<PromptSlot | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [promptCountdown, setPromptCountdown] = useState<number | null>(null); // seconds remaining
  const [promptStatus, setPromptStatus] = useState<'idle' | 'playing' | 'queued'>('idle');
  
  const { speak, cancel: cancelSpeech } = useSpeech();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const [testVoiceFile, setTestVoiceFile] = useState<string | null>(null);

  const getPromptGain = useCallback(() => {
    return Math.min(promptVolumePercent / 100, 0.8);
  }, [promptVolumePercent]);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const getGainNode = useCallback(() => {
    const ctx = getAudioContext();
    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }
    gainNodeRef.current.gain.value = getPromptGain();
    return gainNodeRef.current;
  }, [getAudioContext, getPromptGain]);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setPromptCountdown(null);
    setPromptStatus('idle');
  }, []);

  const startCountdown = useCallback((durationSec: number) => {
    clearCountdown();
    setPromptCountdown(Math.ceil(durationSec));
    setPromptStatus('playing');
    const startTime = Date.now();
    countdownIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(durationSec - elapsed));
      setPromptCountdown(remaining);
      if (remaining <= 0) {
        clearCountdown();
      }
    }, 250);
  }, [clearCountdown]);

  // Check which recorded files exist
  const refreshFiles = useCallback(async () => {
    setLoading(true);
    const slots: PromptSlot[] = ['introduction', 'left_ear_start', 'right_ear_transition', 'right_ear_start', 'completion'];
    const result: Record<PromptSlot, string | null> = {
      introduction: null, left_ear_start: null, right_ear_transition: null,
      right_ear_start: null, completion: null,
    };

    for (const slot of slots) {
      const { data } = await supabase.storage.from('shawscope').list(STORAGE_PATH, { search: slot });
      if (data && data.length > 0) {
        const file = data.find(f => f.name.startsWith(slot));
        if (file) result[slot] = file.name;
      }
    }

    const { data: tvData } = await supabase.storage.from('shawscope').list(STORAGE_PATH, { search: 'test_voice' });
    if (tvData && tvData.length > 0) {
      const tvFile = tvData.find(f => f.name.startsWith('test_voice'));
      setTestVoiceFile(tvFile ? tvFile.name : null);
    }

    setUploadedFiles(result);
    const hasAny = Object.values(result).some(v => v !== null);
    if (hasAny) setMode('recorded');
    setLoading(false);
  }, []);

  useEffect(() => { refreshFiles(); }, [refreshFiles]);

  const uploadPrompt = useCallback(async (slot: PromptSlot | 'test_voice', file: File) => {
    const ext = file.name.split('.').pop() || 'mp3';
    const path = `${STORAGE_PATH}/${slot}.${ext}`;

    if (slot !== 'test_voice') {
      const existingFile = uploadedFiles[slot as PromptSlot];
      if (existingFile) {
        await supabase.storage.from('shawscope').remove([`${STORAGE_PATH}/${existingFile}`]);
      }
    } else {
      if (testVoiceFile) {
        await supabase.storage.from('shawscope').remove([`${STORAGE_PATH}/${testVoiceFile}`]);
      }
    }

    const { error } = await supabase.storage.from('shawscope').upload(path, file, {
      contentType: file.type, upsert: true,
    });
    if (error) throw error;
    await refreshFiles();
  }, [uploadedFiles, testVoiceFile, refreshFiles]);

  const removePrompt = useCallback(async (slot: PromptSlot | 'test_voice') => {
    if (slot === 'test_voice') {
      if (!testVoiceFile) return;
      await supabase.storage.from('shawscope').remove([`${STORAGE_PATH}/${testVoiceFile}`]);
    } else {
      if (!uploadedFiles[slot]) return;
      await supabase.storage.from('shawscope').remove([`${STORAGE_PATH}/${uploadedFiles[slot]}`]);
    }
    await refreshFiles();
  }, [uploadedFiles, testVoiceFile, refreshFiles]);

  // Play recorded audio through Web Audio gain chain with countdown
  const playRecordedAudio = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (sourceNodeRef.current) {
        try { sourceNodeRef.current.disconnect(); } catch {}
        sourceNodeRef.current = null;
      }

      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
      setIsPlaying(true);

      const ctx = getAudioContext();
      const gainNode = getGainNode();

      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          startCountdown(audio.duration);
        }
      };

      audio.oncanplaythrough = () => {
        try {
          const source = ctx.createMediaElementSource(audio);
          sourceNodeRef.current = source;
          source.connect(gainNode);
          audio.play().catch(() => { setIsPlaying(false); clearCountdown(); resolve(); });
        } catch {
          audio.volume = getPromptGain();
          audio.play().catch(() => { setIsPlaying(false); clearCountdown(); resolve(); });
        }
      };
      audio.onended = () => { setIsPlaying(false); clearCountdown(); resolve(); };
      audio.onerror = () => { setIsPlaying(false); clearCountdown(); resolve(); };
      audio.load();
    });
  }, [getAudioContext, getGainNode, getPromptGain, startCountdown, clearCountdown]);

  const playPrompt = useCallback(async (slot: PromptSlot): Promise<void> => {
    if (mode === 'off') return;
    setLastPlayedSlot(slot);
    setIsPlaying(true);

    if (mode === 'recorded' && uploadedFiles[slot]) {
      const { data } = supabase.storage.from('shawscope').getPublicUrl(`${STORAGE_PATH}/${uploadedFiles[slot]}`);
      await playRecordedAudio(data.publicUrl);
    } else if (mode === 'tts') {
      // Estimate TTS duration (~150ms per word)
      const words = TTS_SCRIPTS[slot].split(/\s+/).length;
      const estDuration = words * 0.15 + 1;
      startCountdown(estDuration);
      await speak(TTS_SCRIPTS[slot]);
      clearCountdown();
    }
    setIsPlaying(false);
  }, [mode, uploadedFiles, speak, playRecordedAudio, startCountdown, clearCountdown]);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.disconnect(); } catch {}
      sourceNodeRef.current = null;
    }
    cancelSpeech();
    setPromptQueued(false);
    setIsPlaying(false);
    clearCountdown();
  }, [cancelSpeech, clearCountdown]);

  const testPlayback = useCallback(async (slot: PromptSlot) => {
    if (!uploadedFiles[slot]) return;
    const { data } = supabase.storage.from('shawscope').getPublicUrl(`${STORAGE_PATH}/${uploadedFiles[slot]}`);
    return playRecordedAudio(data.publicUrl);
  }, [uploadedFiles, playRecordedAudio]);

  const playTestVoice = useCallback(async () => {
    if (testVoiceFile) {
      const { data } = supabase.storage.from('shawscope').getPublicUrl(`${STORAGE_PATH}/${testVoiceFile}`);
      return playRecordedAudio(data.publicUrl);
    }
    return speak("This is a ShawScope prompt volume test.");
  }, [testVoiceFile, playRecordedAudio, speak]);

  return {
    mode,
    setMode,
    promptVolumePercent,
    setPromptVolumePercent,
    uploadedFiles,
    uploadPrompt,
    removePrompt,
    playPrompt,
    stopPlayback,
    testPlayback,
    playTestVoice,
    testVoiceFile,
    refreshFiles,
    loading,
    promptQueued,
    setPromptQueued,
    lastPlayedSlot,
    PROMPT_LABELS,
    getPromptGain,
    isPlaying,
    promptCountdown,
    promptStatus,
  };
}

export { PROMPT_LABELS, TTS_SCRIPTS };

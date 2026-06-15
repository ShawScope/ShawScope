import { useCallback, useRef } from 'react';

export function useSpeech() {
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      if (!synthRef.current) {
        synthRef.current = window.speechSynthesis;
      }

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to find a British English voice
      const voices = synthRef.current.getVoices();
      const britishVoice = voices.find(v =>
        v.lang === 'en-GB' || v.lang.startsWith('en-GB')
      ) || voices.find(v =>
        v.lang.startsWith('en')
      );

      if (britishVoice) {
        utterance.voice = britishVoice;
      }
      utterance.lang = 'en-GB';

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      synthRef.current.speak(utterance);
    });
  }, []);

  const cancel = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  }, []);

  return { speak, cancel };
}

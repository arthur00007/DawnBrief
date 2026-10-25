import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseBriefingAudioOptions {
  textToSpeak: string;
  voiceName?: string;
  onEnded?: () => void;
}

export function useBriefingAudio({
  textToSpeak,
  voiceName = 'Kore',
  onEnded,
}: UseBriefingAudioOptions) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [engine, setEngine] = useState<'gemini' | 'speechSynthesis' | 'none'>('none');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const synthUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Initialize or clean up audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (audio.duration && audio.duration > 0) {
        setCurrentTime(audio.currentTime);
        setAudioDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(100);
      onEnded?.();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [onEnded]);

  // If textToSpeak changes, reset cached audio so next play speaks fresh content
  useEffect(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, [textToSpeak, voiceName]);

  const playBrowserSpeech = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    // Pick an articulate English voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') ||
          v.name.includes('Samantha') ||
          v.name.includes('Google') ||
          v.name.includes('Daniel') ||
          v.name.includes('Karen') ||
          v.name.includes('Oliver'))
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    // Estimate duration for progress bar: ~150 words per minute
    const words = textToSpeak.split(/\s+/).length;
    const estSeconds = Math.max(8, (words / (150 * playbackRate)) * 60);
    setAudioDuration(estSeconds);
    const startTime = Date.now();

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setCurrentTime(elapsed);
      const pct = Math.min(99, (elapsed / estSeconds) * 100);
      setProgress(pct);
    }, 250);

    utterance.onend = () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setIsPlaying(false);
      setProgress(100);
      onEnded?.();
    };

    utterance.onerror = (e) => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setIsPlaying(false);
      console.warn('SpeechSynthesis error:', e);
    };

    synthUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setEngine('speechSynthesis');
    setIsPlaying(true);
  }, [textToSpeak, playbackRate, onEnded]);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      // Pause
      if (engine === 'gemini' && audioRef.current) {
        audioRef.current.pause();
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.pause();
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      }
      setIsPlaying(false);
      return;
    }

    // Resume if already paused in gemini audio
    if (engine === 'gemini' && audioRef.current && audioUrlRef.current && audioRef.current.src) {
      audioRef.current.playbackRate = playbackRate;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
        return;
      } catch (err) {
        console.warn('Could not resume cached audio:', err);
      }
    }

    // Resume speech synthesis if paused
    if (engine === 'speechSynthesis' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      return;
    }

    // Generate or fetch audio from Gemini TTS endpoint
    setIsLoading(true);
    try {
      const res = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice: voiceName }),
      });

      if (!res.ok) {
        throw new Error(`TTS server responded with ${res.status}`);
      }

      const data = await res.json();
      if (data.audioBase64 && audioRef.current) {
        const byteCharacters = atob(data.audioBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: data.mimeType || 'audio/wav' });
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        audioRef.current.src = url;
        audioRef.current.playbackRate = playbackRate;
        await audioRef.current.play();
        setEngine('gemini');
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      throw new Error('No audio bytes returned');
    } catch (err) {
      console.warn('Gemini TTS failed or unavailable, fallback to Web Speech API:', err);
      setIsLoading(false);
      playBrowserSpeech();
    }
  }, [isPlaying, engine, textToSpeak, voiceName, playbackRate, playBrowserSpeech]);

  const restart = useCallback(() => {
    if (engine === 'gemini' && audioRef.current && audioUrlRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      playBrowserSpeech();
    }
  }, [engine, playBrowserSpeech]);

  const changeRate = useCallback(
    (rate: number) => {
      setPlaybackRate(rate);
      if (audioRef.current) {
        audioRef.current.playbackRate = rate;
      }
      if (isPlaying && engine === 'speechSynthesis') {
        window.speechSynthesis.cancel();
        setTimeout(playBrowserSpeech, 50);
      }
    },
    [isPlaying, engine, playBrowserSpeech]
  );

  return {
    isPlaying,
    isLoading,
    engine,
    playbackRate,
    progress,
    currentTime,
    audioDuration,
    togglePlay,
    restart,
    changeRate,
  };
}

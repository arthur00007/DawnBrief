import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, Sparkles, Check, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useBriefingAudio } from '../hooks/useBriefingAudio';

interface AudioPlayerProps {
  textToSpeak: string;
  voice?: string;
  // Optional shared audio controls if controlled from parent
  sharedAudio?: ReturnType<typeof useBriefingAudio>;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  textToSpeak,
  voice = 'Kore',
  sharedAudio,
}) => {
  // Use either shared instance from parent or local instance
  const localAudio = useBriefingAudio({ textToSpeak, voiceName: voice });
  const audio = sharedAudio || localAudio;

  const [copied, setCopied] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(textToSpeak);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextRates = [1, 1.25, 1.5];
  const handleRateCycle = () => {
    const idx = nextRates.indexOf(audio.playbackRate);
    const next = nextRates[(idx + 1) % nextRates.length];
    audio.changeRate(next);
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-3">
      {/* Top row: Play/Pause button, title, and quick playback status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={audio.togglePlay}
            disabled={audio.isLoading}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-md ${
              audio.isPlaying
                ? 'bg-amber-400 text-neutral-950 ring-2 ring-amber-400/30'
                : 'bg-amber-400 hover:bg-amber-300 text-neutral-950'
            }`}
            aria-label={audio.isPlaying ? 'Pause spoken briefing' : 'Play spoken briefing'}
          >
            {audio.isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : audio.isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Morning Audio Dispatch</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-800/80 border border-neutral-700/60">
                {audio.engine === 'gemini'
                  ? 'Gemini 3.8 Flash Voice'
                  : audio.engine === 'speechSynthesis'
                  ? 'SpeechSynthesis Voice'
                  : 'Ready'}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 mt-0.5">
              {audio.isLoading
                ? 'Generating audio with Gemini voice engine...'
                : audio.isPlaying
                ? 'Playing overnight brief aloud'
                : 'Listen to the full overnight synthesis'}
            </p>
          </div>
        </div>

        {/* Animated Sound Waveform Bars */}
        <div className="flex items-center gap-1 h-7 px-3 py-1.5 bg-neutral-950/70 rounded-lg border border-neutral-800/80">
          {[35, 70, 95, 60, 85, 30, 100, 50, 75, 90, 45, 80, 60, 40].map((height, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-200 ${
                audio.isPlaying ? 'bg-amber-400' : 'bg-neutral-700'
              }`}
              style={{
                height: audio.isPlaying
                  ? `${Math.max(20, (height * (Math.sin(Date.now() / 150 + i) + 1.2)) / 2)}%`
                  : '25%',
              }}
            />
          ))}
        </div>

        {/* Action controls: Speed, Replay, Script */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleRateCycle}
            className="px-2.5 py-1 text-xs font-mono font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded-md transition-colors"
            title="Adjust reading speed"
          >
            {audio.playbackRate}x
          </button>

          <button
            onClick={audio.restart}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
            title="Replay from start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowScript(!showScript)}
            className="px-2.5 py-1 text-[11px] font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded-md transition-colors flex items-center gap-1"
          >
            <FileText className="w-3 h-3 text-neutral-400" />
            <span>{showScript ? 'Hide Script' : 'Script'}</span>
            {showScript ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Progress Bar & Timestamps */}
      <div className="space-y-1">
        <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden border border-neutral-800">
          <div
            className="bg-amber-400 h-full transition-all duration-200"
            style={{ width: `${Math.min(100, audio.progress)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 tabular-nums">
          <span>{formatTime(audio.currentTime)}</span>
          <span>{audio.audioDuration > 0 ? formatTime(audio.audioDuration) : '~0:45'}</span>
        </div>
      </div>

      {/* Expandable Script Box */}
      {showScript && (
        <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg text-xs animate-in fade-in">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
            <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[10px]">
              Spoken Audio Script
            </span>
            <button
              onClick={handleCopyScript}
              className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : null}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-neutral-200 leading-relaxed italic">
            "{textToSpeak}"
          </p>
        </div>
      )}
    </div>
  );
};

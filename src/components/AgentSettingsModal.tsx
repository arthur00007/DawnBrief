import React, { useState } from 'react';
import { AgentSettings, GroupChat, ChatMessage } from '../types';
import { SlidersHorizontal, Moon, Sun, Volume2, Shield, X, Check, RefreshCw, Clock, Sparkles } from 'lucide-react';
import { isCurrentTimeInSleepWindow } from '../utils/time';
import { getOptimalSleepWindowSuggestion } from '../utils/sleepOptimization';
import { TagInput } from './TagInput';

interface AgentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AgentSettings;
  onSave: (updated: AgentSettings) => void;
  groups: GroupChat[];
  onToggleGroupMonitored: (groupId: string) => void;
  onTriggerRefreshNow?: () => void;
  messages?: ChatMessage[];
}

export const AgentSettingsModal: React.FC<AgentSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  groups,
  onToggleGroupMonitored,
  onTriggerRefreshNow,
  messages,
}) => {
  const [localSettings, setLocalSettings] = useState<AgentSettings>(settings);

  const isCurrentWindowActive = isCurrentTimeInSleepWindow(
    localSettings.sleepStart,
    localSettings.sleepEnd
  );

  const matchedMessagesCount = messages
    ? messages.filter((m) =>
        localSettings.priorityKeywords.some((kw) =>
          m.text.toLowerCase().includes(kw.toLowerCase())
        )
      ).length
    : undefined;

  if (!isOpen) return null;

  const handleToneSelect = (tone: AgentSettings['tone']) => {
    setLocalSettings((prev) => ({ ...prev, tone }));
  };

  const handleVoiceSelect = (voice: AgentSettings['voice']) => {
    setLocalSettings((prev) => ({ ...prev, voice }));
  };



  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl max-h-[90vh] bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white">Agent Daemon Settings</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* User Name & Handle */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Your Name & Handles
            </label>
            <p className="text-[11px] text-neutral-500 mb-2">
              The agent will flag group messages tagging you or asking for your decision.
            </p>
            <input
              type="text"
              value={localSettings.userName}
              onChange={(e) => setLocalSettings({ ...localSettings, userName: e.target.value })}
              className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
              placeholder="e.g. Alex, @alex, Alex Chen"
            />
          </div>

          {/* Sleep Window Hours */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sleep Start (Bedtime)</span>
              </label>
              <input
                type="text"
                value={localSettings.sleepStart}
                onChange={(e) => setLocalSettings({ ...localSettings, sleepStart: e.target.value })}
                className="w-full text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
                placeholder="23:00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Sleep End (Morning Brief)</span>
              </label>
              <input
                type="text"
                value={localSettings.sleepEnd}
                onChange={(e) => setLocalSettings({ ...localSettings, sleepEnd: e.target.value })}
                className="w-full text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
                placeholder="07:00"
              />
            </div>

            {/* Quick Auto-Adjust button based on lowest volume hours */}
            <div className="col-span-2 pt-1">
              {(() => {
                const autoSuggestion = getOptimalSleepWindowSuggestion(
                  localSettings.sleepStart,
                  localSettings.sleepEnd,
                  7
                );
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setLocalSettings((prev) => ({
                        ...prev,
                        sleepStart: autoSuggestion.suggestedStart,
                        sleepEnd: autoSuggestion.suggestedEnd,
                      }));
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-xs text-amber-300 flex items-center justify-between transition-colors shadow-sm"
                    title="Auto-fill sleepStart and sleepEnd with the quietest 7-hour block from the Weekly Heatmap"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-semibold text-neutral-200">
                        Auto-Adjust to Quietest Hours:
                      </span>
                      <span className="font-mono font-bold text-amber-300">
                        {autoSuggestion.suggestedStart} – {autoSuggestion.suggestedEnd}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        (-{autoSuggestion.noiseReductionPercent}% noise)
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-400 font-semibold underline underline-offset-2 shrink-0">
                      Apply
                    </span>
                  </button>
                );
              })()}
            </div>
          </div>

          {/* Refresh Interval Toggle (Auto-Refresh every 30m during sleep window) */}
          <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      localSettings.refreshIntervalEnabled
                        ? 'text-amber-400'
                        : 'text-neutral-500'
                    }`}
                  />
                  <span className="text-xs font-semibold text-neutral-200">
                    Refresh Interval
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      localSettings.refreshIntervalEnabled
                        ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {localSettings.refreshIntervalEnabled ? '30m Interval' : 'Off'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Automatically re-run the overnight analysis every 30 minutes to capture real-time changes if you are awake during your scheduled sleep window.
                </p>
              </div>

              {/* Toggle switch button */}
              <button
                type="button"
                role="switch"
                aria-checked={localSettings.refreshIntervalEnabled}
                aria-label="Toggle 30-minute refresh interval"
                onClick={() =>
                  setLocalSettings((prev) => ({
                    ...prev,
                    refreshIntervalEnabled: !prev.refreshIntervalEnabled,
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${
                  localSettings.refreshIntervalEnabled ? 'bg-amber-400' : 'bg-neutral-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-neutral-950 shadow ring-0 transition duration-200 ease-in-out ${
                    localSettings.refreshIntervalEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Live Sleep Window Status Strip */}
            {localSettings.refreshIntervalEnabled && (
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-neutral-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCurrentWindowActive
                        ? 'bg-emerald-400 animate-ping'
                        : 'bg-neutral-500'
                    }`}
                  />
                  <span>
                    {isCurrentWindowActive ? (
                      <>
                        <strong className="text-emerald-400 font-semibold">Active now:</strong> Currently inside sleep window ({localSettings.sleepStart} – {localSettings.sleepEnd})
                      </>
                    ) : (
                      <>
                        <strong className="text-neutral-400 font-medium">Armed:</strong> Re-runs every 30m during sleep window ({localSettings.sleepStart} – {localSettings.sleepEnd})
                      </>
                    )}
                  </span>
                </div>
                {onTriggerRefreshNow && (
                  <button
                    type="button"
                    onClick={() => {
                      onTriggerRefreshNow();
                      onClose();
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 shrink-0 ml-2"
                  >
                    Run 30m Pass Now
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Personality Tone */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Briefing Tone & Persona
            </label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { id: 'crisp', label: 'Crisp & Direct', desc: 'Maximum signal, zero small talk' },
                { id: 'witty', label: 'Witty & Protective', desc: 'Slightly dry, defends your coffee peace' },
                { id: 'executive', label: 'Executive Minimalist', desc: 'Risk mitigation & deadline focused' },
                { id: 'protective', label: 'Guardian Angel', desc: 'Calm, de-escalating & gentle' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToneSelect(t.id as AgentSettings['tone'])}
                  className={`p-3 text-left rounded-xl border text-xs transition-all ${
                    localSettings.tone === t.id
                      ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-semibold text-neutral-100">{t.label}</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Spoken Voice */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Morning Radio Voice (Gemini TTS)</span>
            </label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { id: 'Kore', label: 'Kore', desc: 'Warm anchor' },
                { id: 'Puck', label: 'Puck', desc: 'Energetic' },
                { id: 'Fenrir', label: 'Fenrir', desc: 'Deep calm' },
                { id: 'Zephyr', label: 'Zephyr', desc: 'Articulate' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVoiceSelect(v.id as AgentSettings['voice'])}
                  className={`p-2.5 text-center rounded-xl border text-xs transition-all ${
                    localSettings.voice === v.id
                      ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-semibold'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <div>{v.label}</div>
                  <div className="text-[10px] text-neutral-500">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Monitored Channels */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Active Monitored Channels
            </label>
            <div className="space-y-1.5 mt-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="p-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-200">{group.name}</span>
                    <span className="text-[11px] text-neutral-500 uppercase">({group.platform})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleGroupMonitored(group.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      group.isMonitored
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {group.isMonitored ? 'Monitored' : 'Muted'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Watchwords Tag Input */}
          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <TagInput
              tags={localSettings.priorityKeywords}
              onChange={(newTags) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  priorityKeywords: newTags,
                }))
              }
              matchedMessagesCount={matchedMessagesCount}
              label="Priority Keywords & Watchwords"
              helperText="Messages containing these words automatically escalate into priority action items and Line 2 morning directives."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-2 bg-neutral-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

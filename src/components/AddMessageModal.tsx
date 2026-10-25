import React, { useState } from 'react';
import { GroupChat, ChatMessage } from '../types';
import { X, Send, Sparkles, AlertCircle, Mic, Square, Loader2 } from 'lucide-react';
import { useVoiceTranscription } from '../hooks/useVoiceTranscription';

interface AddMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupChat[];
  onAddMessage: (msg: ChatMessage) => void;
  userName: string;
}

export const AddMessageModal: React.FC<AddMessageModalProps> = ({
  isOpen,
  onClose,
  groups,
  onAddMessage,
  userName,
}) => {
  const [groupId, setGroupId] = useState(groups[0]?.id || 'group-infra');
  const [sender, setSender] = useState('Liam (Lead SRE)');
  const [timestamp, setTimestamp] = useState('03:45 AM');
  const [text, setText] = useState('');
  const [isMention, setIsMention] = useState(false);

  const {
    isRecording,
    isTranscribing,
    recordingSeconds,
    error: transcriptionError,
    startRecording,
    stopRecording,
  } = useVoiceTranscription((transcription) => {
    setText((prev) => (prev ? `${prev} ${transcription}` : transcription));
  });

  if (!isOpen) return null;

  const selectedGroup = groups.find((g) => g.id === groupId) || groups[0];

  const handlePreset = (
    presetText: string,
    presetSender: string,
    mention: boolean,
    time: string,
    presetGroupId: string
  ) => {
    setText(presetText);
    setSender(presetSender);
    setIsMention(mention);
    setTimestamp(time);
    setGroupId(presetGroupId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-custom-${Date.now()}`,
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      platform: selectedGroup.platform,
      sender: sender.trim() || 'Chat Member',
      timestamp,
      rawHour: parseInt(timestamp.split(':')[0], 10) || 3,
      text: text.trim(),
      isMention: isMention || text.toLowerCase().includes(`@${userName.toLowerCase()}`),
    };

    onAddMessage(newMsg);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Simulate Incoming Late-Night Chat</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Quick Scenario Presets
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                handlePreset(
                  `@${userName} our redis cache server died at 04:10 AM. We switched to backup replica but need your signoff on TTL config!`,
                  'DevOps Oncall',
                  true,
                  '04:15 AM',
                  'group-infra'
                )
              }
              className="p-2 text-left bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-neutral-300 hover:text-white"
            >
              🚨 Redis Cache Incident
            </button>

            <button
              type="button"
              onClick={() =>
                handlePreset(
                  `Guys hotel rates in Shinjuku just bumped up! @${userName} did you approve the booking?`,
                  'Ken',
                  true,
                  '02:50 AM',
                  'group-tokyo'
                )
              }
              className="p-2 text-left bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-neutral-300 hover:text-white"
            >
              ✈️ Tokyo Hotel Urgency
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Target Group Chat</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.platform})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Sender Name</label>
              <input
                type="text"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
                placeholder="Sender name"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Time (Overnight)</label>
              <input
                type="text"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400 font-mono"
                placeholder="02:30 AM"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-neutral-300">Message Body</label>
              {/* Voice Transcription Mic Button (gemini-3.5-transcribe) */}
              <div className="flex items-center gap-1.5">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-rose-500 hover:bg-rose-600 text-white rounded-md flex items-center gap-1.5 animate-pulse"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop Recording ({recordingSeconds}s)</span>
                  </button>
                ) : isTranscribing ? (
                  <div className="px-2.5 py-1 text-[11px] font-medium bg-neutral-800 text-amber-400 rounded-md flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Transcribing with Gemini 3.5...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="px-2 py-1 text-[11px] font-medium bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-400/50 text-neutral-300 hover:text-amber-400 rounded-md flex items-center gap-1.5 transition-colors"
                    title="Speak into microphone to transcribe message via Gemini 3.5 Transcribe"
                  >
                    <Mic className="w-3 h-3 text-amber-400" />
                    <span>Dictate with Mic</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
              placeholder={`Type message or click 'Dictate with Mic' to transcribe audio... tag @${userName} for direct mention`}
              required
            />
            {transcriptionError && (
              <p className="text-[11px] text-rose-400 mt-1">{transcriptionError}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="mentionToggle"
              checked={isMention}
              onChange={(e) => setIsMention(e.target.checked)}
              className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
            />
            <label htmlFor="mentionToggle" className="text-xs text-neutral-300">
              Flag as direct urgent mention targeting you
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 fill-current" />
              <span>Feed into Overnight Queue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ActionItem, Platform, ChatMessage } from '../types';
import {
  Check,
  Copy,
  Send,
  CheckCircle2,
  AlertCircle,
  CornerDownRight,
  Mic,
  Square,
  Loader2,
  Zap,
  History,
  MessageSquareText,
  X,
  Briefcase,
  Smile,
} from 'lucide-react';
import { useVoiceTranscription } from '../hooks/useVoiceTranscription';
import { calculateUrgencyScore } from '../utils/urgency';
import { getToneReplyTemplates, TONE_CONFIGS, ReplyTone } from '../utils/replyTemplates';

interface ActionDispatcherProps {
  items: ActionItem[];
  onActionStatusChange: (id: string, status: 'pending' | 'resolved' | 'dismissed') => void;
  onSendReply: (item: ActionItem, customReply?: string) => void;
  isFocusMode?: boolean;
  messages?: ChatMessage[];
}

const platformLabels: Record<Platform, { label: string; color: string }> = {
  slack: { label: 'Slack', color: 'text-purple-400 bg-purple-950/40 border-purple-800/60' },
  whatsapp: { label: 'WhatsApp', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60' },
  telegram: { label: 'Telegram', color: 'text-sky-400 bg-sky-950/40 border-sky-800/60' },
  imessage: { label: 'iMessage', color: 'text-green-400 bg-green-950/40 border-green-800/60' },
  discord: { label: 'Discord', color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/60' },
};

export const ActionDispatcher: React.FC<ActionDispatcherProps> = ({
  items,
  onActionStatusChange,
  onSendReply,
  isFocusMode = false,
  messages = [],
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [selectedTones, setSelectedTones] = useState<Record<string, ReplyTone>>({});
  const [recordingItemId, setRecordingItemId] = useState<string | null>(null);
  const [contextItemId, setContextItemId] = useState<string | null>(null);

  const {
    isRecording,
    isTranscribing,
    recordingSeconds,
    startRecording,
    stopRecording,
  } = useVoiceTranscription((transcription) => {
    if (recordingItemId) {
      setReplyDrafts((prev) => ({
        ...prev,
        [recordingItemId]: prev[recordingItemId]
          ? `${prev[recordingItemId]} ${transcription}`
          : transcription,
      }));
      setEditingId(recordingItemId);
    }
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDraftChange = (id: string, value: string) => {
    setReplyDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectTone = (itemId: string, tone: ReplyTone, item: ActionItem) => {
    setSelectedTones((prev) => ({ ...prev, [itemId]: tone }));
    const tmpls = getToneReplyTemplates(item);
    setReplyDrafts((prev) => ({ ...prev, [itemId]: tmpls[tone] }));
  };

  const handleToggleVoiceDictation = (itemId: string) => {
    if (isRecording && recordingItemId === itemId) {
      stopRecording();
    } else {
      setRecordingItemId(itemId);
      setEditingId(itemId);
      startRecording();
    }
  };

  const pendingItems = items.filter((i) => i.status === 'pending');
  const resolvedItems = items.filter((i) => i.status === 'resolved');

  // Compute urgency scores (1-10) based on keywords and sender hierarchy, sorted by highest urgency first
  const pendingItemsWithScores = pendingItems
    .map((item) => ({
      item,
      urgencyData: calculateUrgencyScore(item),
    }))
    .sort((a, b) => b.urgencyData.score - a.urgencyData.score);

  // Extract the 3 messages directly preceding the trigger message for this action item
  const getPrecedingContext = (
    item: ActionItem
  ): { preceding: ChatMessage[]; trigger?: ChatMessage } => {
    if (!messages || messages.length === 0) return { preceding: [] };

    // Find all messages in the action item's group
    const groupMsgs = messages.filter(
      (m) =>
        m.groupName.toLowerCase() === item.groupName.toLowerCase() ||
        m.groupId.toLowerCase() === item.groupName.toLowerCase() ||
        m.groupName.toLowerCase().includes(item.groupName.toLowerCase()) ||
        item.groupName.toLowerCase().includes(m.groupName.toLowerCase())
    );

    if (groupMsgs.length === 0) return { preceding: [] };

    // Locate the trigger message in the group
    let triggerIdx = groupMsgs.findIndex(
      (m) =>
        (m.isMention ||
          m.sender.toLowerCase().includes(item.from.toLowerCase()) ||
          item.from.toLowerCase().includes(m.sender.toLowerCase())) &&
        (m.timestamp === item.timestamp ||
          item.task.toLowerCase().includes(m.text.toLowerCase().slice(0, 15)))
    );

    if (triggerIdx === -1) {
      triggerIdx = groupMsgs.findIndex(
        (m) =>
          m.sender.toLowerCase().includes(item.from.toLowerCase()) ||
          item.from.toLowerCase().includes(m.sender.toLowerCase())
      );
    }

    if (triggerIdx === -1) {
      triggerIdx = groupMsgs.length - 1;
    }

    const trigger = groupMsgs[triggerIdx];
    const preceding = groupMsgs.slice(Math.max(0, triggerIdx - 3), triggerIdx);

    return { preceding, trigger };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Action Items & Direct Mentions</span>
            <span className="text-xs font-mono font-medium text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
              {pendingItems.length} Pending
            </span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Ranked by calculated urgency score (1-10) across message keywords and sender hierarchy.
          </p>
        </div>
      </div>

      {pendingItems.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-neutral-900/40 border border-neutral-800/60">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-neutral-200">All actions handled</h3>
          <p className="text-xs text-neutral-400 mt-1">
            You’re all caught up with your overnight mentions and requests.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingItemsWithScores.map(({ item, urgencyData }) => {
            const platformConfig = platformLabels[item.platform] || platformLabels.slack;
            const templates = getToneReplyTemplates(item);
            const currentTone: ReplyTone = selectedTones[item.id] || 'direct';
            const currentDraft =
              replyDrafts[item.id] !== undefined ? replyDrafts[item.id] : templates[currentTone];
            const isItemRecording = isRecording && recordingItemId === item.id;
            const isItemTranscribing = isTranscribing && recordingItemId === item.id;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  urgencyData.score >= 9
                    ? 'bg-neutral-900/85 border-rose-500/40 shadow-sm shadow-rose-950/20'
                    : urgencyData.score >= 7
                    ? 'bg-neutral-900/80 border-amber-500/40 shadow-sm'
                    : 'bg-neutral-900/50 border-neutral-800'
                }`}
              >
                {/* Meta row */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${platformConfig.color}`}>
                      {platformConfig.label}
                    </span>
                    <span className="font-semibold text-neutral-200">{item.groupName}</span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="text-neutral-400">
                      From <strong className="text-neutral-200 font-medium">{item.from}</strong>
                    </span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="font-mono text-neutral-500">{item.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Visual Urgency Score Badge (1-10) */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold transition-all shadow-sm ${urgencyData.colorClasses.badge}`}
                      title={`Urgency Score: ${urgencyData.score}/10\nSender Hierarchy: ${urgencyData.senderTier} (+${urgencyData.senderBonus} pts)\nKeyword Matches: ${urgencyData.matchedKeywords.join(', ') || 'Standard'}`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${urgencyData.colorClasses.text}`} />
                      <span>Urgency {urgencyData.score}/10</span>
                      <div className="w-8 h-1.5 bg-neutral-950/70 rounded-full overflow-hidden border border-neutral-700/50 inline-flex ml-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${urgencyData.colorClasses.barFill}`}
                          style={{ width: `${urgencyData.score * 10}%` }}
                        />
                      </div>
                    </div>

                    {urgencyData.score >= 7 && (
                      <span
                        className={`text-xs font-semibold flex items-center gap-1 ${
                          isFocusMode ? 'text-indigo-400' : urgencyData.colorClasses.text
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{isFocusMode ? 'Muted' : 'Priority'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Task prompt */}
                <p className="text-sm font-medium text-neutral-100 mb-2 pl-1">
                  {item.task}
                </p>

                {/* Urgency Drivers: Sender Hierarchy & Keyword Matches */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] pl-1">
                  <span className="text-neutral-500 font-mono text-[10px] uppercase tracking-wider">Drivers:</span>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-950/80 border border-neutral-800 text-neutral-300 font-medium flex items-center gap-1">
                    <span className="text-neutral-500">Sender:</span>
                    <span className="text-neutral-200">{urgencyData.senderTier}</span>
                  </span>
                  {urgencyData.matchedKeywords.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-neutral-950/80 border border-neutral-800 text-neutral-300 font-medium flex items-center gap-1">
                      <span className="text-neutral-500">Keywords:</span>
                      <span className="text-amber-300 font-mono">{urgencyData.matchedKeywords.join(', ')}</span>
                    </span>
                  )}
                  {urgencyData.timeBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-800/50 text-rose-300 font-mono text-[10px]">
                      ⏰ Time Constraint
                    </span>
                  )}
                </div>

                {/* Suggested Reply Box with 3 Tone-Selectable Templates */}
                <div className="rounded-xl bg-neutral-950/80 border border-neutral-800/80 p-3.5 mb-3 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
                    <div className="flex items-center gap-1.5 text-neutral-200 font-semibold">
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>Reply Templates (Select Tone):</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Voice Dictate Button */}
                      <button
                        type="button"
                        onClick={() => handleToggleVoiceDictation(item.id)}
                        className={`text-[11px] flex items-center gap-1 transition-colors ${
                          isItemRecording
                            ? 'text-rose-400 font-bold animate-pulse'
                            : 'text-neutral-400 hover:text-amber-400'
                        }`}
                        title="Dictate response via microphone (Gemini 3.5 Transcribe)"
                      >
                        {isItemRecording ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>Stop ({recordingSeconds}s)</span>
                          </>
                        ) : isItemTranscribing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                            <span>Transcribing...</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3 h-3 text-amber-400" />
                            <span>Dictate Reply</span>
                          </>
                        )}
                      </button>

                      <span aria-hidden="true" className="text-neutral-700">|</span>

                      <button
                        onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                        className="text-neutral-400 hover:text-white transition-colors underline"
                      >
                        {editingId === item.id ? 'Done Editing' : 'Customize'}
                      </button>
                    </div>
                  </div>

                  {/* Three Distinct Tone Selectors: Direct, Formal, Casual */}
                  <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 rounded-lg border border-neutral-800/90">
                    <span className="text-[10px] uppercase font-mono font-semibold tracking-wider text-neutral-500 pl-1.5 pr-0.5 select-none">
                      Tone:
                    </span>
                    {TONE_CONFIGS.map((config) => {
                      const isSelected = currentTone === config.id;
                      return (
                        <button
                          key={config.id}
                          type="button"
                          onClick={() => handleSelectTone(item.id, config.id, item)}
                          className={`flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                            isSelected
                              ? 'bg-amber-400 text-neutral-950 font-bold shadow-sm'
                              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                          }`}
                          title={`${config.label} Tone: ${config.desc}`}
                        >
                          {config.id === 'direct' && <Zap className="w-3 h-3" />}
                          {config.id === 'formal' && <Briefcase className="w-3 h-3" />}
                          {config.id === 'casual' && <Smile className="w-3 h-3" />}
                          <span>{config.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Draft text display or textarea editor */}
                  {editingId === item.id ? (
                    <textarea
                      value={currentDraft}
                      onChange={(e) => handleDraftChange(item.id, e.target.value)}
                      rows={2}
                      className="w-full text-xs text-neutral-100 bg-neutral-900 border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-amber-400 leading-relaxed"
                    />
                  ) : (
                    <div className="p-2.5 rounded-lg bg-neutral-900/50 border border-neutral-800/60 flex items-start gap-2">
                      <p className="text-xs text-neutral-200 leading-relaxed font-normal">
                        &ldquo;{currentDraft}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSendReply(item, currentDraft)}
                      className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 active:scale-95 rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3 fill-current" />
                      <span>Dispatch Reply</span>
                    </button>

                    <button
                      onClick={() => handleCopy(item.id, currentDraft)}
                      className="px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-neutral-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* View Context Button */}
                    <button
                      onClick={() => setContextItemId(contextItemId === item.id ? null : item.id)}
                      className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 border active:scale-95 ${
                        contextItemId === item.id
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 ring-1 ring-amber-400/30 font-semibold'
                          : 'text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700/80 border-neutral-700/60'
                      }`}
                      title="View the 3 messages preceding the trigger message to provide context for your reply"
                    >
                      <MessageSquareText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{contextItemId === item.id ? 'Close Context' : 'View Context'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onActionStatusChange(item.id, 'resolved')}
                      className="px-2.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800/80 rounded-lg transition-colors"
                    >
                      Mark Done
                    </button>
                    <button
                      onClick={() => onActionStatusChange(item.id, 'dismissed')}
                      className="px-2 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-400 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>

                {/* Preceding Messages Context Popover */}
                {contextItemId === item.id && (() => {
                  const { preceding, trigger } = getPrecedingContext(item);
                  return (
                    <div className="mt-3.5 p-4 rounded-xl bg-neutral-950 border border-amber-500/30 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white">
                            Preceding Thread Context (3 Messages)
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
                            {item.groupName}
                          </span>
                        </div>
                        <button
                          onClick={() => setContextItemId(null)}
                          className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-900 transition-colors"
                          title="Close context"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {preceding.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic py-2">
                          No prior messages found before this trigger message in the active chat buffer.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                            3 Messages Directly Preceding Trigger:
                          </div>
                          {preceding.map((msg, index) => (
                            <div
                              key={msg.id || index}
                              className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-xs space-y-1 hover:border-neutral-700 transition-colors"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-neutral-800 text-amber-400 flex items-center justify-center text-[10px] font-mono font-bold">
                                    {index + 1}
                                  </span>
                                  <strong className="text-neutral-200 font-medium">{msg.sender}</strong>
                                </div>
                                <span className="font-mono text-neutral-500 text-[10px]">{msg.timestamp}</span>
                              </div>
                              <p className="text-neutral-300 text-[11px] leading-relaxed pl-6">
                                {msg.text}
                              </p>
                            </div>
                          ))}

                          {/* Trigger Message Reference Card */}
                          {trigger && (
                            <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/40 text-xs space-y-1 mt-2.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold">
                                    Trigger Message
                                  </span>
                                  <strong className="text-amber-200 font-semibold">{trigger.sender}</strong>
                                </div>
                                <span className="font-mono text-amber-400/80 text-[10px]">{trigger.timestamp}</span>
                              </div>
                              <p className="text-neutral-100 text-[11px] leading-relaxed pl-1 font-medium">
                                {trigger.text}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Handled actions history */}
      {resolvedItems.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-medium text-neutral-500 mb-2">
            Resolved Today ({resolvedItems.length})
          </div>
          <div className="space-y-2">
            {resolvedItems.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/50 flex items-center justify-between text-xs opacity-75"
              >
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-neutral-400 font-mono text-[11px]">{item.groupName}:</span>
                  <span className="text-neutral-300 truncate">{item.task}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 shrink-0 ml-1">
                    Urgency {calculateUrgencyScore(item).score}/10
                  </span>
                </div>
                <button
                  onClick={() => onActionStatusChange(item.id, 'pending')}
                  className="text-neutral-500 hover:text-neutral-300 text-[11px] underline ml-2 shrink-0"
                >
                  Re-open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

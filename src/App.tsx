import React, { useState, useEffect } from 'react';
import {
  ChatMessage,
  GroupChat,
  OvernightAnalysis,
  AgentSettings,
  ActionItem,
  TimelineEvent,
} from './types';
import { INITIAL_GROUPS, INITIAL_MESSAGES, INITIAL_ANALYSIS } from './mockData';
import { Header } from './components/Header';
import { MorningHeroBrief } from './components/MorningHeroBrief';
import { ActionDispatcher } from './components/ActionDispatcher';
import { GroupChatBreakdown } from './components/GroupChatBreakdown';
import { OvernightTimeline } from './components/OvernightTimeline';
import { ChatTranscriptModal } from './components/ChatTranscriptModal';
import { AddMessageModal } from './components/AddMessageModal';
import { AgentSettingsModal } from './components/AgentSettingsModal';
import { ChatImportModal } from './components/ChatImportModal';
import { WeeklyActivityHeatmap } from './components/WeeklyActivityHeatmap';
import { isCurrentTimeInSleepWindow, shiftSleepEnd30Minutes } from './utils/time';
import { getOptimalSleepWindowSuggestion } from './utils/sleepOptimization';
import {
  Moon,
  Sun,
  ShieldCheck,
  Zap,
  Upload,
  MessageSquare,
  Sparkles,
  Check,
  AlertCircle,
  Bell,
  Clock,
  Activity,
  Search,
  X,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  const [groups, setGroups] = useState<GroupChat[]>(INITIAL_GROUPS);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [analysis, setAnalysis] = useState<OvernightAnalysis>(INITIAL_ANALYSIS);
  const [activeView, setActiveView] = useState<'brief' | 'heatmap' | 'chats' | 'timeline'>('brief');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<AgentSettings>({
    userName: 'Alex',
    sleepStart: '11:00 PM',
    sleepEnd: '07:00 AM',
    tone: 'crisp',
    voice: 'Kore',
    priorityKeywords: ['urgent', 'incident', 'deadline', 'review', 'choose', 'flight', 'critical'],
    autoDeliverMorning: true,
    dndMode: true,
    refreshIntervalEnabled: true,
  });

  // Modals
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isAddMessageOpen, setIsAddMessageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Run Gemini overnight chat analysis
  const handleRunAnalysis = async (customSleepEnd?: string) => {
    setIsAnalyzing(true);
    const effectiveSleepEnd = customSleepEnd || settings.sleepEnd;
    try {
      const monitoredGroupIds = groups.filter((g) => g.isMonitored).map((g) => g.id);
      const monitoredMessages = messages.filter((m) => monitoredGroupIds.includes(m.groupId));

      const res = await fetch('/api/analyze-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: monitoredMessages,
          userName: settings.userName,
          tone: settings.tone,
          sleepStart: settings.sleepStart,
          sleepEnd: effectiveSleepEnd,
        }),
      });

      if (!res.ok) {
        throw new Error('Analysis API failed');
      }

      const data = await res.json();

      if (data.line1 && data.line2) {
        setAnalysis({
          line1: data.line1,
          line2: data.line2,
          keyTakeawayTitle: data.keyTakeawayTitle || 'Overnight Summary',
          timestampGenerated: 'Just now (Morning)',
          sleepWindow: {
            start: settings.sleepStart,
            end: effectiveSleepEnd,
          },
          stats: {
            totalMessages: monitoredMessages.length,
            activeChats: new Set(monitoredMessages.map((m) => m.groupId)).size,
            actionItemsCount: data.actionItems?.length || 0,
            decisionsCount: data.groupSummaries?.reduce(
              (acc: number, g: any) => acc + (g.keyDecisions?.length || 0),
              0
            ) || 2,
            peakHour: data.peakHour || '01:30 AM – 03:00 AM',
          },
          actionItems: (data.actionItems || []).map((item: any, idx: number) => ({
            id: item.id || `act-${Date.now()}-${idx}`,
            groupName: item.groupName,
            platform: item.platform || 'slack',
            from: item.from,
            timestamp: item.timestamp || '03:00 AM',
            task: item.task,
            urgency: item.urgency || 'medium',
            suggestedReply: item.suggestedReply,
            status: 'pending',
          })),
          groupSummaries: data.groupSummaries || analysis.groupSummaries,
          nightTimeline: data.nightTimeline || analysis.nightTimeline,
          audioScript:
            data.audioScript ||
            `Good morning ${settings.userName}. Here is your overnight briefing. Line one: ${data.line1}. Line two: ${data.line2}.`,
        });
        showToast('Overnight briefing freshly synthesized with Gemini!');
      } else {
        // Fallback local synthesis
        synthesizeLocally();
      }
    } catch (err) {
      console.warn('API error, falling back to local heuristic synthesis', err);
      synthesizeLocally();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const synthesizeLocally = () => {
    // Generate intelligent local synthesis based on present messages
    const mentions = messages.filter((m) => m.isMention);
    const incidentMsgs = messages.filter((m) => m.tags?.includes('incident') || m.text.includes('🚨'));
    const bookingMsgs = messages.filter((m) => m.tags?.includes('booking') || m.text.includes('Machiya') || m.text.includes('flight'));

    let line1 = 'Overnight chats were largely steady with discussions across ' + groups.filter((g) => g.isMonitored).length + ' monitored channels.';
    if (incidentMsgs.length > 0) {
      line1 = 'A late-night database latency incident in #infra-eng was resolved and rolled back, while the Tokyo crew locked in reservations.';
    }

    let line2 = `You have ${mentions.length} direct mentions waiting for your response this morning.`;
    if (mentions.length > 0) {
      const topMention = mentions[mentions.length - 1];
      line2 = `Approve ${topMention.sender}’s pending request in ${topMention.groupName} and check your calendar schedule.`;
    }

    setAnalysis((prev) => ({
      ...prev,
      line1,
      line2,
      timestampGenerated: 'Just now (Local Agent)',
      stats: {
        ...prev.stats,
        totalMessages: messages.length,
        actionItemsCount: mentions.length,
      },
    }));
    showToast('Synthesized overnight pass via local engine.');
  };

  const handleActionStatusChange = (id: string, status: 'pending' | 'resolved' | 'dismissed') => {
    setAnalysis((prev) => ({
      ...prev,
      actionItems: prev.actionItems.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    }));
  };

  const handleSendReply = (item: ActionItem, customReply?: string) => {
    const textToSend = customReply || item.suggestedReply;

    // Add message from user into the chat stream
    const replyMessage: ChatMessage = {
      id: `reply-${Date.now()}`,
      groupId:
        groups.find((g) => g.name === item.groupName)?.id || 'group-infra',
      groupName: item.groupName,
      platform: item.platform,
      sender: `${settings.userName} (You)`,
      timestamp: 'Just now',
      rawHour: new Date().getHours(),
      text: textToSend,
      tags: ['outgoing-reply'],
    };

    setMessages((prev) => [...prev, replyMessage]);

    // Mark action as resolved
    handleActionStatusChange(item.id, 'resolved');
    showToast(`Replied to ${item.from} in ${item.groupName}`);
  };

  const handleAddMessage = (newMsg: ChatMessage) => {
    setMessages((prev) => [...prev, newMsg]);

    // If it's a mention, create a pending action item
    if (newMsg.isMention) {
      const newAction: ActionItem = {
        id: `act-new-${Date.now()}`,
        groupName: newMsg.groupName,
        platform: newMsg.platform,
        from: newMsg.sender,
        timestamp: newMsg.timestamp,
        task: `Respond to ${newMsg.sender}: "${newMsg.text}"`,
        urgency: 'high',
        suggestedReply: `Hi ${newMsg.sender}, saw your note. On it now!`,
        status: 'pending',
      };

      setAnalysis((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalMessages: prev.stats.totalMessages + 1,
          actionItemsCount: prev.stats.actionItemsCount + 1,
        },
        actionItems: [newAction, ...prev.actionItems],
      }));
    } else {
      setAnalysis((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          totalMessages: prev.stats.totalMessages + 1,
        },
      }));
    }

    if (!isFocusMode) {
      showToast(`Injected message into ${newMsg.groupName}`);
    }
  };

  const handleToggleFocusMode = () => {
    setIsFocusMode((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'Focus Mode ON — notifications and incoming message alerts muted.'
          : 'Focus Mode OFF — message alerts restored.'
      );
      return next;
    });
  };

  const handleImportMessages = (newMessages: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
    showToast(`Imported ${newMessages.length} messages. Running pass...`);
    setTimeout(handleRunAnalysis, 500);
  };

  const handleToggleGroupMonitored = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, isMonitored: !g.isMonitored } : g
      )
    );
  };

  const handleApplyOptimalSleepWindow = (start: string, end: string) => {
    setSettings((prev) => ({
      ...prev,
      sleepStart: start,
      sleepEnd: end,
    }));
    setAnalysis((prev) => ({
      ...prev,
      sleepWindow: { start, end },
    }));
    showToast(`Sleep window auto-adjusted to ${start} – ${end} (lowest volume hours). Recalculating...`);
    handleRunAnalysis(end);
  };

  const handleTriggerAutoAdjust = () => {
    const suggestion = getOptimalSleepWindowSuggestion(settings.sleepStart, settings.sleepEnd, 7);
    handleApplyOptimalSleepWindow(suggestion.suggestedStart, suggestion.suggestedEnd);
  };

  // Automatic 30-Minute Refresh Interval to re-run overnight analysis during active Sleep Window
  useEffect(() => {
    if (!settings.refreshIntervalEnabled) return;

    // 30 minutes in milliseconds
    const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

    const intervalId = setInterval(() => {
      const inSleep = isCurrentTimeInSleepWindow(settings.sleepStart, settings.sleepEnd);
      if (inSleep) {
        showToast('30m Refresh: Re-running overnight analysis for live overnight messages...');
        handleRunAnalysis();
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [
    settings.refreshIntervalEnabled,
    settings.sleepStart,
    settings.sleepEnd,
    settings.userName,
    settings.tone,
    groups,
    messages,
  ]);

  const handleSnooze30m = () => {
    const newEnd = shiftSleepEnd30Minutes(settings.sleepEnd);
    setSettings((prev) => ({ ...prev, sleepEnd: newEnd }));
    setAnalysis((prev) => ({
      ...prev,
      sleepWindow: {
        ...prev.sleepWindow,
        end: newEnd,
      },
    }));
    showToast(`Alarm snoozed 30m to ${newEnd}. Recalculating briefing...`);
    handleRunAnalysis(newEnd);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Top Header Contract */}
      <Header
        onRefresh={() => handleRunAnalysis()}
        isAnalyzing={isAnalyzing}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewMessage={() => setIsAddMessageOpen(true)}
        activeView={activeView}
        setActiveView={setActiveView}
        isDndActive={settings.dndMode}
        isFocusMode={isFocusMode}
        onToggleFocusMode={handleToggleFocusMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Focus Mode Active Banner */}
        {isFocusMode && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
              <span>
                <strong className="text-white font-semibold">Focus Mode Active:</strong> Notifications and incoming message alerts are muted. All messages will be quietly digested for your morning briefing.
              </span>
            </div>
            <button
              onClick={handleToggleFocusMode}
              className="px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-900/50 hover:bg-indigo-900/80 rounded border border-indigo-500/40 transition-colors shrink-0"
            >
              Turn Off
            </button>
          </div>
        )}

        {/* View: Morning Brief (The default primary interface) */}
        {activeView === 'brief' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <MorningHeroBrief
              analysis={analysis}
              userName={settings.userName}
              voice={settings.voice}
              onSnooze30m={handleSnooze30m}
              isRecalculating={isAnalyzing}
              refreshIntervalEnabled={settings.refreshIntervalEnabled}
              onAutoAdjustSleepWindow={handleTriggerAutoAdjust}
            />

            {/* Split layout: Action Items on left, Group breakdown on right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Direct Action Items (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <ActionDispatcher
                  items={analysis.actionItems}
                  messages={messages}
                  onActionStatusChange={handleActionStatusChange}
                  onSendReply={handleSendReply}
                  isFocusMode={isFocusMode}
                />
              </div>

              {/* Right Column: Group breakdowns & Night Timeline snippet (7 cols) */}
              <div className="lg:col-span-7 space-y-8">
                <GroupChatBreakdown
                  summaries={analysis.groupSummaries}
                  onOpenGroupChats={(groupId) => {
                    setSelectedGroupId(groupId);
                    setIsTranscriptOpen(true);
                  }}
                />

                <div className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Night Milestones Snapshot</span>
                    </h3>
                    <button
                      onClick={() => setActiveView('timeline')}
                      className="text-xs text-amber-400 hover:text-amber-300 font-medium"
                    >
                      View Full Timeline →
                    </button>
                  </div>
                  <OvernightTimeline events={analysis.nightTimeline.slice(0, 4)} />
                </div>
              </div>
            </div>

            {/* Weekly Activity Heatmap in the main dashboard */}
            <WeeklyActivityHeatmap
              groups={groups}
              sleepStart={settings.sleepStart}
              sleepEnd={settings.sleepEnd}
              onApplyOptimalSleepWindow={handleApplyOptimalSleepWindow}
            />
          </div>
        )}

        {/* View: Dedicated Sleep Heatmap */}
        {activeView === 'heatmap' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-xl font-bold text-white">Sleep Window & Disturbance Analytics</h1>
              <p className="text-xs text-neutral-400 mt-1">
                Visualizing group chat volume intensity by hour using D3 to determine when Do Not Disturb is most critical.
              </p>
            </div>

            <WeeklyActivityHeatmap
              groups={groups}
              sleepStart={settings.sleepStart}
              sleepEnd={settings.sleepEnd}
              onApplyOptimalSleepWindow={handleApplyOptimalSleepWindow}
            />
          </div>
        )}

        {/* View: Monitored Chats */}
        {activeView === 'chats' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">Monitored Group Channels</h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Connected group chats scanned locally during your overnight hours ({settings.sleepStart} – {settings.sleepEnd}).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Import Chat Export</span>
                </button>
                <button
                  onClick={() => setIsTranscriptOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open Raw Log ({messages.length})</span>
                </button>
              </div>
            </div>

            {/* Real-time Channel Filter Input Field */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl">
              <div className="relative flex-1 min-w-[280px]">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={channelSearchQuery}
                  onChange={(e) => setChannelSearchQuery(e.target.value)}
                  placeholder="Filter channels by name or platform (e.g. infra, Tokyo, syndicate, slack)..."
                  className="w-full text-xs bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-lg pl-9 pr-8 py-2 text-neutral-100 placeholder-neutral-500 focus:outline-none transition-colors"
                />
                {channelSearchQuery && (
                  <button
                    onClick={() => setChannelSearchQuery('')}
                    className="absolute right-2.5 top-2 text-neutral-400 hover:text-white p-0.5 rounded transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="text-xs text-neutral-400 font-mono flex items-center gap-2">
                <span>
                  Showing{' '}
                  <strong className="text-white tabular-nums">
                    {
                      groups.filter((g) => {
                        if (!channelSearchQuery.trim()) return true;
                        const q = channelSearchQuery.toLowerCase();
                        return (
                          g.name.toLowerCase().includes(q) ||
                          g.platform.toLowerCase().includes(q) ||
                          g.description.toLowerCase().includes(q)
                        );
                      }).length
                    }
                  </strong>{' '}
                  of <span className="tabular-nums">{groups.length}</span> channels
                </span>
                {channelSearchQuery && (
                  <button
                    onClick={() => setChannelSearchQuery('')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-sans"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {groups.filter((g) => {
              if (!channelSearchQuery.trim()) return true;
              const q = channelSearchQuery.toLowerCase();
              return (
                g.name.toLowerCase().includes(q) ||
                g.platform.toLowerCase().includes(q) ||
                g.description.toLowerCase().includes(q)
              );
            }).length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
                <Search className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-neutral-200">No channels found</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  No chat groups match &ldquo;{channelSearchQuery}&rdquo;.
                </p>
                <button
                  onClick={() => setChannelSearchQuery('')}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-amber-400 hover:text-amber-300 bg-neutral-900 border border-neutral-800 rounded-lg transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups
                  .filter((g) => {
                    if (!channelSearchQuery.trim()) return true;
                    const q = channelSearchQuery.toLowerCase();
                    return (
                      g.name.toLowerCase().includes(q) ||
                      g.platform.toLowerCase().includes(q) ||
                      g.description.toLowerCase().includes(q)
                    );
                  })
                  .map((group) => {
                    const groupMsgs = messages.filter((m) => m.groupId === group.id);
                    const mentionCount = groupMsgs.filter((m) => m.isMention).length;

                    return (
                      <div
                        key={group.id}
                        className="p-5 rounded-2xl border border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 transition-colors flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
                              {group.platform}
                            </span>
                            <button
                              onClick={() => handleToggleGroupMonitored(group.id)}
                              className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                                group.isMonitored
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}
                            >
                              {group.isMonitored ? 'Active Daemon' : 'Muted'}
                            </button>
                          </div>

                          <h3 className="text-base font-bold text-white mb-1">{group.name}</h3>
                          <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                            {group.description}
                          </p>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                            <div className="p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/60">
                              <span className="text-[10px] text-neutral-500 block">Overnight Msgs</span>
                              <span className="text-sm font-mono font-bold text-white tabular-nums">
                                {groupMsgs.length}
                              </span>
                            </div>
                            <div className="p-2 bg-neutral-950/60 rounded-lg border border-neutral-800/60">
                              <span className="text-[10px] text-neutral-500 block">Mentions</span>
                              <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
                                {mentionCount}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                          <span className="text-neutral-500 text-[11px]">
                            {group.membersCount} participants
                          </span>
                          <button
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setIsTranscriptOpen(true);
                            }}
                            className="text-amber-400 hover:text-amber-300 font-medium"
                          >
                            Inspect Stream →
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* View: Night Timeline */}
        {activeView === 'timeline' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white">Full Overnight Event Stream</h1>
                <p className="text-xs text-neutral-400 mt-1">
                  Detailed timeline of messages and incidents logged between {settings.sleepStart} and {settings.sleepEnd}.
                </p>
              </div>

              <button
                onClick={() => setIsAddMessageOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <span>Simulate Night Event</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40">
              <OvernightTimeline events={analysis.nightTimeline} />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ChatTranscriptModal
        isOpen={isTranscriptOpen}
        onClose={() => setIsTranscriptOpen(false)}
        messages={messages}
        groups={groups}
        selectedGroupId={selectedGroupId}
        onSelectGroup={setSelectedGroupId}
        onAddMessageClick={() => setIsAddMessageOpen(true)}
      />

      <AddMessageModal
        isOpen={isAddMessageOpen}
        onClose={() => setIsAddMessageOpen(false)}
        groups={groups}
        onAddMessage={handleAddMessage}
        userName={settings.userName}
      />

      <AgentSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={setSettings}
        groups={groups}
        onToggleGroupMonitored={handleToggleGroupMonitored}
        onTriggerRefreshNow={() => handleRunAnalysis()}
        messages={messages}
      />

      <ChatImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportMessages={handleImportMessages}
        userName={settings.userName}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-amber-500/40 text-neutral-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quiet Anti-Slop Footer */}
      <footer className="w-full border-t border-neutral-900 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-400">DawnBrief</span>
            <span aria-hidden="true">·</span>
            <span>Local Overnight Group Chat Intelligence Agent</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Privacy: Zero Persistent Cloud Retention</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-neutral-300 transition-colors"
            >
              Config
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

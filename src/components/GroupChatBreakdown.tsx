import React from 'react';
import { GroupSummary, Platform } from '../types';
import { MessageSquare, Flame, CheckCircle, Users, Activity, ExternalLink } from 'lucide-react';

interface GroupChatBreakdownProps {
  summaries: GroupSummary[];
  onOpenGroupChats: (groupId: string) => void;
}

const vibeConfig: Record<string, { label: string; color: string; icon: any }> = {
  urgent: { label: 'Urgent Incident', color: 'text-rose-400 bg-rose-950/40 border-rose-800/60', icon: Flame },
  chaotic: { label: 'Booking Frenzy', color: 'text-amber-400 bg-amber-950/40 border-amber-800/60', icon: Activity },
  productive: { label: 'Consensus Reached', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60', icon: CheckCircle },
  chill: { label: 'Calm & Warm', color: 'text-sky-400 bg-sky-950/40 border-sky-800/60', icon: MessageSquare },
};

const platformBadges: Record<Platform, { label: string; textStyle: string }> = {
  slack: { label: 'Slack', textStyle: 'text-purple-400' },
  whatsapp: { label: 'WhatsApp', textStyle: 'text-emerald-400' },
  telegram: { label: 'Telegram', textStyle: 'text-sky-400' },
  imessage: { label: 'iMessage', textStyle: 'text-green-400' },
  discord: { label: 'Discord', textStyle: 'text-indigo-400' },
};

export const GroupChatBreakdown: React.FC<GroupChatBreakdownProps> = ({
  summaries,
  onOpenGroupChats,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">Group-by-Group Intelligence</h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Filtered breakdown of all discussions and decisions made across each channel overnight.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summaries.map((summary) => {
          const vibe = vibeConfig[summary.vibe] || vibeConfig.chill;
          const VibeIcon = vibe.icon;
          const platformInfo = platformBadges[summary.platform] || platformBadges.slack;

          return (
            <div
              key={summary.groupId}
              className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/60 transition-colors flex flex-col justify-between"
            >
              <div>
                {/* Channel Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`font-semibold uppercase tracking-wider text-[10px] ${platformInfo.textStyle}`}>
                        {platformInfo.label}
                      </span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="font-mono text-neutral-400 tabular-nums">
                        {summary.messageCount} msgs
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">{summary.groupName}</h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border ${vibe.color}`}
                  >
                    <VibeIcon className="w-3 h-3" />
                    <span>{vibe.label}</span>
                  </span>
                </div>

                {/* 1-Line Summary */}
                <p className="text-xs text-neutral-200 leading-relaxed mb-3">
                  {summary.oneLineSummary}
                </p>

                {/* Key decisions if any */}
                {summary.keyDecisions && summary.keyDecisions.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                      Overnight Decisions
                    </div>
                    <ul className="space-y-1">
                      {summary.keyDecisions.map((dec, idx) => (
                        <li key={idx} className="text-xs text-neutral-300 flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                          <span>{dec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bottom footer: speakers and inspect button */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                  <Users className="w-3 h-3 text-neutral-500 shrink-0" />
                  <span className="truncate">
                    {summary.topSpeakers ? summary.topSpeakers.join(', ') : 'Various members'}
                  </span>
                </div>

                <button
                  onClick={() => onOpenGroupChats(summary.groupId)}
                  className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 text-[11px] transition-colors"
                >
                  <span>Inspect Log</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

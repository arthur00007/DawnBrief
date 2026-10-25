import React from 'react';
import { TimelineEvent } from '../types';
import { Clock, ShieldAlert, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';

interface OvernightTimelineProps {
  events: TimelineEvent[];
  onSelectEvent?: (event: TimelineEvent) => void;
}

export const OvernightTimeline: React.FC<OvernightTimelineProps> = ({ events, onSelectEvent }) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Chronological Night Flight Timeline</span>
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          Everything that unfolded hour-by-hour while Do-Not-Disturb was guarding your sleep.
        </p>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-800">
        {events.map((evt, idx) => {
          const isHigh = evt.intensity === 'high';
          const isMedium = evt.intensity === 'medium';

          return (
            <div key={idx} className="relative group">
              {/* Timeline marker node */}
              <div
                className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 ${
                  isHigh
                    ? 'bg-rose-500 border-rose-900 shadow-sm shadow-rose-500/50'
                    : isMedium
                    ? 'bg-amber-400 border-amber-950'
                    : 'bg-neutral-600 border-neutral-900'
                }`}
              />

              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 tabular-nums">
                      {evt.time}
                    </span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="font-semibold text-neutral-200">{evt.groupName}</span>
                    <span aria-hidden="true" className="text-neutral-600">·</span>
                    <span className="text-neutral-400 font-medium">{evt.speaker}</span>
                  </div>

                  {isHigh && (
                    <span className="text-[11px] font-mono font-semibold text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Incident Event
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-neutral-200">
                  {evt.event}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { GroupChat } from '../types';
import { Moon, Sun, Sparkles, Shield, Info, Sliders, Check, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { getOptimalSleepWindowSuggestion } from '../utils/sleepOptimization';

interface HeatmapCell {
  dayIndex: number; // 0 (Mon) to 6 (Sun)
  dayName: string;
  hour: number; // 0 to 23
  count: number;
  activeGroups: string[];
  quietScore: number; // 0 to 100
}

interface WeeklyActivityHeatmapProps {
  groups: GroupChat[];
  sleepStart: string; // e.g. "23:00" or "11:00 PM"
  sleepEnd: string; // e.g. "07:00" or "07:00 AM"
  onApplyOptimalSleepWindow?: (start: string, end: string) => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const WeeklyActivityHeatmap: React.FC<WeeklyActivityHeatmapProps> = ({
  groups,
  sleepStart,
  sleepEnd,
  onApplyOptimalSleepWindow,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [appliedNotice, setAppliedNotice] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Parse numerical sleep hours (e.g. "23:00" or "11:00 PM" -> 23)
  const parseHour = (timeStr: string): number => {
    const clean = timeStr.trim().toUpperCase();
    if (clean.includes('PM') || clean.includes('AM')) {
      const parts = clean.split(':');
      let h = parseInt(parts[0], 10);
      if (clean.includes('PM') && h < 12) h += 12;
      if (clean.includes('AM') && h === 12) h = 0;
      return h;
    }
    return parseInt(clean.split(':')[0], 10) || 23;
  };

  const startHour = parseHour(sleepStart); // e.g. 23
  const endHour = parseHour(sleepEnd); // e.g. 7

  // Function to test if an hour falls in the sleep range (handles wrap-around across midnight)
  const isSleepHour = (hour: number): boolean => {
    if (startHour <= endHour) {
      return hour >= startHour && hour < endHour;
    }
    return hour >= startHour || hour < endHour;
  };

  // Generate realistic historical message intensity matrix across the week
  const heatmapData = useMemo<HeatmapCell[]>(() => {
    const data: HeatmapCell[] = [];

    // Deterministic pseudo-random seed based on day and hour
    const getBaseIntensity = (d: number, h: number, gId: string) => {
      // SRE alerts spike around 01:00 - 02:30 AM mid-week (Tue/Wed)
      // Tokyo trip friends chat heavily between 11 PM and 3 AM on Fri/Sat/Sun
      // Founders syndicate chats between 1 AM and 3 AM (US East morning)
      // Family group chats around 6 AM - 8 AM weekend mornings

      let total = 0;
      const activeG: string[] = [];

      // Infra alerts (#infra-eng)
      if (gId === 'all' || gId === 'group-infra') {
        let inf = 0;
        if (h === 1 || h === 2) {
          inf = (d === 1 || d === 2 || d === 3) ? 28 : 8;
        } else if (h >= 9 && h <= 18) {
          inf = 15;
        }
        if (inf > 0) activeG.push('#infra-eng');
        total += inf;
      }

      // Tokyo Autumn Crew (whatsapp)
      if (gId === 'all' || gId === 'group-tokyo') {
        let tok = 0;
        if ((h >= 23 || h <= 3) && (d >= 3)) {
          tok = 32; // late night trip planning frenzy
        } else if (h >= 19 && h <= 23) {
          tok = 14;
        }
        if (tok > 0) activeG.push('Tokyo Crew');
        total += tok;
      }

      // Founders Syndicate (telegram)
      if (gId === 'all' || gId === 'group-syndicate') {
        let syn = 0;
        if ((h === 1 || h === 2) && d <= 4) syn = 18;
        if (syn > 0) activeG.push('Founders Syndicate');
        total += syn;
      }

      // Family (iMessage)
      if (gId === 'all' || gId === 'group-family') {
        let fam = 0;
        if ((h === 6 || h === 7 || h === 8) && (d === 5 || d === 6)) fam = 12;
        if (fam > 0) activeG.push('Family');
        total += fam;
      }

      // Late night gaming (discord)
      if (gId === 'all' || gId === 'group-gaming') {
        let game = 0;
        if ((h >= 0 && h <= 4) && (d === 4 || d === 5)) game = 22;
        if (game > 0) activeG.push('Night Owls');
        total += game;
      }

      // Daytime baseline chatter
      if (h >= 10 && h <= 17) {
        total += (d < 5 ? 12 : 6);
      }

      return { total, activeG };
    };

    DAYS.forEach((dayName, dayIndex) => {
      HOURS.forEach((hour) => {
        const { total, activeG } = getBaseIntensity(dayIndex, hour, selectedGroupId);
        // Quiet score: 100 when count is 0, down to 0 when count > 40
        const quietScore = Math.max(0, Math.min(100, Math.round(100 - (total / 45) * 100)));

        data.push({
          dayIndex,
          dayName,
          hour,
          count: total,
          activeGroups: activeG,
          quietScore,
        });
      });
    });

    return data;
  }, [selectedGroupId]);

  // Find max message count for D3 color scaling
  const maxCount = useMemo(() => {
    return Math.max(20, d3.max(heatmapData, (d) => d.count) || 40);
  }, [heatmapData]);

  // Compute the optimal 7-hour consecutive quiet window based on lowest cumulative message count
  const optimalWindow = useMemo(() => {
    let bestStart = 3;
    let minSum = Infinity;

    for (let s = 0; s < 24; s++) {
      let sum = 0;
      for (let offset = 0; offset < 7; offset++) {
        const h = (s + offset) % 24;
        // sum average across all days
        const avgHour = d3.mean(
          heatmapData.filter((d) => d.hour === h),
          (d) => d.count
        ) || 0;
        sum += avgHour;
      }
      if (sum < minSum) {
        minSum = sum;
        bestStart = s;
      }
    }

    const bestEnd = (bestStart + 7) % 24;
    const formatH = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formatted = h % 12 === 0 ? 12 : h % 12;
      return `${formatted}:00 ${ampm}`;
    };

    return {
      start: formatH(bestStart),
      end: formatH(bestEnd),
      startNum: bestStart,
      endNum: bestEnd,
      avgDisturbances: (minSum / 7).toFixed(1),
    };
  }, [heatmapData]);

  // D3 Color Scale: Custom sequential gradient from obsidian to amber to crimson
  const colorScale = useMemo(() => {
    return d3
      .scaleLinear<string>()
      .domain([0, 2, 10, 25, maxCount])
      .range(['#0d131f', '#1e293b', '#3b82f6', '#f59e0b', '#ef4444'])
      .clamp(true);
  }, [maxCount]);

  // Compute sleep optimization suggestion comparing current vs lowest average volume hours
  const suggestion = useMemo(() => {
    return getOptimalSleepWindowSuggestion(sleepStart, sleepEnd, 7, selectedGroupId);
  }, [sleepStart, sleepEnd, selectedGroupId]);

  const handleApplyOptimal = () => {
    onApplyOptimalSleepWindow?.(suggestion.suggestedStart, suggestion.suggestedEnd);
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 3000);
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 space-y-6">
      {/* Component Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Moon className="w-3.5 h-3.5" />
            <span>Sleep Window Optimization · D3 Analytics</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            Weekly Activity & Disturbance Heatmap
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Hourly message volume across your group chats. Identify historical calm zones to protect your sleep.
          </p>
        </div>

        {/* Channel Filter Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">Filter:</span>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="text-xs bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-400"
          >
            <option value="all">All 5 Monitored Channels</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-Adjust Sleep Window Feature Banner */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-neutral-950 via-neutral-900/90 to-amber-950/30 border border-amber-500/30 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Auto-Adjust Sleep Window
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>{suggestion.noiseReductionPercent}% Quieter Schedule</span>
                </span>
              </div>

              {/* Current vs Suggested Comparison Strip */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pt-1">
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <span>Current:</span>
                  <span className="font-mono text-neutral-200 font-semibold">{sleepStart} – {sleepEnd}</span>
                  <span className="text-neutral-500 text-[11px]">({suggestion.currentAvgDisturbancePerHour} msgs/hr)</span>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />

                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold">Suggested:</span>
                  <span className="font-mono text-amber-300 font-bold bg-amber-400/15 px-2 py-0.5 rounded border border-amber-400/30">
                    {suggestion.suggestedStart} – {suggestion.suggestedEnd}
                  </span>
                  <span className="text-amber-400/90 font-mono text-[11px] font-medium">
                    (Lowest: {suggestion.avgDisturbancePerHour} msgs/hr)
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 pt-0.5">
                Automatically identifies the calmest 7-hour block across all 168 hours of the week, shielding you from late-night infra alerts and group chat spikes.
              </p>
            </div>
          </div>

          {onApplyOptimalSleepWindow && (
            <div className="w-full lg:w-auto flex items-center gap-2 shrink-0">
              <button
                onClick={handleApplyOptimal}
                className="w-full lg:w-auto px-4 py-2.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
                title="Automatically apply the lowest volume hours to your sleepStart and sleepEnd settings"
              >
                {appliedNotice ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-950 stroke-[3]" />
                    <span>Sleep Window Auto-Adjusted!</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span>Auto-Adjust Sleep Window</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* The D3 Heatmap Grid Container */}
      <div className="relative overflow-x-auto pb-2" ref={containerRef}>
        <div className="min-w-[700px]">
          {/* Hour labels header (X-axis) */}
          <div className="grid grid-cols-[48px_repeat(24,1fr)] gap-1 mb-1 text-[10px] font-mono text-neutral-500 text-center select-none">
            <div className="text-left font-sans text-neutral-400">Day</div>
            {HOURS.map((h) => {
              const isHighlight = isSleepHour(h);
              const label = h === 0 ? '12A' : h === 6 ? '6A' : h === 12 ? '12P' : h === 18 ? '6P' : h % 3 === 0 ? `${h > 12 ? h - 12 : h}${h >= 12 ? 'P' : 'A'}` : '';
              return (
                <div
                  key={h}
                  className={`truncate flex flex-col items-center justify-end ${
                    isHighlight ? 'text-amber-400/80 font-bold' : ''
                  }`}
                  title={`${h}:00`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Sleep Window Header Indicator Ribbon */}
          <div className="grid grid-cols-[48px_repeat(24,1fr)] gap-1 mb-2 select-none">
            <div />
            {HOURS.map((h) => {
              const inSleep = isSleepHour(h);
              return (
                <div
                  key={h}
                  className={`h-1 rounded-sm transition-colors ${
                    inSleep
                      ? 'bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                      : 'bg-neutral-800/40'
                  }`}
                  title={inSleep ? `Within configured sleep window (${sleepStart} – ${sleepEnd})` : 'Awake window'}
                />
              );
            })}
          </div>

          {/* Heatmap Rows (7 Days) */}
          <div className="space-y-1">
            {DAYS.map((dayName, dayIndex) => (
              <div
                key={dayName}
                className="grid grid-cols-[48px_repeat(24,1fr)] gap-1 items-center"
              >
                {/* Day Label (Y-axis) */}
                <div className="text-xs font-semibold text-neutral-300 select-none">
                  {dayName}
                </div>

                {/* 24 Hour Cells */}
                {HOURS.map((hour) => {
                  const cell = heatmapData.find(
                    (d) => d.dayIndex === dayIndex && d.hour === hour
                  );
                  if (!cell) return null;

                  const cellColor = colorScale(cell.count);
                  const inSleep = isSleepHour(hour);

                  return (
                    <div
                      key={hour}
                      onMouseEnter={(e) => {
                        setHoveredCell(cell);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
                      }}
                      onMouseLeave={() => {
                        setHoveredCell(null);
                        setTooltipPos(null);
                      }}
                      style={{
                        backgroundColor: cellColor,
                      }}
                      className={`h-7 rounded transition-transform cursor-pointer relative hover:scale-110 hover:z-20 hover:ring-2 hover:ring-white ${
                        inSleep
                          ? 'border border-amber-400/30'
                          : 'border border-neutral-800/40'
                      }`}
                    >
                      {/* Quiet indicator star if zero messages during sleep hours */}
                      {inSleep && cell.count === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-[9px] text-amber-200">
                          ·
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sleep Window Bracket Tag below grid */}
          <div className="grid grid-cols-[48px_repeat(24,1fr)] gap-1 mt-2 text-[10px] text-amber-400/90 font-mono select-none">
            <div />
            {HOURS.map((h) => {
              const inSleep = isSleepHour(h);
              if (h === startHour) {
                return (
                  <div key={h} className="col-span-3 text-left flex items-center gap-1">
                    <Moon className="w-2.5 h-2.5" />
                    <span>Bedtime</span>
                  </div>
                );
              }
              if (h === endHour) {
                return (
                  <div key={h} className="col-span-3 text-left flex items-center gap-1">
                    <Sun className="w-2.5 h-2.5" />
                    <span>Alarm</span>
                  </div>
                );
              }
              return <div key={h} />;
            })}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredCell && tooltipPos && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full pointer-events-none bg-neutral-950 border border-neutral-700/80 shadow-2xl rounded-xl p-3 text-xs w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="font-semibold text-white">
              {hoveredCell.dayName},{' '}
              {hoveredCell.hour === 0
                ? '12 AM'
                : hoveredCell.hour === 12
                ? '12 PM'
                : hoveredCell.hour > 12
                ? `${hoveredCell.hour - 12} PM`
                : `${hoveredCell.hour} AM`}
            </span>
            <span className="font-mono text-[10px]">
              {hoveredCell.hour.toString().padStart(2, '0')}:00 –{' '}
              {((hoveredCell.hour + 1) % 24).toString().padStart(2, '0')}:00
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 my-1.5">
            <span className="text-lg font-mono font-bold text-white tabular-nums">
              {hoveredCell.count}
            </span>
            <span className="text-neutral-400 text-[11px]">messages recorded</span>
          </div>

          <div className="space-y-1 pt-1.5 border-t border-neutral-800 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Sleep Quiet Score:</span>
              <span
                className={`font-mono font-semibold ${
                  hoveredCell.quietScore >= 80
                    ? 'text-emerald-400'
                    : hoveredCell.quietScore >= 40
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {hoveredCell.quietScore}/100
              </span>
            </div>

            {isSleepHour(hoveredCell.hour) && (
              <div className="text-amber-300 flex items-center gap-1 font-medium">
                <Moon className="w-3 h-3 text-amber-400" />
                <span>Falls inside your sleep window</span>
              </div>
            )}

            {hoveredCell.activeGroups.length > 0 && (
              <div className="text-neutral-400 text-[10px] truncate">
                Active: {hoveredCell.activeGroups.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Heatmap Legend & Sleep Window Guide */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-800/80 text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-neutral-300">Message Intensity:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">Silent (0)</span>
            <div className="flex items-center gap-0.5">
              <span className="w-3.5 h-3.5 rounded bg-[#0d131f] border border-neutral-800" />
              <span className="w-3.5 h-3.5 rounded bg-[#1e293b]" />
              <span className="w-3.5 h-3.5 rounded bg-[#3b82f6]" />
              <span className="w-3.5 h-3.5 rounded bg-[#f59e0b]" />
              <span className="w-3.5 h-3.5 rounded bg-[#ef4444]" />
            </div>
            <span className="text-[10px]">Peak Surge (40+)</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-neutral-900 border border-amber-400/60" />
            <span>Configured Bedtime ({sleepStart} – {sleepEnd})</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Sparkles className="w-3 h-3" />
            <span>Target: 03:00 AM – 06:30 AM minimum noise</span>
          </div>
        </div>
      </div>
    </div>
  );
};

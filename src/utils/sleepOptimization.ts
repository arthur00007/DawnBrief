import { GroupChat } from '../types';

export interface SleepWindowSuggestion {
  suggestedStart: string; // e.g. "03:00 AM"
  suggestedEnd: string; // e.g. "10:00 AM"
  startHour: number;
  endHour: number;
  windowDuration: number;
  avgDisturbancePerHour: number;
  currentAvgDisturbancePerHour: number;
  noiseReductionPercent: number;
  lowestHours: number[];
  hourlyAverages: number[];
}

/**
 * Computes deterministic historical hourly volume across a 7-day week
 * matching the D3 Weekly Activity Heatmap dataset.
 */
export function getHourlyAverageVolumes(selectedGroupId: string = 'all'): number[] {
  const hourlySums = new Array(24).fill(0);
  const daysCount = 7;

  for (let d = 0; d < daysCount; d++) {
    for (let h = 0; h < 24; h++) {
      let total = 0;

      // Infra alerts (#infra-eng)
      if (selectedGroupId === 'all' || selectedGroupId === 'group-infra') {
        let inf = 0;
        if (h === 1 || h === 2) {
          inf = (d === 1 || d === 2 || d === 3) ? 28 : 8;
        } else if (h >= 9 && h <= 18) {
          inf = 15;
        }
        total += inf;
      }

      // Tokyo Autumn Crew (whatsapp)
      if (selectedGroupId === 'all' || selectedGroupId === 'group-tokyo') {
        let tok = 0;
        if ((h >= 23 || h <= 3) && (d >= 3)) {
          tok = 32;
        } else if (h >= 19 && h <= 23) {
          tok = 14;
        }
        total += tok;
      }

      // Founders Syndicate (telegram)
      if (selectedGroupId === 'all' || selectedGroupId === 'group-syndicate') {
        let syn = 0;
        if ((h === 1 || h === 2) && d <= 4) syn = 18;
        total += syn;
      }

      // Family (iMessage)
      if (selectedGroupId === 'all' || selectedGroupId === 'group-family') {
        let fam = 0;
        if ((h === 6 || h === 7 || h === 8) && (d === 5 || d === 6)) fam = 12;
        total += fam;
      }

      // Late night gaming (discord)
      if (selectedGroupId === 'all' || selectedGroupId === 'group-gaming') {
        let game = 0;
        if ((h >= 0 && h <= 4) && (d === 4 || d === 5)) game = 22;
        total += game;
      }

      // Daytime baseline chatter
      if (h >= 10 && h <= 17) {
        total += (d < 5 ? 12 : 6);
      }

      hourlySums[h] += total;
    }
  }

  return hourlySums.map((sum) => Number((sum / daysCount).toFixed(1)));
}

export function parseHourFromTimeString(timeStr: string): number {
  const clean = timeStr.trim().toUpperCase();
  if (clean.includes('PM') || clean.includes('AM')) {
    const parts = clean.split(':');
    let h = parseInt(parts[0], 10) || 0;
    if (clean.includes('PM') && h < 12) h += 12;
    if (clean.includes('AM') && h === 12) h = 0;
    return h;
  }
  return parseInt(clean.split(':')[0], 10) || 23;
}

export function formatHourToString(hour: number, format12h: boolean = true): string {
  const normalized = (hour % 24 + 24) % 24;
  if (!format12h) {
    return `${normalized.toString().padStart(2, '0')}:00`;
  }
  const ampm = normalized >= 12 ? 'PM' : 'AM';
  const displayH = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${displayH.toString().padStart(2, '0')}:00 ${ampm}`;
}

/**
 * Automatically calculates the lowest average message volume hours
 * and produces a suggested sleepStart and sleepEnd window.
 */
export function getOptimalSleepWindowSuggestion(
  currentSleepStart: string,
  currentSleepEnd: string,
  durationHours: number = 7,
  selectedGroupId: string = 'all'
): SleepWindowSuggestion {
  const hourlyAverages = getHourlyAverageVolumes(selectedGroupId);

  let bestStart = 3;
  let minSum = Infinity;

  // Search across all 24 possible starting hours for the lowest consecutive sum
  for (let s = 0; s < 24; s++) {
    let sum = 0;
    for (let offset = 0; offset < durationHours; offset++) {
      const h = (s + offset) % 24;
      sum += hourlyAverages[h];
    }
    if (sum < minSum) {
      minSum = sum;
      bestStart = s;
    }
  }

  const bestEnd = (bestStart + durationHours) % 24;
  const lowestHours: number[] = [];
  for (let i = 0; i < durationHours; i++) {
    lowestHours.push((bestStart + i) % 24);
  }

  const avgDisturbancePerHour = Number((minSum / durationHours).toFixed(1));

  // Calculate current sleep window volume for comparison
  const currentStartH = parseHourFromTimeString(currentSleepStart);
  const currentEndH = parseHourFromTimeString(currentSleepEnd);

  let currentDuration = 0;
  let currentSum = 0;
  let curr = currentStartH;
  while (curr !== currentEndH && currentDuration < 24) {
    currentSum += hourlyAverages[curr];
    currentDuration++;
    curr = (curr + 1) % 24;
  }
  if (currentDuration === 0) currentDuration = 7;
  const currentAvgDisturbancePerHour = Number((currentSum / currentDuration).toFixed(1));

  const noiseReduction = currentAvgDisturbancePerHour > 0
    ? Math.max(0, Math.round(((currentAvgDisturbancePerHour - avgDisturbancePerHour) / currentAvgDisturbancePerHour) * 100))
    : 0;

  const is12HourFormat = currentSleepStart.toUpperCase().includes('AM') || currentSleepStart.toUpperCase().includes('PM');

  return {
    suggestedStart: formatHourToString(bestStart, is12HourFormat),
    suggestedEnd: formatHourToString(bestEnd, is12HourFormat),
    startHour: bestStart,
    endHour: bestEnd,
    windowDuration: durationHours,
    avgDisturbancePerHour,
    currentAvgDisturbancePerHour,
    noiseReductionPercent: noiseReduction,
    lowestHours,
    hourlyAverages,
  };
}

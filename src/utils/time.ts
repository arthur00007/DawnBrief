/**
 * Utility functions for time parsing and overnight sleep window calculations
 */

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  const ampmMatch = clean.match(/(AM|PM)/i);
  const isPM = ampmMatch ? ampmMatch[0].toUpperCase() === 'PM' : false;
  const isAM = ampmMatch ? ampmMatch[0].toUpperCase() === 'AM' : false;

  const parts = clean.replace(/(AM|PM)/i, '').trim().split(':');
  let hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return (hours % 24) * 60 + (minutes % 60);
}

/**
 * Checks if the current local time falls inside the configured sleep window.
 * Supports both overnight windows crossing midnight (e.g. 11:00 PM to 07:00 AM)
 * and daytime/same-day windows (e.g. 01:00 to 08:00).
 */
export function isCurrentTimeInSleepWindow(
  sleepStart: string,
  sleepEnd: string,
  date: Date = new Date()
): boolean {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = parseTimeToMinutes(sleepStart);
  const endMinutes = parseTimeToMinutes(sleepEnd);

  if (startMinutes === endMinutes) {
    return true; // continuous 24h
  }

  if (startMinutes < endMinutes) {
    // Window on the same calendar day (e.g. 01:00 AM to 07:00 AM)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Overnight window crossing midnight (e.g. 11:00 PM to 07:00 AM)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Shifts a time string forward by 30 minutes, preserving 12h AM/PM or 24h format.
 */
export function shiftSleepEnd30Minutes(currentEnd: string): string {
  const clean = currentEnd.trim();
  const ampmMatch = clean.match(/(AM|PM|am|pm)/i);
  const timeParts = clean.replace(/(AM|PM|am|pm)/i, '').trim().split(':');
  let hours = parseInt(timeParts[0], 10) || 7;
  let mins = parseInt(timeParts[1], 10) || 0;
  const isPM = ampmMatch ? ampmMatch[0].toUpperCase() === 'PM' : false;
  const hasAmPm = !!ampmMatch;

  if (hasAmPm) {
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
  }

  mins += 30;
  if (mins >= 60) {
    mins -= 60;
    hours = (hours + 1) % 24;
  }

  if (hasAmPm) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayH = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayH.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
  } else {
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

import { ActionItem } from '../types';

export interface UrgencyScoreResult {
  score: number; // 1 - 10
  senderTier: string;
  senderBonus: number;
  matchedKeywords: string[];
  keywordBonus: number;
  timeBonus: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  colorClasses: {
    badge: string;
    text: string;
    border: string;
    dot: string;
    barFill: string;
  };
}

const CRITICAL_KEYWORDS = [
  'incident',
  'outage',
  'crash',
  'deadlock',
  'rollback',
  'emergency',
  'critical',
  'p0',
  'p1',
  'fatal',
  'down',
  'breach',
  'blocker',
  'blocked',
  'production',
];

const HIGH_PRIORITY_KEYWORDS = [
  'review',
  'approve',
  'approval',
  'pr',
  'deploy',
  'deployment',
  'staging',
  'deadline',
  'urgent',
  'asap',
  'immediately',
  'lock',
  'wire',
  'sign',
  'carta',
  'deposit',
  'booking',
  'reservation',
  'flight',
];

const MEDIUM_KEYWORDS = [
  'choose',
  'confirm',
  'decide',
  'decision',
  'check',
  'verify',
  'update',
  'schedule',
  'today',
  'window',
  'needed',
  'respond',
  'brunch',
];

/**
 * Calculates a 1-10 Urgency Score based on message keyword matches,
 * sender hierarchy / role seniority, and deadline constraints.
 */
export function calculateUrgencyScore(item: ActionItem): UrgencyScoreResult {
  // If pre-computed score exists and is valid 1-10, we can honor it or refine it
  const textCorpus = `${item.task} ${item.suggestedReply} ${item.groupName}`.toLowerCase();
  const senderLower = item.from.toLowerCase();

  // 1. Sender Hierarchy Analysis
  let senderBonus = 0.5;
  let senderTier = 'Peer / Member';

  if (/(lead|head|vp|director|chief|cto|ceo|founder|partner|principal|manager|boss)/i.test(senderLower)) {
    senderBonus = 3.0;
    senderTier = 'Senior Lead / Leadership';
  } else if (/(sre|dba|devops|security|architect|admin|legal|investor|syndicate)/i.test(senderLower)) {
    senderBonus = 2.5;
    senderTier = 'Critical Ops / Specialist';
  } else if (/(mom|dad|wife|husband|sister|brother|family)/i.test(senderLower)) {
    senderBonus = 1.5;
    senderTier = 'Direct Family';
  }

  // 2. Keyword Matching
  const matchedKeywords: string[] = [];
  let keywordPoints = 0;

  for (const kw of CRITICAL_KEYWORDS) {
    if (textCorpus.includes(kw) && !matchedKeywords.includes(kw)) {
      matchedKeywords.push(kw);
      keywordPoints += 2.5;
    }
  }

  for (const kw of HIGH_PRIORITY_KEYWORDS) {
    if (textCorpus.includes(kw) && !matchedKeywords.includes(kw)) {
      matchedKeywords.push(kw);
      keywordPoints += 1.5;
    }
  }

  for (const kw of MEDIUM_KEYWORDS) {
    if (textCorpus.includes(kw) && !matchedKeywords.includes(kw)) {
      matchedKeywords.push(kw);
      keywordPoints += 0.8;
    }
  }

  // Cap keyword bonus to prevent unbounded inflation
  const keywordBonus = Math.min(4.5, keywordPoints);

  // 3. Time Urgency Constraint (e.g. "before 9:30 AM", "by 9:00 AM", "deploy window")
  let timeBonus = 0;
  if (/(before|by|window|deadline)\s*(\d{1,2}(:\d{2})?\s*(am|pm)?)/i.test(item.task)) {
    timeBonus = 1.5;
  }

  // 4. Base Urgency from categorized item
  let basePoints = 2.0;
  if (item.urgency === 'high') basePoints = 4.0;
  else if (item.urgency === 'medium') basePoints = 2.8;
  else if (item.urgency === 'low') basePoints = 1.2;

  // Compute Raw & Clamped 1-10 Score
  const rawScore = basePoints + senderBonus + keywordBonus + timeBonus;
  const score = Math.min(10, Math.max(1, Math.round(rawScore)));

  // Categorize visual variant
  let level: UrgencyScoreResult['level'] = 'medium';
  let colorClasses = {
    badge: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    dot: 'bg-amber-400',
    barFill: 'bg-amber-400',
  };

  if (score >= 9) {
    level = 'critical';
    colorClasses = {
      badge: 'bg-rose-500/15 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/30',
      text: 'text-rose-400',
      border: 'border-rose-500/50',
      dot: 'bg-rose-500 animate-ping',
      barFill: 'bg-rose-500',
    };
  } else if (score >= 7) {
    level = 'high';
    colorClasses = {
      badge: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
      text: 'text-amber-300',
      border: 'border-amber-500/40',
      dot: 'bg-amber-400',
      barFill: 'bg-amber-400',
    };
  } else if (score >= 5) {
    level = 'medium';
    colorClasses = {
      badge: 'bg-yellow-400/10 text-yellow-300 border-yellow-400/30',
      text: 'text-yellow-400',
      border: 'border-yellow-500/30',
      dot: 'bg-yellow-400',
      barFill: 'bg-yellow-400',
    };
  } else {
    level = 'low';
    colorClasses = {
      badge: 'bg-neutral-800 text-neutral-300 border-neutral-700',
      text: 'text-neutral-400',
      border: 'border-neutral-800',
      dot: 'bg-neutral-500',
      barFill: 'bg-neutral-400',
    };
  }

  return {
    score,
    senderTier,
    senderBonus,
    matchedKeywords,
    keywordBonus,
    timeBonus,
    level,
    colorClasses,
  };
}

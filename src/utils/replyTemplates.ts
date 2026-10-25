import { ActionItem } from '../types';

export type ReplyTone = 'direct' | 'formal' | 'casual';

export interface ToneTemplateConfig {
  id: ReplyTone;
  label: string;
  badge: string;
  desc: string;
}

export const TONE_CONFIGS: ToneTemplateConfig[] = [
  {
    id: 'direct',
    label: 'Direct',
    badge: 'Crisp & Action-First',
    desc: 'Zero fluff, decisions stated immediately',
  },
  {
    id: 'formal',
    label: 'Formal',
    badge: 'Professional & Structured',
    desc: 'Executive courtesy, thorough and respectful',
  },
  {
    id: 'casual',
    label: 'Casual',
    badge: 'Friendly & Relaxed',
    desc: 'Warm conversational peer tone with enthusiasm',
  },
];

/**
 * Returns 3 distinct tone-selectable reply templates tailored for the action item.
 */
export function getToneReplyTemplates(item: ActionItem): Record<ReplyTone, string> {
  const taskLower = item.task.toLowerCase();
  const groupLower = item.groupName.toLowerCase();
  const fromLower = item.from.toLowerCase();

  // Curated high-fidelity templates for known mock scenarios
  if (item.id === 'act-1' || groupLower.includes('infra') || taskLower.includes('pr #419')) {
    return {
      direct: 'Reviewed and approved PR #419. 5,000-row micro-batching is clean for the 9:30 AM staging deploy window.',
      formal: `Hello ${item.from}, I have completed the review of PR #419. The chunked indexing micro-batches effectively mitigate database locking risks. Approved for deployment.`,
      casual: 'Approved! 🚀 Batch size of 5,000 looks super solid. Huge thanks for stabilizing the deadlock earlier, Liam.',
    };
  }

  if (item.id === 'act-2' || groupLower.includes('tokyo') || taskLower.includes('balcony') || taskLower.includes('tatami')) {
    return {
      direct: 'Master balcony room selected. Venmo transfer sent for the deposit.',
      formal: `Hi Ken, please proceed with locking in the master balcony room for my stay. I have transferred my portion of the deposit via Venmo.`,
      casual: 'Balcony room all the way! 🏯 Just sent over my share of the deposit on Venmo, can’t wait for Tokyo!',
    };
  }

  if (item.id === 'act-3' || groupLower.includes('syndicate') || taskLower.includes('carta')) {
    return {
      direct: 'Signed Carta syndicate consent form for Synapse AI Series A.',
      formal: `Dear David, I have accessed the Carta portal and executed the pro-rata syndicate consent for the Synapse AI Series A round. Congratulations to the team.`,
      casual: 'All signed and submitted on Carta! ✍️ Excited for the Synapse AI Series A close, huge congrats everyone.',
    };
  }

  if (item.id === 'act-4' || groupLower.includes('family') || taskLower.includes('zuni') || fromLower.includes('mom')) {
    return {
      direct: 'Zuni Cafe at 10:30 AM confirmed. Bringing Dad’s vintage camera.',
      formal: `Good morning Mom, I have noted the venue change to Zuni Cafe for 10:30 AM. I have retrieved Dad’s vintage camera and will see you then.`,
      casual: 'Sounds wonderful Mom! ☕ Found Dad’s vintage camera and packed it. See you both at Zuni at 10:30!',
    };
  }

  // Smart dynamic templates for any other injected / custom action items
  const cleanBase = item.suggestedReply
    ? item.suggestedReply.replace(/^(Hi|Hello|Hey) [^,]+,\s*/i, '')
    : `Saw your message regarding ${item.task}.`;

  const directReply = cleanBase.endsWith('.') ? cleanBase : `${cleanBase}.`;

  const formalReply = `Hello ${item.from}, thank you for your note. Regarding "${item.task.slice(0, 60)}${item.task.length > 60 ? '...' : ''}": I have reviewed this and confirmed. Please proceed.`;

  const casualReply = `Hey ${item.from}! ${cleanBase.replace(/^([a-z])/, (m) => m.toUpperCase())} 👍 On it now!`;

  return {
    direct: directReply,
    formal: formalReply,
    casual: casualReply,
  };
}

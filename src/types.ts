export type Platform = 'whatsapp' | 'slack' | 'telegram' | 'discord' | 'imessage';

export interface ChatMessage {
  id: string;
  groupId: string;
  groupName: string;
  platform: Platform;
  sender: string;
  senderAvatar?: string;
  timestamp: string; // e.g. "02:14 AM"
  rawHour: number; // 0-23 for filtering overnight
  text: string;
  isMention?: boolean;
  priorityKeyword?: string;
  tags?: string[];
}

export interface GroupChat {
  id: string;
  name: string;
  platform: Platform;
  category: 'work' | 'social' | 'travel' | 'family';
  iconColor: string;
  membersCount: number;
  members: string[];
  description: string;
  isMonitored: boolean;
  priority: 'high' | 'normal' | 'low';
}

export interface ActionItem {
  id: string;
  groupName: string;
  platform: Platform;
  from: string;
  timestamp: string;
  task: string;
  urgency: 'high' | 'medium' | 'low';
  suggestedReply: string;
  status: 'pending' | 'resolved' | 'dismissed';
  urgencyScore?: number; // 1-10 calculated score based on keywords and sender hierarchy
}

export interface GroupSummary {
  groupId: string;
  groupName: string;
  platform: Platform;
  messageCount: number;
  vibe: 'chill' | 'productive' | 'fiery' | 'chaotic' | 'urgent';
  oneLineSummary: string;
  keyDecisions: string[];
  topSpeakers: string[];
  overnightPeak: string;
}

export interface TimelineEvent {
  time: string;
  groupName: string;
  platform: Platform;
  event: string;
  speaker: string;
  intensity: 'low' | 'medium' | 'high';
}

export interface OvernightAnalysis {
  line1: string; // The Overnight Verdict / Gist
  line2: string; // What requires your immediate action today
  keyTakeawayTitle: string;
  timestampGenerated: string;
  sleepWindow: {
    start: string;
    end: string;
  };
  stats: {
    totalMessages: number;
    activeChats: number;
    actionItemsCount: number;
    decisionsCount: number;
    peakHour: string;
  };
  actionItems: ActionItem[];
  groupSummaries: GroupSummary[];
  nightTimeline: TimelineEvent[];
  audioScript: string;
}

export interface AgentSettings {
  userName: string;
  sleepStart: string; // "23:00"
  sleepEnd: string; // "07:00"
  tone: 'crisp' | 'witty' | 'executive' | 'protective';
  voice: 'Kore' | 'Puck' | 'Fenrir' | 'Zephyr';
  priorityKeywords: string[];
  autoDeliverMorning: boolean;
  dndMode: boolean;
  refreshIntervalEnabled: boolean; // Auto re-run overnight analysis every 30m during sleep window
}

import React, { useState } from 'react';
import { ChatMessage, Platform } from '../types';
import { FileText, Upload, Sparkles, X, Check } from 'lucide-react';

interface ChatImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportMessages: (newMessages: ChatMessage[]) => void;
  userName: string;
}

export const ChatImportModal: React.FC<ChatImportModalProps> = ({
  isOpen,
  onClose,
  onImportMessages,
  userName,
}) => {
  const [rawText, setRawText] = useState('');
  const [platform, setPlatform] = useState<Platform>('whatsapp');
  const [groupName, setGroupName] = useState('Custom Group Chat');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParseAndImport = () => {
    if (!rawText.trim()) {
      setError('Please enter or paste chat transcript lines.');
      return;
    }

    try {
      const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
      const parsed: ChatMessage[] = [];

      lines.forEach((line, index) => {
        // Simple regex heuristics for WhatsApp / Slack: e.g. "[02:14 AM] Sender: Message" or "02:14 AM - Sender: Message"
        let timestamp = '02:30 AM';
        let sender = 'User';
        let content = line;

        const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/);
        if (timeMatch) {
          timestamp = timeMatch[1].toUpperCase();
        }

        // Try to split on colon for sender
        const parts = line.replace(/\[\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)\]/, '').split(':');
        if (parts.length >= 2) {
          sender = parts[0].replace(/^[-–—]\s*/, '').trim();
          content = parts.slice(1).join(':').trim();
        }

        if (content) {
          parsed.push({
            id: `imported-${Date.now()}-${index}`,
            groupId: `group-imported-${platform}`,
            groupName: groupName.trim() || 'Custom Group Chat',
            platform,
            sender: sender || 'Participant',
            timestamp,
            rawHour: parseInt(timestamp.split(':')[0], 10) || 2,
            text: content,
            isMention: content.toLowerCase().includes(`@${userName.toLowerCase()}`),
          });
        }
      });

      if (parsed.length === 0) {
        throw new Error('No valid message lines parsed');
      }

      onImportMessages(parsed);
      onClose();
    } catch (err: any) {
      setError('Could not parse text format. Try: [02:15 AM] Liam: Text here');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Import Overnight Chat Export</span>
          </h2>
          <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Chat Source Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
              >
                <option value="whatsapp">WhatsApp Export (.txt)</option>
                <option value="slack">Slack Channel</option>
                <option value="telegram">Telegram Export</option>
                <option value="discord">Discord Log</option>
                <option value="imessage">iMessage Thread</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-neutral-100 focus:outline-none focus:border-amber-400"
                placeholder="e.g. Project Redline"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Raw Chat Messages (One per line)
            </label>
            <p className="text-[11px] text-neutral-500 mb-1.5">
              Paste your overnight chat lines. Include timestamps and sender names.
            </p>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setError(null);
              }}
              placeholder={`[01:15 AM] Liam: DB latency spike detected, checking locks.\n[02:00 AM] Sarah: Flight prices dropped to $580, everyone please confirm.\n[02:40 AM] Liam: Rolled back v18.4, latency green.`}
              className="w-full text-xs font-mono bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-neutral-100 focus:outline-none focus:border-amber-400"
            />
            {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleParseAndImport}
              className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Import & Queue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

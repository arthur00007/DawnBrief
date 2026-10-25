import React, { useState } from 'react';
import { ChatMessage, GroupChat } from '../types';
import { Search, Filter, MessageSquare, AtSign, Plus, X } from 'lucide-react';

interface ChatTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  groups: GroupChat[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  onAddMessageClick: () => void;
}

export const ChatTranscriptModal: React.FC<ChatTranscriptModalProps> = ({
  isOpen,
  onClose,
  messages,
  groups,
  selectedGroupId,
  onSelectGroup,
  onAddMessageClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMentions, setOnlyMentions] = useState(false);

  if (!isOpen) return null;

  const filteredMessages = messages.filter((msg) => {
    if (selectedGroupId && msg.groupId !== selectedGroupId) return false;
    if (onlyMentions && !msg.isMention) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        msg.text.toLowerCase().includes(q) ||
        msg.sender.toLowerCase().includes(q) ||
        msg.groupName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span>Overnight Raw Chat Feed</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Examining {filteredMessages.length} captured messages across your active group chats.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddMessageClick}
              className="px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inject Message</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and search bar */}
        <div className="p-3 sm:px-5 border-b border-neutral-800/80 bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3">
          {/* Channel selector tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            <button
              onClick={() => onSelectGroup(null)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap ${
                selectedGroupId === null
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white bg-neutral-900'
              }`}
            >
              All Chats
            </button>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => onSelectGroup(g.id)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap ${
                  selectedGroupId === g.id
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white bg-neutral-900'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Search & mentions toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              onClick={() => setOnlyMentions(!onlyMentions)}
              className={`px-2.5 py-1.5 text-xs rounded-lg font-medium border transition-colors flex items-center gap-1.5 shrink-0 ${
                onlyMentions
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/60'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <AtSign className="w-3 h-3" />
              <span>Mentions</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredMessages.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-xs">
              No messages match your selected filters.
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isUrgent = msg.priorityKeyword || msg.tags?.includes('incident');

              return (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    msg.isMention
                      ? 'bg-amber-950/15 border-amber-500/40'
                      : isUrgent
                      ? 'bg-rose-950/10 border-rose-800/40'
                      : 'bg-neutral-900/40 border-neutral-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-200">{msg.sender}</span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-[11px] text-neutral-400">{msg.groupName}</span>
                      {msg.isMention && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300">
                          @mention
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-neutral-500 text-[11px] tabular-nums">
                      {msg.timestamp}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-neutral-100 font-normal leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

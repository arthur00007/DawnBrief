import React from 'react';
import { Moon, Sun, Bell, BellOff, RefreshCw, SlidersHorizontal, MessageSquarePlus, Activity } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isAnalyzing: boolean;
  onOpenSettings: () => void;
  onOpenNewMessage: () => void;
  activeView: 'brief' | 'heatmap' | 'chats' | 'timeline';
  setActiveView: (view: 'brief' | 'heatmap' | 'chats' | 'timeline') => void;
  isDndActive: boolean;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isAnalyzing,
  onOpenSettings,
  onOpenNewMessage,
  activeView,
  setActiveView,
  isDndActive,
  isFocusMode,
  onToggleFocusMode,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark (single element, no pills) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Moon className="w-4 h-4 text-amber-300" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
            DawnBrief <span className="font-light text-neutral-400">Agent</span>
          </span>
        </div>

        {/* Zone 2: Navigation Links (Clean single-line text links with active underlines) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveView('brief')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeView === 'brief'
                ? 'text-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Morning Brief
            {activeView === 'brief' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveView('heatmap')}
            className={`transition-colors whitespace-nowrap py-1 relative flex items-center gap-1.5 ${
              activeView === 'heatmap'
                ? 'text-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Sleep Heatmap</span>
            {activeView === 'heatmap' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveView('chats')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeView === 'chats'
                ? 'text-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Monitored Chats
            {activeView === 'chats' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveView('timeline')}
            className={`transition-colors whitespace-nowrap py-1 relative ${
              activeView === 'timeline'
                ? 'text-amber-400 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Night Timeline
            {activeView === 'timeline' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Focus Mode Toggle Button */}
          <button
            onClick={onToggleFocusMode}
            title={
              isFocusMode
                ? 'Focus Mode is active: notifications and chat alerts are muted. Click to turn off.'
                : 'Turn on Focus Mode to temporarily mute notifications and incoming message alerts.'
            }
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border active:scale-95 ${
              isFocusMode
                ? 'bg-indigo-950/80 text-indigo-200 border-indigo-500/50 shadow-sm shadow-indigo-500/20 ring-1 ring-indigo-500/40'
                : 'bg-neutral-900/90 text-neutral-300 hover:text-white border-neutral-800 hover:border-neutral-700'
            }`}
          >
            {isFocusMode ? (
              <BellOff className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            ) : (
              <Bell className="w-3.5 h-3.5 text-neutral-400" />
            )}
            <span className="whitespace-nowrap">
              {isFocusMode ? 'Focus Mode ON' : 'Focus Mode'}
            </span>
            {isFocusMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            )}
          </button>

          <button
            onClick={onOpenNewMessage}
            title="Simulate incoming late-night chat message or record voice"
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 rounded-lg transition-colors border border-neutral-800 text-xs flex items-center gap-1.5"
          >
            <MessageSquarePlus className="w-4 h-4 text-neutral-300" />
            <span className="hidden sm:inline">Feed Chat</span>
          </button>

          <button
            onClick={onOpenSettings}
            title="Agent Configuration"
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 rounded-lg transition-colors border border-neutral-800"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={onRefresh}
            disabled={isAnalyzing}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] rounded-lg transition-all flex items-center gap-2 shadow-sm whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Synthesizing...' : 'Run Overnight Pass'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

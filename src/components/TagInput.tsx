import React, { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';
import { X, Plus, Sparkles, Tag, Check, RotateCcw } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  suggestedTags?: string[];
  maxTags?: number;
  matchedMessagesCount?: number;
  label?: string;
  helperText?: string;
}

const DEFAULT_SUGGESTIONS = [
  'incident',
  'outage',
  'critical',
  'deadline',
  'wire',
  'approve',
  'flight',
  'review',
  'emergency',
  'deposit',
  'security',
];

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Type keyword and press Enter or comma...',
  suggestedTags = DEFAULT_SUGGESTIONS,
  maxTags = 30,
  matchedMessagesCount,
  label = 'Priority Keywords & Watchwords',
  helperText = 'Messages containing these terms automatically trigger high-priority alerts and action items.',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (rawTag: string) => {
    const clean = rawTag.trim().toLowerCase();
    if (!clean) return;

    if (tags.map((t) => t.toLowerCase()).includes(clean)) {
      setIsDuplicate(true);
      setTimeout(() => setIsDuplicate(false), 1500);
      return;
    }

    if (tags.length >= maxTags) return;

    onChange([...tags, clean]);
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, i) => i !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === ',' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text');
    const splits = pasteText
      .split(/[,\n\t]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const newTags = [...tags];
    for (const s of splits) {
      if (!newTags.includes(s) && newTags.length < maxTags) {
        newTags.push(s);
      }
    }
    onChange(newTags);
    setInputValue('');
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const availableSuggestions = suggestedTags.filter(
    (s) => !tags.map((t) => t.toLowerCase()).includes(s.toLowerCase())
  );

  return (
    <div className="space-y-2">
      {/* Label and Count Strip */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-400" />
          <span>{label}</span>
        </label>
        <span className="text-[11px] font-mono text-neutral-400">
          <strong className="text-amber-400">{tags.length}</strong> active tags
        </span>
      </div>

      {helperText && (
        <p className="text-[11px] text-neutral-400 leading-relaxed">
          {helperText}
        </p>
      )}

      {/* Unified Tag-Input Container */}
      <div
        onClick={handleContainerClick}
        className={`min-h-[72px] p-2.5 rounded-xl bg-neutral-900 border transition-all cursor-text flex flex-wrap gap-1.5 items-center ${
          isDuplicate
            ? 'border-rose-500 ring-1 ring-rose-500/30'
            : 'border-neutral-800 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/40'
        }`}
      >
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-mono bg-neutral-950 border border-neutral-700/80 text-neutral-200 group hover:border-amber-400/50 transition-all shadow-sm"
          >
            <span className="text-amber-400 font-bold select-none text-[11px]">#</span>
            <span className="max-w-[160px] truncate">{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="w-4 h-4 rounded hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 flex items-center justify-center transition-colors"
              title={`Remove "${tag}"`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={tags.length === 0 ? placeholder : 'Add keyword...'}
          className="flex-1 min-w-[130px] bg-transparent text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none py-1 px-1"
        />
      </div>

      {isDuplicate && (
        <p className="text-[11px] text-rose-400 animate-in fade-in">
          Keyword already added to list!
        </p>
      )}

      {/* Live Match Preview Strip */}
      {matchedMessagesCount !== undefined && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[11px]">
          <div className="flex items-center gap-2 text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong className="text-white font-semibold">Live Preview:</strong>{' '}
              {matchedMessagesCount} messages in your current feeds match these watchwords.
            </span>
          </div>
          {tags.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] text-neutral-400 hover:text-rose-400 transition-colors underline"
            >
              Clear All
            </button>
          )}
        </div>
      )}

      {/* Suggested Quick-Add Tags */}
      {availableSuggestions.length > 0 && (
        <div className="pt-1">
          <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-neutral-500 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Suggested Presets (click to add):</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {availableSuggestions.slice(0, 7).map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => addTag(sug)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-neutral-950/70 border border-neutral-800 text-neutral-400 hover:text-amber-300 hover:border-amber-500/40 hover:bg-neutral-900 transition-all active:scale-95"
              >
                <Plus className="w-2.5 h-2.5 text-amber-400" />
                <span>{sug}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

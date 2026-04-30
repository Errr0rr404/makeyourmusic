'use client';

import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS } from './useKeyboardShortcuts';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ open, onClose }: Props) {
  // Escape closes the dialog. Without this, power users who open it via the
  // `?` shortcut have no keyboard way out and the modal feels broken.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-[hsl(var(--accent))]" />
            </div>
            <h2 id="shortcuts-title" className="text-base font-bold text-white">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
            Control playback from anywhere on the page. Tip: press <Key label="?" /> to open this any time.
          </p>
          <ul className="space-y-2">
            {SHORTCUTS.map((s) => (
              <li
                key={s.description}
                className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))]/60 last:border-b-0"
              >
                <span className="text-sm text-white/85">{s.description}</span>
                <div className="flex gap-1">
                  {s.keys.map((k) => (
                    <Key key={k} label={k} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Key({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] text-xs font-mono font-semibold text-white shadow-sm">
      {label}
    </kbd>
  );
}

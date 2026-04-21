'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If true, the confirm button is red. */
  destructive?: boolean;
  /** If set, user must type this string exactly to enable the confirm button. */
  requireInput?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used inside <ConfirmProvider>');
  }
  return ctx;
}

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [input, setInput] = useState('');
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setInput('');
      setPending({ options, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      if (pending) {
        pending.resolve(result);
      }
      setPending(null);
      setInput('');
    },
    [pending]
  );

  // Keyboard: Escape cancels, Enter confirms (if enabled)
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Enter' && !pending.options.requireInput) {
        e.preventDefault();
        close(true);
      }
    };
    document.addEventListener('keydown', onKey);
    // Autofocus confirm unless waiting on an input match
    if (!pending.options.requireInput) {
      setTimeout(() => confirmButtonRef.current?.focus(), 0);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, close]);

  const canConfirm = pending
    ? !pending.options.requireInput || input === pending.options.requireInput
    : false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          onClick={() => close(false)}
        >
          <div
            className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 p-6">
              {pending.options.destructive && (
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 id="confirm-title" className="text-lg font-bold text-white mb-1">
                  {pending.options.title}
                </h2>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                  {pending.options.message}
                </p>
                {pending.options.requireInput && (
                  <div className="mt-4">
                    <label className="block text-xs text-[hsl(var(--muted-foreground))] mb-1.5">
                      Type{' '}
                      <code className="px-1 py-0.5 rounded bg-white/5 text-white font-mono">
                        {pending.options.requireInput}
                      </code>{' '}
                      to confirm
                    </label>
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      autoFocus
                      className="w-full h-10 px-3 rounded-lg bg-[hsl(var(--secondary))] text-white text-sm border border-[hsl(var(--border))] focus:border-red-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={() => close(false)}
                className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 bg-[hsl(var(--background))]/50 border-t border-[hsl(var(--border))]">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/5 transition-colors"
              >
                {pending.options.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => close(true)}
                disabled={!canConfirm}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  pending.options.destructive
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary))]/90'
                }`}
              >
                {pending.options.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

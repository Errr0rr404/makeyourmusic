import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info', duration = 3000) => {
    const id = `toast-${++toastCounter}`;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (duration > 0) {
      timeoutId = setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration, timeoutId }] }));
  },
  removeToast: (id) => set((s) => {
    const toast = s.toasts.find((t) => t.id === id);
    if (toast?.timeoutId) {
      clearTimeout(toast.timeoutId);
    }
    return { toasts: s.toasts.filter((t) => t.id !== id) };
  }),
}));

// Convenience helpers for use outside of React components
export const toast = {
  success: (msg: string) => useToastStore.getState().addToast(msg, 'success'),
  error: (msg: string) => useToastStore.getState().addToast(msg, 'error', 5000),
  info: (msg: string) => useToastStore.getState().addToast(msg, 'info'),
  warning: (msg: string) => useToastStore.getState().addToast(msg, 'warning', 4000),
};

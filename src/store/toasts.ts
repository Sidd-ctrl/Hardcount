import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: 'neutral' | 'success' | 'warning';
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }].slice(-3) }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) }));
    }, 4200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((entry) => entry.id !== id) })),
}));

export function notify(title: string, description?: string, tone: Toast['tone'] = 'neutral') {
  useToasts.getState().push({ title, description, tone });
}

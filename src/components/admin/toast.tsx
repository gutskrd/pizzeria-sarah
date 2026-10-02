'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertIcon, CheckIcon, CloseIcon } from '@/components/ui/icons';

type Toast = { id: number; tone: 'success' | 'error'; message: string; action?: { label: string; onClick: () => void } };
type ToastApi = {
  success: (message: string, action?: Toast['action']) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.tone === 'error' ? 9000 : toast.action ? 8000 : 4500);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, action) => push({ tone: 'success', message, action }),
      error: (message) => push({ tone: 'error', message }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end">
        <div role="status" aria-live="polite" className="contents">
          {toasts
            .filter((t) => t.tone === 'success')
            .map((t) => (
              <ToastView key={t.id} toast={t} onClose={() => dismiss(t.id)} />
            ))}
        </div>
        <div role="alert" aria-live="assertive" className="contents">
          {toasts
            .filter((t) => t.tone === 'error')
            .map((t) => (
              <ToastView key={t.id} toast={t} onClose={() => dismiss(t.id)} />
            ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const success = toast.tone === 'success';
  return (
    <div
      className={`reveal pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md px-4 py-3 shadow-lg ring-1 ${
        success ? 'bg-ink text-paper ring-black/10' : 'bg-tomato-dark text-white ring-black/10'
      }`}
    >
      <span className="mt-0.5 shrink-0">{success ? <CheckIcon size={20} /> : <AlertIcon size={20} />}</span>
      <p className="flex-1 text-[0.97rem] leading-snug">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onClose();
          }}
          className="shrink-0 rounded-sm px-2 py-1 font-semibold underline underline-offset-2"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" onClick={onClose} className="-mr-1 shrink-0 rounded-sm p-1 opacity-80 hover:opacity-100" aria-label="Melding sluiten">
        <CloseIcon size={18} />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

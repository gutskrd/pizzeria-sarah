'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Dialog } from './dialog';

type ConfirmOptions = {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
};

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={opts !== null}
        onClose={() => finish(false)}
        title={opts?.title ?? ''}
        size="sm"
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => finish(false)}>
              {opts?.cancelLabel ?? 'Annuleren'}
            </button>
            <button
              type="button"
              autoFocus
              className={`admin-btn ${opts?.tone === 'danger' ? 'admin-btn-danger' : 'admin-btn-primary'}`}
              onClick={() => finish(true)}
            >
              {opts?.confirmLabel ?? 'Bevestigen'}
            </button>
          </>
        }
      >
        <div className="text-[1.02rem] text-ink-soft">{opts?.message}</div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

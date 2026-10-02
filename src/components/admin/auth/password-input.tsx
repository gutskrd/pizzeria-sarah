'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icons';

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className="admin-input pr-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-ink"
        aria-label={visible ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
      </button>
    </div>
  );
}

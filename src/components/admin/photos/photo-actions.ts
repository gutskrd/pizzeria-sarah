'use client';

import { restoreImage, trashImage } from '@/app/admin/(panel)/fotos/actions';
import { useConfirm } from '@/components/admin/confirm';
import { useAdminAction } from '@/components/admin/use-admin-action';
import type { AdminImage } from '@/lib/admin/types';
import { createElement as h } from 'react';

/** Delete with a clear confirmation, protection for important photos, and an undo button. */
export function usePhotoDelete() {
  const confirm = useConfirm();
  const { run } = useAdminAction();

  return async (image: AdminImage): Promise<boolean> => {
    const critical = image.usages.filter((u) => u.critical);
    if (critical.length > 0) {
      await confirm({
        title: 'Deze foto is belangrijk',
        message: h(
          'div',
          { className: 'space-y-3' },
          h('p', null, `Deze foto is de ${critical.map((u) => u.label.toLowerCase()).join(' en de ')}. Zonder deze foto zou de website er niet goed uitzien.`),
          h('p', null, 'Wil je een andere foto? Gebruik dan ‘Vervangen’, of kies eerst een andere foto onder Website.'),
        ),
        confirmLabel: 'Begrepen',
        cancelLabel: 'Sluiten',
      });
      return false;
    }
    const other = image.usages.filter((u) => u.label !== 'Galerij' && u.label !== 'Uitgelicht op de homepage');
    const ok = await confirm({
      title: 'Foto verwijderen?',
      tone: 'danger',
      confirmLabel: 'Verwijderen',
      message: h(
        'div',
        { className: 'space-y-3' },
        h('p', null, 'Deze foto wordt verwijderd van de website. Weet je het zeker?'),
        image.usages.length > 0
          ? h(
              'div',
              { className: 'rounded-md bg-warning-soft p-3 text-[0.95rem] text-ink' },
              h('p', { className: 'font-semibold' }, 'Deze foto wordt momenteel gebruikt op de website:'),
              h('ul', { className: 'mt-1 list-disc pl-5' }, ...image.usages.map((u) => h('li', { key: u.label }, u.label))),
              other.length > 0 ? h('p', { className: 'mt-2' }, 'Op die plekken wordt dan geen foto meer getoond.') : null,
            )
          : null,
        h('p', { className: 'text-sm text-muted' }, 'Per ongeluk verwijderd? Je kunt de foto nog 30 dagen terugzetten vanuit de prullenbak.'),
      ),
    });
    if (!ok) return false;
    const result = await run(() => trashImage({ id: image.id }), {
      success: 'Foto verwijderd.',
      undo: { label: 'Ongedaan maken', onClick: () => void run(() => restoreImage({ id: image.id }), { success: 'Foto teruggezet.' }) },
    });
    return result.ok;
  };
}

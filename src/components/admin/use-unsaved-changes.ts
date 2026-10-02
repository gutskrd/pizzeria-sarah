'use client';

import { useEffect, useId } from 'react';

// One shared listener for all forms on the page, so the owner is asked only once.
const dirtyForms = new Set<string>();
let installed = false;

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener('beforeunload', (e) => {
    if (dirtyForms.size === 0) return;
    e.preventDefault();
    e.returnValue = '';
  });
  document.addEventListener(
    'click',
    (e) => {
      if (dirtyForms.size === 0) return;
      const link = (e.target as HTMLElement).closest('a');
      if (!link || link.target === '_blank' || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (window.confirm('Je hebt wijzigingen die nog niet zijn opgeslagen. Weet je zeker dat je deze pagina wilt verlaten?')) {
        dirtyForms.clear();
      } else {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
}

/** Warns before leaving the page (reload, close tab, navigation link) while there are unsaved changes. */
export function useUnsavedChanges(dirty: boolean) {
  const id = useId();
  useEffect(() => {
    install();
    if (dirty) dirtyForms.add(id);
    else dirtyForms.delete(id);
    return () => {
      dirtyForms.delete(id);
    };
  }, [dirty, id]);
}

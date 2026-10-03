'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Lets elements marked with data-reveal fade in as they scroll into view.
 * Without JavaScript, or with "reduce motion", everything is simply shown.
 * Uses a data attribute (not a class) so React re-renders never undo it.
 */
export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.site-theme');
    if (!root || !('IntersectionObserver' in window)) return;

    const show = (el: Element) => el.setAttribute('data-revealed', '');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const track = (elements: Iterable<HTMLElement>) => {
      const vh = window.innerHeight;
      for (const el of elements) {
        if (el.hasAttribute('data-revealed')) continue;
        // Whatever is already on screen stays visible, so nothing flickers.
        const rect = el.getBoundingClientRect();
        if (rect.top < vh && rect.bottom > 0) show(el);
        else observer.observe(el);
      }
    };
    track(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    root.classList.add('reveal-ready');

    // Content that appears later (search results, client navigation).
    const mutations = new MutationObserver((records) => {
      const added: HTMLElement[] = [];
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches('[data-reveal]')) added.push(node);
          added.push(...node.querySelectorAll<HTMLElement>('[data-reveal]'));
        });
      }
      if (added.length) track(added);
    });
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [pathname]);
  return null;
}

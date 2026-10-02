'use client';

/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { adminSearch, type SearchResult } from '@/app/admin/(panel)/zoeken-actions';
import {
  ArrowRightIcon,
  CalendarIcon,
  ExternalIcon,
  ImageIcon,
  KeyIcon,
  ListIcon,
  PlusIcon,
  ReturnIcon,
  SearchIcon,
  TagIcon,
  DoorIcon,
} from '@/components/ui/icons';
import { NAV_ITEMS } from './nav-config';

type Entry = {
  id: string;
  group: string;
  title: string;
  detail?: string;
  href: string;
  icon?: typeof SearchIcon;
  thumbUrl?: string;
  external?: boolean;
  keywords?: string;
};

const ACTIONS: Entry[] = [
  { id: 'a-foto', group: 'Acties', title: 'Foto toevoegen', href: '/admin/fotos?toevoegen=1', icon: PlusIcon, keywords: 'uploaden camera afbeelding' },
  { id: 'a-gerecht', group: 'Acties', title: 'Gerecht toevoegen', href: '/admin/menukaart?gerecht=nieuw', icon: ListIcon, keywords: 'menu pizza prijs' },
  {
    id: 'a-aanbieding',
    group: 'Acties',
    title: 'Aanbieding toevoegen',
    href: '/admin/aanbiedingen?aanbieding=nieuw',
    icon: TagIcon,
    keywords: 'actie korting',
  },
  {
    id: 'a-afwijking',
    group: 'Acties',
    title: 'Feestdag of sluiting toevoegen',
    href: '/admin/openingstijden?afwijking=nieuw',
    icon: CalendarIcon,
    keywords: 'vakantie gesloten openingstijden',
  },
  {
    id: 'a-sluiten',
    group: 'Acties',
    title: 'Vandaag sluiten',
    detail: 'Zet “Vandaag gesloten” op de website',
    href: '/admin?vandaag=sluiten',
    icon: DoorIcon,
    keywords: 'dicht ziek gesloten',
  },
  { id: 'a-wachtwoord', group: 'Acties', title: 'Wachtwoord wijzigen', href: '/admin/instellingen#wachtwoord', icon: KeyIcon, keywords: 'beveiliging' },
  { id: 'a-website', group: 'Acties', title: 'Website bekijken', detail: 'Opent in een nieuw tabblad', href: '/', icon: ExternalIcon, external: true },
];

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function useIsMac(): boolean {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    // Read once after mount; the server cannot know the platform.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);
  return isMac;
}

/** Jump anywhere, run an action or find a dish/message/photo. Opens with ⌘K / Ctrl+K. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState('');
  // Results are tied to the query that produced them, so stale results are never shown or opened.
  const [results, setResults] = useState<{ q: string; items: SearchResult[] }>({ q: '', items: [] });
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Debounced server search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminSearch({ q });
        setResults({ q, items: res.ok ? (res.data ?? []) : [] });
      } catch {
        setResults({ q, items: [] });
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => window.clearTimeout(id);
  }, [query]);

  const entries = useMemo<Entry[]>(() => {
    const q = normalize(query.trim());
    const pages: Entry[] = NAV_ITEMS.map((n) => ({ id: `p-${n.key}`, group: "Pagina's", title: n.label, detail: n.description, href: n.href, icon: n.icon }));
    const staticEntries = [...pages, ...ACTIONS].filter((e) => !q || normalize(`${e.title} ${e.detail ?? ''} ${e.keywords ?? ''}`).includes(q));
    const fresh = results.q === query.trim() ? results.items : [];
    const dynamic: Entry[] = q.length >= 2 ? fresh.map((r) => ({ ...r, icon: r.group === "Foto's" ? ImageIcon : undefined })) : [];
    return q ? [...dynamic, ...staticEntries] : staticEntries;
  }, [query, results]);

  const go = useCallback(
    (entry: Entry | undefined) => {
      if (!entry) return;
      onClose();
      setQuery('');
      if (entry.external) window.open(entry.href, '_blank', 'noopener');
      else router.push(entry.href);
    },
    [onClose, router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(entries.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(entries[active]);
    }
  };

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, listId]);

  const groups = entries.reduce<Array<{ group: string; items: Array<Entry & { index: number }> }>>((acc, entry, index) => {
    const last = acc.at(-1);
    if (last && last.group === entry.group) last.items.push({ ...entry, index });
    else acc.push({ group: entry.group, items: [{ ...entry, index }] });
    return acc;
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Zoeken en snel naar"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-0 h-[100dvh] max-h-none w-full max-w-none bg-white p-0 text-ink backdrop:bg-ink/40 sm:mx-auto sm:mt-[12vh] sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-xl sm:shadow-2xl"
    >
      {open && (
        <div className="flex h-full max-h-[100dvh] flex-col sm:h-auto sm:max-h-[70vh]">
          <div className="flex items-center gap-3 border-b border-line px-4">
            <SearchIcon size={20} className="shrink-0 text-muted" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={entries.length ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              aria-label="Zoek een pagina, actie, gerecht, bericht of foto"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Zoek een pagina, gerecht, bericht of foto…"
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
            />
            {searching && (
              <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-tomato" aria-label="Bezig met zoeken" />
            )}
            <button type="button" onClick={onClose} className="kbd shrink-0 cursor-pointer" aria-label="Sluiten">
              Esc
            </button>
          </div>

          <div id={listId} role="listbox" aria-label="Resultaten" className="min-h-0 flex-1 overflow-y-auto p-2">
            {entries.length === 0 ? (
              <p className="px-3 py-10 text-center text-muted">{searching ? 'Bezig met zoeken…' : `Niets gevonden voor “${query}”.`}</p>
            ) : (
              groups.map((g) => (
                <div key={g.group} role="group" aria-label={g.group} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{g.group}</p>
                  {g.items.map((entry) => {
                    const Icon = entry.icon ?? ArrowRightIcon;
                    const selected = entry.index === active;
                    return (
                      <div
                        key={entry.id}
                        id={`${listId}-${entry.index}`}
                        role="option"
                        aria-selected={selected}
                        onMouseMove={() => setActive(entry.index)}
                        onClick={() => go(entry)}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${selected ? 'bg-tomato-soft' : ''}`}
                      >
                        {entry.thumbUrl ? (
                          <img src={entry.thumbUrl} alt="" className="size-9 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span
                            className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-white text-tomato' : 'bg-paper text-ink-soft'}`}
                          >
                            <Icon size={18} />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{entry.title}</span>
                          {entry.detail && <span className="block truncate text-sm text-muted">{entry.detail}</span>}
                        </span>
                        {selected && <ReturnIcon size={16} className="hidden shrink-0 text-muted sm:block" />}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="hidden items-center gap-4 border-t border-line bg-paper/50 px-4 py-2 text-xs text-muted sm:flex">
            <span className="flex items-center gap-1">
              <span className="kbd">↑</span>
              <span className="kbd">↓</span> kiezen
            </span>
            <span className="flex items-center gap-1">
              <span className="kbd">Enter</span> openen
            </span>
            <span className="flex items-center gap-1">
              <span className="kbd">Esc</span> sluiten
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
}

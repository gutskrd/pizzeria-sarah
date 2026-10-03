'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { bulkMessageAction, emptySpam, markAllMessagesRead } from '@/app/admin/(panel)/berichten/actions';
import { useConfirm } from '@/components/admin/confirm';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { AlertIcon, ArchiveIcon, CheckIcon, CloseIcon, InboxIcon, MailIcon, SearchIcon, TrashIcon } from '@/components/ui/icons';
import type { MessageStatus } from '@/lib/db/schema';
import { StatusBadge } from './status-badge';

export type ListMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: MessageStatus;
  spamReasons: string;
  createdAt: string;
  ago: string;
  when: string;
};

export function MessageList({ messages, unread, query, filter }: { messages: ListMessage[]; unread: number; query: string; filter: string }) {
  const spamView = filter === 'spam';
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState(query);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { run } = useAdminAction();
  const confirm = useConfirm();

  // Debounced search in the URL (shareable, survives refresh).
  useEffect(() => {
    if (q === query) return;
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (q.trim()) next.set('zoek', q.trim());
      else next.delete('zoek');
      router.replace(`${pathname}${next.toString() ? `?${next}` : ''}`);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q, query, params, pathname, router]);

  const ids = [...selected].filter((id) => messages.some((m) => m.id === id));
  const allSelected = messages.length > 0 && ids.length === messages.length;
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = async (action: 'read' | 'new' | 'archived' | 'delete' | 'notspam') => {
    if (action === 'delete') {
      const ok = await confirm({
        title: ids.length === 1 ? 'Bericht verwijderen?' : `${ids.length} berichten verwijderen?`,
        message: 'Verwijderde berichten kunnen niet worden teruggezet.',
        confirmLabel: 'Verwijderen',
        tone: 'danger',
      });
      if (!ok) return;
    }
    const result = await run(() => bulkMessageAction({ ids, action }));
    if (result.ok) setSelected(new Set());
  };

  return (
    <>
      {spamView && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-[#ecd9a8] bg-warning-soft p-4 sm:flex-row sm:items-center">
          <AlertIcon size={22} className="shrink-0 text-warning" />
          <p className="flex-1 text-[0.95rem] text-ink-soft">
            Hier komen berichten die op reclame of spam lijken. Je krijgt er geen e-mail van, en ze worden na 30 dagen vanzelf verwijderd. Staat er toch een
            echt bericht tussen? Kies <strong>Geen spam</strong>.
          </p>
          {messages.length > 0 && (
            <button
              type="button"
              className="admin-btn admin-btn-secondary shrink-0"
              onClick={async () => {
                if (
                  await confirm({
                    title: 'Spam leegmaken?',
                    message: 'Alle berichten in Spam worden definitief verwijderd.',
                    confirmLabel: 'Leegmaken',
                    tone: 'danger',
                  })
                )
                  await run(() => emptySpam({}));
              }}
            >
              <TrashIcon size={18} /> Spam leegmaken
            </button>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">Zoek in berichten</span>
          <SearchIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek op naam, e-mailadres of tekst"
            className="admin-input pl-10"
          />
        </label>
        {unread > 0 && (
          <button type="button" className="admin-btn admin-btn-secondary shrink-0" onClick={() => run(() => markAllMessagesRead({}))}>
            <CheckIcon size={18} /> Alles als gelezen markeren
          </button>
        )}
      </div>

      {ids.length > 0 && (
        <div
          className="reveal sticky top-[4.25rem] z-10 mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-ink px-3 py-2 text-paper shadow-lg lg:top-[5.25rem]"
          role="toolbar"
          aria-label="Acties voor geselecteerde berichten"
        >
          <span className="mr-auto px-1 text-sm font-semibold">{ids.length} geselecteerd</span>
          {spamView ? (
            <button type="button" className="admin-btn admin-btn-sm text-paper hover:bg-white/10" onClick={() => bulk('notspam')}>
              <InboxIcon size={16} /> Geen spam
            </button>
          ) : (
            <>
              <button type="button" className="admin-btn admin-btn-sm text-paper hover:bg-white/10" onClick={() => bulk('read')}>
                <CheckIcon size={16} /> Gelezen
              </button>
              <button type="button" className="admin-btn admin-btn-sm text-paper hover:bg-white/10" onClick={() => bulk('new')}>
                <MailIcon size={16} /> Ongelezen
              </button>
              <button type="button" className="admin-btn admin-btn-sm text-paper hover:bg-white/10" onClick={() => bulk('archived')}>
                <ArchiveIcon size={16} /> Archiveren
              </button>
            </>
          )}
          <button type="button" className="admin-btn admin-btn-sm text-paper hover:bg-white/10" onClick={() => bulk('delete')}>
            <TrashIcon size={16} /> Verwijderen
          </button>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md hover:bg-white/10"
            onClick={() => setSelected(new Set())}
            aria-label="Selectie opheffen"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <p className="admin-card px-5 py-10 text-center text-muted">{query ? `Geen berichten gevonden voor “${query}”.` : 'Geen berichten in deze map.'}</p>
      ) : (
        <div className="admin-card overflow-hidden">
          <label className="flex min-h-11 cursor-pointer items-center gap-3 border-b border-line bg-paper/40 px-4 text-sm text-muted sm:px-5">
            <input
              type="checkbox"
              className="size-5 accent-tomato"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(messages.map((m) => m.id)))}
            />
            Alles selecteren
          </label>
          <ul className="divide-y divide-line">
            {messages.map((m) => {
              const isNew = m.status === 'new';
              const checked = selected.has(m.id);
              return (
                <li key={m.id} className={`flex items-stretch ${checked ? 'bg-tomato-soft/50' : isNew ? 'bg-tomato-soft/25' : ''}`}>
                  <label className="flex shrink-0 cursor-pointer items-start px-4 pt-4 sm:px-5">
                    <input
                      type="checkbox"
                      className="size-5 accent-tomato"
                      checked={checked}
                      onChange={() => toggle(m.id)}
                      aria-label={`Selecteer bericht van ${m.name}: ${m.subject}`}
                    />
                  </label>
                  <Link href={`/admin/berichten/${m.id}`} className="flex min-w-0 flex-1 gap-3 py-3.5 pr-4 hover:bg-paper/50 sm:pr-5">
                    <span
                      className="relative mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-paper text-sm font-semibold text-ink-soft"
                      aria-hidden="true"
                    >
                      {m.name.trim()[0]?.toUpperCase()}
                      {isNew && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-tomato ring-2 ring-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={`truncate ${isNew ? 'font-bold' : 'font-medium'}`}>{m.name}</span>
                        <time dateTime={m.createdAt} title={m.when} className="shrink-0 text-sm text-muted">
                          {m.ago}
                        </time>
                      </span>
                      <span className={`block truncate ${isNew ? 'font-semibold' : ''}`}>{m.subject}</span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-muted">{m.body}</span>
                        <StatusBadge status={m.status} />
                      </span>
                      {m.status === 'spam' && m.spamReasons && <span className="mt-1 block text-xs text-warning">Waarom: {m.spamReasons}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

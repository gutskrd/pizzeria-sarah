'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteMessage, replyToMessage, setMessageStatus } from '@/app/admin/(panel)/berichten/actions';
import { useConfirm } from '@/components/admin/confirm';
import { Field } from '@/components/admin/fields';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { useUnsavedChanges } from '@/components/admin/use-unsaved-changes';
import { ArchiveIcon, ArrowLeftIcon, MailIcon, ReplyIcon, TrashIcon } from '@/components/ui/icons';
import type { MessageStatus } from '@/lib/db/schema';
import { StatusBadge } from './status-badge';

type Props = {
  message: { id: string; name: string; email: string; subject: string; body: string; status: MessageStatus; createdAt: string };
  replies: Array<{ id: string; body: string; createdAt: string }>;
  businessName: string;
};

const fmt = new Intl.DateTimeFormat('nl-NL', {
  timeZone: 'Europe/Amsterdam',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function MessageView({ message, replies, businessName }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const { run, fieldErrors } = useAdminAction();
  const [replyOpen, setReplyOpen] = useState(false);
  const [body, setBody] = useState(`Beste ${message.name.split(' ')[0]},\n\n`);
  const [sending, setSending] = useState(false);
  useUnsavedChanges(replyOpen && body.trim().length > `Beste ${message.name.split(' ')[0]},`.length);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const result = await run(() => replyToMessage({ id: message.id, body }));
    setSending(false);
    if (result.ok) {
      setReplyOpen(false);
      setBody('');
    }
  };

  return (
    <>
      <Link href="/admin/berichten" className="admin-btn admin-btn-ghost admin-btn-sm -ml-2 mb-3">
        <ArrowLeftIcon size={18} /> Alle berichten
      </Link>

      <article className="admin-card overflow-hidden">
        <header className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="min-w-0 font-display text-2xl leading-tight sm:text-3xl">{message.subject}</h1>
            <StatusBadge status={message.status} />
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-[0.97rem] sm:grid-cols-[auto_1fr]">
            <dt className="text-muted">Van</dt>
            <dd className="font-medium">{message.name}</dd>
            <dt className="text-muted">E-mailadres</dt>
            <dd>
              <a href={`mailto:${message.email}`} className="break-all underline underline-offset-2 hover:text-tomato">
                {message.email}
              </a>
            </dd>
            <dt className="text-muted">Datum</dt>
            <dd>{fmt.format(new Date(message.createdAt))}</dd>
          </dl>
        </header>
        <div className="whitespace-pre-wrap break-words px-5 py-5 text-[1.03rem] leading-relaxed">{message.body}</div>
        <div className="flex flex-wrap gap-2 border-t border-line bg-paper/40 px-4 py-3 sm:px-5">
          {!replyOpen && (
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setReplyOpen(true)}>
              <ReplyIcon size={18} /> Beantwoorden
            </button>
          )}
          {message.status !== 'archived' ? (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={async () => {
                if ((await run(() => setMessageStatus({ id: message.id, status: 'archived' }))).ok) router.push('/admin/berichten');
              }}
            >
              <ArchiveIcon size={18} /> Archiveren
            </button>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn-secondary"
              onClick={() => run(() => setMessageStatus({ id: message.id, status: 'read' }), { success: 'Bericht teruggezet naar de inbox.' })}
            >
              Terug naar inbox
            </button>
          )}
          {message.status !== 'new' && message.status !== 'archived' && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={async () => {
                if ((await run(() => setMessageStatus({ id: message.id, status: 'new' }))).ok) router.push('/admin/berichten');
              }}
            >
              <MailIcon size={18} /> Markeer als ongelezen
            </button>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-ghost sm:ml-auto"
            onClick={async () => {
              const ok = await confirm({
                title: 'Bericht verwijderen?',
                message: 'Dit bericht wordt definitief verwijderd.',
                confirmLabel: 'Verwijderen',
                tone: 'danger',
              });
              if (ok && (await run(() => deleteMessage({ id: message.id }))).ok) router.push('/admin/berichten');
            }}
          >
            <TrashIcon size={18} /> Verwijderen
          </button>
        </div>
      </article>

      {replies.length > 0 && (
        <section className="mt-6" aria-labelledby="antwoorden">
          <h2 id="antwoorden" className="mb-3 font-display text-2xl">
            Jouw {replies.length === 1 ? 'antwoord' : 'antwoorden'}
          </h2>
          <ul className="space-y-3">
            {replies.map((r) => (
              <li key={r.id} className="admin-card border-l-4 border-l-basil p-4">
                <p className="text-sm text-muted">Verstuurd op {fmt.format(new Date(r.createdAt))}</p>
                <p className="mt-2 whitespace-pre-wrap break-words">{r.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {replyOpen && (
        <form onSubmit={send} className="admin-card mt-6 p-5" aria-labelledby="antwoord-titel">
          <h2 id="antwoord-titel" className="font-display text-2xl">
            Antwoord aan {message.name}
          </h2>
          <p className="mb-4 mt-1 text-[0.95rem] text-muted">
            Wordt per e-mail verstuurd naar {message.email}, met ‘Met vriendelijke groet, {businessName}’ eronder. Reageert de klant, dan komt dat in je eigen
            mailbox.
          </p>
          <Field label="Je antwoord" htmlFor="antwoord" error={fieldErrors.body}>
            <textarea
              id="antwoord"
              className="admin-input min-h-48"
              value={body}
              autoFocus
              maxLength={10000}
              onChange={(e) => setBody(e.target.value)}
              aria-invalid={!!fieldErrors.body}
            />
          </Field>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setReplyOpen(false)}>
              Annuleren
            </button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={sending}>
              {sending ? 'Bezig met versturen…' : 'Antwoord versturen'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

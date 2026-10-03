import type { MessageStatus } from '@/lib/db/schema';

export const STATUS_LABELS: Record<MessageStatus, string> = { new: 'Nieuw', read: 'Gelezen', replied: 'Beantwoord', archived: 'Gearchiveerd', spam: 'Spam' };

const STYLES: Record<MessageStatus, string> = {
  new: 'bg-tomato text-white',
  read: 'bg-paper text-ink-soft',
  replied: 'bg-basil-soft text-basil',
  archived: 'bg-paper text-muted',
  spam: 'bg-warning-soft text-warning',
};

export function StatusBadge({ status }: { status: MessageStatus }) {
  return <span className={`admin-badge ${STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}

/** Live admin status shared by the server (computation) and the client (badges, bell). */

export type NavKey =
  'dashboard' | 'website' | 'menukaart' | 'fotos' | 'openingstijden' | 'berichten' | 'aanbiedingen' | 'activiteit' | 'apparaten' | 'instellingen';

export type BadgeTone = 'danger' | 'warning' | 'info' | 'neutral';

/** A notification bubble in the navigation. `count: null` renders a dot. */
export type NavBadge = { count: number | null; tone: BadgeTone; label: string };

export type NotificationKind = 'message' | 'security' | 'hours' | 'offer' | 'photos' | 'menu' | 'website' | 'email';

export type AdminNotification = {
  id: string;
  kind: NotificationKind;
  tone: 'danger' | 'warning' | 'info';
  title: string;
  detail?: string;
  href: string;
  /** ISO timestamp when the notification is about a moment in time. */
  at?: string;
  /** True for things that happened since the owner last looked. */
  isNew?: boolean;
};

export type AdminStatus = {
  unread: number;
  badges: Partial<Record<NavKey, NavBadge>>;
  notifications: AdminNotification[];
  /** Newest unread message, used for the "new message" toast while the admin is open. */
  newestUnread: { id: string; name: string; subject: string } | null;
  generatedAt: string;
};

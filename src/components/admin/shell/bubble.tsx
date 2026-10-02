import type { NavBadge } from '@/lib/admin/status-types';

const TONES: Record<NavBadge['tone'], string> = {
  danger: 'bg-tomato text-white',
  warning: 'bg-[#f0b13c] text-ink',
  info: 'bg-[#2b6c8f] text-white',
  neutral: 'bg-[#e9e2d7] text-ink-soft',
};

/**
 * Notification bubble. With a number it shows the count (99+ max); without one
 * it is a small dot. `overlay` pins it to the top-right corner of an icon.
 */
export function Bubble({ badge, overlay = false, className = '' }: { badge: NavBadge | undefined | null; overlay?: boolean; className?: string }) {
  if (!badge) return null;
  const position = overlay ? 'absolute -right-1.5 -top-1.5 ring-2 ring-white' : '';
  if (badge.count === null) {
    return (
      <span
        className={`bubble-pop inline-block size-2.5 shrink-0 rounded-full ${TONES[badge.tone]} ${overlay ? 'absolute -right-0.5 -top-0.5 ring-2 ring-white' : ''} ${className}`}
        title={badge.label}
      >
        <span className="sr-only">{badge.label}</span>
      </span>
    );
  }
  return (
    <span
      key={badge.count}
      className={`bubble-pop inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[0.7rem] font-bold leading-none tabular-nums ${TONES[badge.tone]} ${position} ${className}`}
      title={badge.label}
    >
      <span aria-hidden="true">{badge.count > 99 ? '99+' : badge.count}</span>
      <span className="sr-only">{badge.label}</span>
    </span>
  );
}

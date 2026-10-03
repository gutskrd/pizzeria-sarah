/**
 * Simple drawn icons for the menu categories, chosen from the category name.
 * Decorative only (the category name is always written next to it).
 */
type Kind = 'pizza' | 'salade' | 'pasta' | 'stokbrood' | 'pita' | 'doner' | 'vega' | 'extra' | 'schotel';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function foodKind(name: string): Kind {
  const n = normalize(name);
  if (/pizza/.test(n)) return 'pizza';
  if (/salade|insalata/.test(n)) return 'salade';
  if (/pasta|spaghetti/.test(n)) return 'pasta';
  if (/stokbrood|baguette/.test(n)) return 'stokbrood';
  if (/doner|kebab/.test(n)) return 'doner';
  if (/pita|broodje/.test(n)) return 'pita';
  if (/vegetar|vega/.test(n)) return 'vega';
  if (/extra|saus|bijgerecht/.test(n)) return 'extra';
  return 'schotel';
}

const PATHS: Record<Kind, React.ReactNode> = {
  pizza: (
    <>
      <path d="M12 3 3.6 19.2c5.4 2.4 11.4 2.4 16.8 0Z" />
      <path d="M5 16.6c4.6 1.9 9.4 1.9 14 0" />
      <circle cx="10.2" cy="12.4" r="1.2" />
      <circle cx="13.8" cy="15.2" r="1.2" />
      <circle cx="12.4" cy="8.8" r="0.9" />
    </>
  ),
  salade: (
    <>
      <path d="M3 12h18a9 7.5 0 0 1-18 0Z" />
      <path d="M7.5 12c-.8-2.6.6-5.4 3.6-5.9.2 2.4-1 4.6-3.1 5.9" />
      <path d="M12 12c.4-3.2 2.8-5.4 6-5.2-.4 2.8-2.6 4.8-5.4 5.2" />
      <path d="M10.5 12c.2-1.4 1-2.6 2.2-3.2" />
    </>
  ),
  pasta: (
    <>
      <path d="M3 12h18a9 7.5 0 0 1-18 0Z" />
      <path d="M6 12c.9-1.6 2.4-1.6 3.3 0s2.4 1.6 3.3 0 2.4-1.6 3.3 0 2.1 1.4 2.6.6" />
      <path d="M16.5 2.5v6.3M14.6 2.5v3.3a1.9 1.9 0 0 0 3.8 0V2.5" />
    </>
  ),
  stokbrood: (
    <>
      <path d="M4.6 19.4c-1.8-1.8.3-6 4.8-10.5s8.7-6.6 10.5-4.8-.3 6-4.8 10.5-8.7 6.6-10.5 4.8Z" />
      <path d="m8.6 13.2 2.2 2.2M11.6 10.2l2.2 2.2M14.6 7.2l2.2 2.2" />
    </>
  ),
  pita: (
    <>
      <path d="M3 15a9 8 0 0 1 18 0Z" />
      <path d="M4.6 15c1.4-1.3 2.8-1.3 4.2 0s2.8 1.3 4.2 0 2.8-1.3 4.2 0 2 1 2.6.4" />
      <path d="M8 10.6c1-.8 2-.8 3 0M13 9.6c1-.8 2-.8 3 0" />
    </>
  ),
  doner: (
    <>
      <path d="M12 2v20" />
      <path d="M7.5 5h9l-1.8 13H9.3Z" />
      <path d="M8.3 9h7.4M8.9 13h6.2" />
      <path d="M8.5 22h7" />
    </>
  ),
  vega: (
    <>
      <path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z" />
      <path d="m5 19 9-9" />
      <path d="M9.5 14.5h3M12.5 11.5V9" />
    </>
  ),
  extra: (
    <>
      <path d="M10 2.5h4v2.8l2 3V20a1.8 1.8 0 0 1-1.8 1.8H9.8A1.8 1.8 0 0 1 8 20V8.3l2-3Z" />
      <path d="M8 12.5h8M8 16.5h8" />
    </>
  ),
  schotel: (
    <>
      <circle cx="12.5" cy="13" r="6" />
      <circle cx="12.5" cy="13" r="3.4" />
      <path d="M3 3.5v5a1.5 1.5 0 0 0 3 0v-5M4.5 8.5V21" />
      <path d="M21.5 3.5c-1.6 1-2.3 3.2-2.3 6.4h2.3V21" />
    </>
  ),
};

export function FoodIcon({ name, size = 28, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[foodKind(name)]}
    </svg>
  );
}

import { ActivityIcon, ClockIcon, DevicesIcon, GlobeIcon, HomeIcon, ImageIcon, ListIcon, MailIcon, SettingsIcon, TagIcon } from '@/components/ui/icons';
import type { NavKey } from '@/lib/admin/status-types';

export type NavItem = { key: NavKey; href: string; label: string; icon: typeof HomeIcon; description: string };

export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Dagelijks',
    items: [
      { key: 'dashboard', href: '/admin', label: 'Dashboard', icon: HomeIcon, description: 'Overzicht van vandaag' },
      { key: 'berichten', href: '/admin/berichten', label: 'Berichten', icon: MailIcon, description: 'Berichten via het contactformulier' },
      { key: 'openingstijden', href: '/admin/openingstijden', label: 'Openingstijden', icon: ClockIcon, description: 'Vaste tijden, feestdagen en sluiting' },
    ],
  },
  {
    label: 'Inhoud',
    items: [
      { key: 'website', href: '/admin/website', label: 'Website', icon: GlobeIcon, description: 'Teksten, hoofdfoto en Google' },
      { key: 'menukaart', href: '/admin/menukaart', label: 'Menukaart', icon: ListIcon, description: 'Categorieën, gerechten en prijzen' },
      { key: 'fotos', href: '/admin/fotos', label: "Foto's", icon: ImageIcon, description: "Alle foto's van de website" },
      { key: 'aanbiedingen', href: '/admin/aanbiedingen', label: 'Aanbiedingen', icon: TagIcon, description: 'Acties met een begin- en einddatum' },
    ],
  },
  {
    label: 'Beheer',
    items: [
      { key: 'activiteit', href: '/admin/activiteit', label: 'Activiteit', icon: ActivityIcon, description: 'Alle wijzigingen aan de website' },
      { key: 'apparaten', href: '/admin/apparaten', label: 'Ingelogde apparaten', icon: DevicesIcon, description: 'Sessies en beveiliging' },
      { key: 'instellingen', href: '/admin/instellingen', label: 'Instellingen', icon: SettingsIcon, description: 'Gegevens, meldingen en wachtwoord' },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** The five destinations in the phone tab bar. */
export const TAB_KEYS: NavKey[] = ['dashboard', 'berichten', 'menukaart', 'fotos', 'openingstijden'];

export function isActive(href: string, pathname: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`);
}

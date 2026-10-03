/**
 * The website is one long page; each menu item scrolls to its section on the
 * homepage (from another page it first goes to the homepage).
 */
export const NAV_ITEMS = [
  { id: 'home', href: '/', label: 'Home' },
  { id: 'menukaart', href: '/#menukaart', label: 'Menukaart' },
  { id: 'over-ons', href: '/#over-ons', label: 'Over ons' },
  { id: 'galerij', href: '/#galerij', label: 'Galerij' },
  { id: 'contact', href: '/#contact', label: 'Contact' },
] as const;

export type SectionId = (typeof NAV_ITEMS)[number]['id'];

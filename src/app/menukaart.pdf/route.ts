import { cached } from '@/lib/content/cache';
import { getMenu, getSchedule, getSettings } from '@/lib/content/queries';
import { siteUrl } from '@/lib/env';
import { buildMenuPdf } from '@/lib/menu-pdf';

/** The menu as a PDF, made from the menu in the admin (always up to date). */
export async function GET() {
  const pdf = await cached('menu-pdf', async () => {
    const [settings, menu, schedule] = await Promise.all([getSettings(), getMenu(), getSchedule()]);
    if (menu.length === 0) return null;
    return buildMenuPdf(settings, menu, schedule, new URL(siteUrl()).host);
  });
  if (!pdf) return new Response('Er staat nog geen menukaart online.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="menukaart-pizzeria-sarah.pdf"',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

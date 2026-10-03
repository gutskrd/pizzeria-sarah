import { getMenu, getSchedule, getSettings } from '@/lib/content/queries';
import { siteUrl } from '@/lib/env';
import { formatPrice } from '@/lib/format';
import { upcomingExceptions, weekRows } from '@/lib/opening-hours';

/**
 * /llms.txt: the essentials of the restaurant in plain text (Markdown), for
 * AI assistants and other tools that answer questions like "what does a
 * pizza cost at Pizzeria Sarah?". Built from the same data as the website.
 */
export async function GET() {
  const [settings, schedule, menu] = await Promise.all([getSettings(), getSchedule(), getMenu()]);
  const base = siteUrl();
  const now = new Date();
  const lines: string[] = [];

  lines.push(`# ${settings.businessName}`, '');
  lines.push(`> ${settings.heroText}`, '');
  lines.push(`${settings.introText}`, '');
  lines.push('## Contact');
  lines.push(`- Adres: ${settings.fullAddress}`);
  lines.push(`- Telefoon (bestellen en reserveren): ${settings.phoneDisplay}`);
  lines.push(`- E-mail: ${settings.email}`);
  if (settings.routeUrl) lines.push(`- Route: ${settings.routeUrl}`);
  lines.push(`- Website: ${base}/`, '');

  lines.push('## Openingstijden');
  for (const row of weekRows(schedule, now)) lines.push(`- ${row.name}: ${row.hours}${row.note ? ` (${row.note})` : ''}`);
  const exceptions = upcomingExceptions(schedule, now);
  if (exceptions.length) {
    lines.push('', 'Afwijkende openingstijden:');
    for (const e of exceptions) lines.push(`- ${e.when} (${e.label}): ${e.hours}`);
  }
  lines.push('');

  if (menu.length) {
    lines.push(`## Menukaart`, '', `Volledige menukaart: ${base}/menukaart`, '');
    for (const category of menu) {
      lines.push(`### ${category.name}`);
      if (category.description) lines.push(category.description);
      for (const item of category.items) {
        const price = item.variants.length
          ? item.variants.map((v) => `${v.label} ${formatPrice(v.priceCents)}`).join(', ')
          : item.priceCents !== null
            ? formatPrice(item.priceCents)
            : 'prijs op aanvraag';
        const name = item.number ? `${item.name} (nr. ${item.number})` : item.name;
        lines.push(`- ${name}: ${price}${item.description ? ` (${item.description})` : ''}`);
      }
      lines.push('');
    }
    lines.push(settings.allergenText, '');
  }

  lines.push('## Pagina’s');
  lines.push(`- [Menukaart](${base}/menukaart)`, `- [Over ons](${base}/over-ons)`, `- [Contact en route](${base}/contact)`, `- [Foto’s](${base}/galerij)`);

  return new Response(lines.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}

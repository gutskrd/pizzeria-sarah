import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import type { PublicMenuCategory, SiteSettings } from '@/lib/content/queries';
import { formatPrice } from '@/lib/format';
import { weekRows, type Schedule } from '@/lib/opening-hours';

/**
 * The menu as a printable A4 PDF, built from the menu in the admin, so it is
 * always up to date. Real text (searchable, sharp at any size), in the colours
 * of the printed folder: black, red and white.
 */

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 36;
const GAP = 22;
const COL_W = (A4.w - MARGIN * 2 - GAP) / 2;

const RED = rgb(0.847, 0.122, 0.149); // #d81f26
const BLACK = rgb(0.06, 0.06, 0.06);
const INK = rgb(0.09, 0.09, 0.09);
const GREY = rgb(0.38, 0.38, 0.38);
const LINE = rgb(0.86, 0.84, 0.81);
const WHITE = rgb(1, 1, 1);

// The standard PDF fonts can only write the Western European character set.
const EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
function clean(text: string): string {
  return Array.from(text.replace(/[  ]/g, ' '))
    .filter((ch) => {
      const c = ch.codePointAt(0)!;
      return (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || EXTRA.includes(ch);
    })
    .join('');
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function priceText(item: PublicMenuCategory['items'][number]): string {
  if (item.priceCents !== null) return clean(formatPrice(item.priceCents));
  return '';
}

/** "Maandag gesloten · dinsdag t/m zondag 16:00 – 20:00" */
function hoursLine(schedule: Schedule): string {
  const rows = weekRows(schedule, new Date());
  const groups: Array<{ from: string; to: string; hours: string }> = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last.hours === row.hours) last.to = row.name;
    else groups.push({ from: row.name, to: row.name, hours: row.hours });
  }
  return groups
    .map((g, i) => {
      const days = g.from === g.to ? g.from : `${g.from} t/m ${g.to.toLowerCase()}`;
      const label = i === 0 ? days : days.toLowerCase();
      return `${label} ${g.hours === 'Gesloten' ? 'gesloten' : g.hours}`;
    })
    .join(' · ');
}

export async function buildMenuPdf(settings: SiteSettings, menu: PublicMenuCategory[], schedule: Schedule, siteHost: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Menukaart ${settings.businessName}`);
  doc.setAuthor(settings.businessName);
  doc.setSubject(`Menukaart van ${settings.businessName}, ${settings.city}`);
  doc.setKeywords(['menukaart', settings.businessName, settings.city, ...menu.map((c) => c.name)].map(clean));
  doc.setLanguage('nl-NL');
  doc.setCreator(settings.businessName);

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const oblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let col = 0;
  let y = 0;
  let top = 0;

  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    pages.push(page);
    col = 0;
    if (pages.length === 1) {
      // Header: black band like the folder.
      const hH = 118;
      page.drawRectangle({ x: 0, y: A4.h - hH, width: A4.w, height: hH, color: BLACK });
      page.drawRectangle({ x: 0, y: A4.h - hH - 4, width: A4.w, height: 4, color: RED });
      page.drawText(clean(settings.businessName.toUpperCase()), { x: MARGIN, y: A4.h - 58, size: 30, font: bold, color: WHITE });
      page.drawText(clean(settings.tagline.toUpperCase()), { x: MARGIN, y: A4.h - 78, size: 9, font: bold, color: rgb(0.75, 0.75, 0.75) });
      page.drawText(clean(settings.fullAddress), { x: MARGIN, y: A4.h - 98, size: 9.5, font: regular, color: WHITE });
      const phone = clean(`Bestellen: ${settings.phoneDisplay}`);
      page.drawText(phone, { x: A4.w - MARGIN - bold.widthOfTextAtSize(phone, 16), y: A4.h - 56, size: 16, font: bold, color: RED });
      const hours = wrap(hoursLine(schedule), regular, 9, 230);
      hours.forEach((line, i) =>
        page.drawText(line, { x: A4.w - MARGIN - regular.widthOfTextAtSize(line, 9), y: A4.h - 78 - i * 12, size: 9, font: regular, color: WHITE }),
      );
      top = A4.h - hH - 30;
    } else {
      page.drawRectangle({ x: 0, y: A4.h - 6, width: A4.w, height: 6, color: RED });
      top = A4.h - MARGIN;
    }
    y = top;
  };

  const bottom = MARGIN + 24;
  const x = () => MARGIN + col * (COL_W + GAP);
  const ensure = (height: number) => {
    if (y - height >= bottom) return;
    if (col === 0) {
      col = 1;
      y = top;
    } else newPage();
  };

  newPage();

  for (const category of menu) {
    // Keep the banner together with its first dish.
    const first = category.items[0];
    const firstH = first ? 16 + (first.description ? wrap(first.description, oblique, 8.5, COL_W - 22).length * 10.5 : 0) : 0;
    ensure(26 + firstH);
    // Red banner with pointed ends, like on the printed menu.
    const bx = x();
    const bH = 20;
    page.drawRectangle({ x: bx + 5.5, y: y - bH, width: COL_W - 11, height: bH, color: RED });
    page.drawSvgPath(`M 6 0 L 0 ${bH / 2} L 6 ${bH} Z`, { x: bx, y: y, color: RED });
    page.drawSvgPath(`M 0 0 L 6 ${bH / 2} L 0 ${bH} Z`, { x: bx + COL_W - 6, y: y, color: RED });
    const name = clean(category.name.toUpperCase());
    page.drawText(name, { x: bx + (COL_W - bold.widthOfTextAtSize(name, 11.5)) / 2, y: y - 14.2, size: 11.5, font: bold, color: WHITE });
    y -= bH + 9;

    for (const item of category.items) {
      const desc = item.description ? wrap(item.description, oblique, 8.5, COL_W - 22) : [];
      const variants = item.variants.length
        ? wrap(item.variants.map((v) => `${v.label} ${formatPrice(v.priceCents)}`).join(' · '), regular, 8.5, COL_W - 22)
        : [];
      const h = 13 + (desc.length + variants.length) * 10.5 + 5;
      ensure(h);
      const ix = x();
      if (item.number) page.drawText(clean(item.number), { x: ix, y: y - 10, size: 8.5, font: regular, color: GREY });
      const price = priceText(item);
      const priceW = price ? bold.widthOfTextAtSize(price, 10) : 0;
      const nameLines = wrap(item.name, bold, 10, COL_W - 22 - priceW - 8);
      page.drawText(nameLines[0] ?? '', { x: ix + 22, y: y - 10, size: 10, font: bold, color: INK });
      if (price) page.drawText(price, { x: ix + COL_W - priceW, y: y - 10, size: 10, font: bold, color: INK });
      y -= 13;
      for (const line of [...nameLines.slice(1)]) {
        page.drawText(line, { x: ix + 22, y: y - 10, size: 10, font: bold, color: INK });
        y -= 12;
      }
      for (const line of desc) {
        page.drawText(line, { x: ix + 22, y: y - 8.5, size: 8.5, font: oblique, color: RED });
        y -= 10.5;
      }
      for (const line of variants) {
        page.drawText(line, { x: ix + 22, y: y - 8.5, size: 8.5, font: regular, color: GREY });
        y -= 10.5;
      }
      y -= 5;
      page.drawLine({ start: { x: ix + 22, y: y + 2 }, end: { x: ix + COL_W, y: y + 2 }, thickness: 0.4, color: LINE });
    }
    y -= 10;
  }

  // Allergen information, in full, after the dishes.
  const allergen = wrap(settings.allergenText, regular, 8.5, COL_W - 20);
  ensure(allergen.length * 11 + 22);
  const ax = x();
  page.drawRectangle({ x: ax, y: y - allergen.length * 11 - 14, width: 3, height: allergen.length * 11 + 14, color: RED });
  allergen.forEach((line, i) => page.drawText(line, { x: ax + 12, y: y - 14 - i * 11, size: 8.5, font: regular, color: INK }));
  y -= allergen.length * 11 + 22;

  // Footer on every page.
  const made = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Amsterdam' }).format(new Date());
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: MARGIN, y: MARGIN + 14 }, end: { x: A4.w - MARGIN, y: MARGIN + 14 }, thickness: 0.5, color: LINE });
    const left = clean(`Actuele menukaart: ${siteHost}/menukaart · ${made}`);
    p.drawText(left, { x: MARGIN, y: MARGIN, size: 7.5, font: regular, color: GREY });
    const num = `${i + 1} / ${pages.length}`;
    p.drawText(num, { x: A4.w - MARGIN - regular.widthOfTextAtSize(num, 7.5), y: MARGIN, size: 7.5, font: regular, color: GREY });
  });

  return doc.save();
}

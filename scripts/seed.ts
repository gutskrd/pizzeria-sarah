/**
 * Seeds the initial website content.
 *
 * Only verified information is used: the texts of the existing website and
 * the printed menu of November 2025 (scripts/data/menukaart-2025-11.ts).
 * Photos and offers are not seeded; the owner adds them in the admin panel
 * (or via `npm run media:import-legacy`).
 *
 * Safe to run repeatedly: existing rows are left untouched, and the menu is
 * only added while the menu is still completely empty.
 * Pass --zonder-menukaart to skip the menu (used by the automated tests) and
 * --zonder-folder to skip the printed folder.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/db/schema';
import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { normalizeSheet, renderPanels, sharpenSheet, sheetFileName } from '../src/lib/images/folder';
import { newStorageKey, readMediaFile, writeMediaFiles } from '../src/lib/images/storage';
import { MENU_2025_11 } from './data/menukaart-2025-11';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ontbreekt.');
  process.exit(1);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });

const phone = '0488 - 411 767';

await db
  .insert(schema.siteSettings)
  .values({
    id: 1,
    businessName: 'Pizzeria Sarah',
    tagline: 'Grillroom · Pizzeria · Afhaalcentrum',
    phoneDisplay: phone,
    phoneE164: '+31488411767',
    email: 'pizzaria-sarah@hotmail.com',
    // Address as listed in public business directories; the owner can confirm or
    // correct it under Instellingen.
    street: 'Margrietlaan 2',
    postalCode: '6669 AP',
    city: 'Dodewaard',
    foundedYear: 1995,
    heroTitle: 'Pizzeria Sarah',
    heroText: 'Grillroom, pizzeria en afhaalcentrum in Dodewaard. Al sinds 1995 maken we hier met zorg onze maaltijden.',
    introTitle: 'Welkom bij Pizzeria Sarah',
    introText: `Pizzeria Sarah is een grillroom, pizzeria en afhaalcentrum in Dodewaard, en daar al sinds 1995 gevestigd. Bekijk onze menukaart voor al onze maaltijden, of bel ons op ${phone}.`,
    aboutTitle: 'Sinds 1995 in Dodewaard',
    aboutText:
      'Al jaren bereiden we vanuit onze grillroom maaltijden voor onze klanten. We zijn trots op onze producten en op de vele vaste klanten die steeds weer bij ons terugkomen.',
    aboutStory: [
      'Pizzeria Sarah is sinds 1995 gevestigd in Dodewaard. Al jaren bereiden we vanuit onze grillroom maaltijden voor onze klanten.',
      'We zijn trots op onze producten en op onze vele vaste klanten. Graag willen we iedereen bedanken voor het vertrouwen.',
    ].join('\n\n'),
    waitingAreaText: 'Haal je je bestelling op? In onze ruime en mooie wachtruimte is voldoende zitplek terwijl je wacht.',
    reservationText: 'Wil je bij ons in het restaurant eten? Reserveer dan vooraf even telefonisch.',
    allergenText:
      'Voedselallergie? In onze producten kunnen verschillende soorten allergenen aanwezig zijn. Heb je een vraag over de samenstelling van een product? Vraag het een medewerker. We helpen je graag!',
    footerText: 'Grillroom, pizzeria en afhaalcentrum in Dodewaard. Sinds 1995.',
  })
  .onConflictDoNothing();

const seo: Array<typeof schema.pageSeo.$inferInsert> = [
  {
    pageKey: 'home',
    title: 'Pizzeria Sarah – Grillroom, pizzeria en afhaalcentrum in Dodewaard',
    description: 'Pizzeria Sarah is sinds 1995 een grillroom, pizzeria en afhaalcentrum in Dodewaard. Bekijk de menukaart, openingstijden en contactgegevens.',
  },
  {
    pageKey: 'menukaart',
    title: 'Menukaart – Pizzeria Sarah Dodewaard',
    description: "Bekijk de volledige menukaart van Pizzeria Sarah in Dodewaard: pizza's, grillgerechten en meer, met actuele prijzen.",
  },
  {
    pageKey: 'over-ons',
    title: 'Over ons – Pizzeria Sarah, sinds 1995 in Dodewaard',
    description: 'Lees het verhaal van Pizzeria Sarah: sinds 1995 een grillroom, pizzeria en afhaalcentrum in Dodewaard.',
  },
  {
    pageKey: 'galerij',
    title: "Foto's – Pizzeria Sarah Dodewaard",
    description: "Foto's van Pizzeria Sarah in Dodewaard: ons restaurant, de wachtruimte en onze gerechten.",
  },
  {
    pageKey: 'contact',
    title: 'Contact en openingstijden – Pizzeria Sarah Dodewaard',
    description: 'Neem contact op met Pizzeria Sarah in Dodewaard. Bel voor een reservering, bekijk de openingstijden of stuur ons een bericht.',
  },
  {
    pageKey: 'privacy',
    title: 'Privacyverklaring – Pizzeria Sarah',
    description: 'Hoe Pizzeria Sarah omgaat met je persoonsgegevens, bijvoorbeeld als je het contactformulier gebruikt.',
  },
  {
    pageKey: 'voorwaarden',
    title: 'Voorwaarden – Pizzeria Sarah',
    description: 'De gebruiksvoorwaarden van de website van Pizzeria Sarah in Dodewaard.',
  },
];
await db.insert(schema.pageSeo).values(seo).onConflictDoNothing();

const existingHighlights = await db.select({ id: schema.highlights.id }).from(schema.highlights).limit(1);
if (existingHighlights.length === 0) {
  await db.insert(schema.highlights).values([
    {
      title: 'Ruime wachtruimte',
      body: 'Een ruime en mooie wachtruimte met voldoende zitplek, terwijl we je bestelling klaarmaken.',
      icon: 'seat',
      sortOrder: 0,
    },
    {
      title: 'Heerlijke pizza',
      body: "Onze pizza's worden met veel zorg bereid, met dagelijks verse ingrediënten.",
      icon: 'pizza',
      sortOrder: 1,
    },
    {
      title: 'Jarenlange ervaring',
      body: 'Sinds 1995 in Dodewaard. Al jaren bereiden we vanuit onze grillroom maaltijden voor onze vaste klanten.',
      icon: 'clock',
      sortOrder: 2,
    },
  ]);
}

// Opening hours: maandag gesloten (behalve op feestdagen), dinsdag t/m zondag 16:00–20:00.
await db
  .insert(schema.openingDays)
  .values([1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday })))
  .onConflictDoNothing();
const existingPeriods = await db.select({ id: schema.openingPeriods.id }).from(schema.openingPeriods).limit(1);
if (existingPeriods.length === 0) {
  await client`update opening_days set note = 'Gesloten, behalve op feestdagen' where weekday = 1`;
  await db.insert(schema.openingPeriods).values([2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, opensAt: '16:00', closesAt: '20:00' })));
}

// Menu from the printed menu (November 2025), only into an empty menu.
const existingCategories = await db.select({ id: schema.menuCategories.id }).from(schema.menuCategories).limit(1);
if (existingCategories.length === 0 && !process.argv.includes('--zonder-menukaart')) {
  await db.transaction(async (tx) => {
    for (const [ci, category] of MENU_2025_11.entries()) {
      const [row] = await tx
        .insert(schema.menuCategories)
        .values({ name: category.name, slug: category.slug, sortOrder: ci })
        .returning({ id: schema.menuCategories.id });
      await tx.insert(schema.menuItems).values(
        category.items.map((item, ii) => ({
          categoryId: row!.id,
          number: item.number,
          name: item.name,
          description: item.description ?? '',
          priceCents: item.price === null ? null : Math.round(item.price * 100),
          isFeatured: item.featured ?? false,
          sortOrder: ii,
        })),
      );
    }
  });
  const count = MENU_2025_11.reduce((n, c) => n + c.items.length, 0);
  console.log(`Menukaart toegevoegd: ${count} gerechten in ${MENU_2025_11.length} categorieën.`);
}

// The printed folder of November 2025, cut at its fold lines (measured on the
// printed sheets). The owner replaces it under Beheer → Menukaart → Folder.
const [folderRow] = await db.select({ key: schema.siteSettings.folderKey, updatedAt: schema.siteSettings.folderUpdatedAt }).from(schema.siteSettings).limit(1);
if (folderRow && !folderRow.key && !folderRow.updatedAt && !process.argv.includes('--zonder-folder')) {
  const dir = 'content/menukaart-2025-11';
  const sheets = {
    binnen: await normalizeSheet(await readFile(`${dir}/menukaart-blad-1.png`), 'png'),
    buiten: await normalizeSheet(await readFile(`${dir}/menukaart-blad-2.png`), 'png'),
  };
  const cuts: schema.FolderCuts = { binnen: [0.329, 0.654], buiten: [0.339, 0.656] };
  const rendered = await renderPanels(sheets, cuts);
  const key = newStorageKey();
  await writeMediaFiles(key, [
    { name: sheetFileName('binnen'), data: sheets.binnen },
    { name: sheetFileName('buiten'), data: sheets.buiten },
    ...rendered.files,
  ]);
  await db
    .update(schema.siteSettings)
    .set({
      folderKey: key,
      folderHasInside: true,
      folderHasOutside: true,
      folderCuts: cuts,
      folderPanelWidth: rendered.panelWidth,
      folderPanelHeight: rendered.panelHeight,
      folderLabel: 'november 2025',
      folderUpdatedAt: new Date(),
    })
    .where(eq(schema.siteSettings.id, 1));
  console.log('Folder (menukaart november 2025) toegevoegd.');
}

// A folder processed before sheets were sharpened is upgraded once (same fold lines).
const [current] = await db
  .select({
    key: schema.siteSettings.folderKey,
    hasInside: schema.siteSettings.folderHasInside,
    hasOutside: schema.siteSettings.folderHasOutside,
    cuts: schema.siteSettings.folderCuts,
    panelHeight: schema.siteSettings.folderPanelHeight,
  })
  .from(schema.siteSettings)
  .limit(1);
if (current?.key && current.hasInside && current.hasOutside && (current.panelHeight ?? 0) < 900) {
  const inside = await readMediaFile(current.key, sheetFileName('binnen'));
  const outside = await readMediaFile(current.key, sheetFileName('buiten'));
  if (inside && outside) {
    const sheets = { binnen: await sharpenSheet(inside), buiten: await sharpenSheet(outside) };
    const rendered = await renderPanels(sheets, current.cuts);
    const key = newStorageKey();
    await writeMediaFiles(key, [
      { name: sheetFileName('binnen'), data: sheets.binnen },
      { name: sheetFileName('buiten'), data: sheets.buiten },
      ...rendered.files,
    ]);
    await db
      .update(schema.siteSettings)
      .set({ folderKey: key, folderPanelWidth: rendered.panelWidth, folderPanelHeight: rendered.panelHeight })
      .where(eq(schema.siteSettings.id, 1));
    // The old files stay: a running website may still show them until its cache refreshes.
    console.log('Folder scherper gemaakt.');
  }
}

console.log('Basisinhoud toegevoegd.');
await client.end();

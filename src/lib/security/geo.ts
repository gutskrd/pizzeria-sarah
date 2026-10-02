const regionNames = new Intl.DisplayNames(['nl'], { type: 'region' });

export function countryName(code: string | null | undefined): string | null {
  if (!code || !/^[A-Z]{2}$/.test(code)) return null;
  try {
    return regionNames.of(code) ?? null;
  } catch {
    return null;
  }
}

/**
 * Owner-friendly approximate location. IP-based locations are imprecise, so a
 * city is only ever presented as a region ("Regio Arnhem, Nederland").
 */
export function approximateLocation(country: string | null, region: string | null, city: string | null): string {
  const land = countryName(country);
  if (!land) return 'Locatie onbekend';
  const place = city || region;
  return place ? `Regio ${place}, ${land}` : land;
}

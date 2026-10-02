import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './user-agent';
import { approximateLocation } from './geo';

describe('parseUserAgent', () => {
  it('recognises an iPhone with Safari', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toMatchObject({ deviceName: 'iPhone', browser: 'Safari', os: 'iOS', deviceType: 'phone' });
  });
  it('recognises Chrome on Windows', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua)).toMatchObject({ deviceName: 'Windows-pc', browser: 'Chrome', os: 'Windows' });
  });
  it('recognises Edge', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';
    expect(parseUserAgent(ua).browser).toBe('Edge');
  });
  it('recognises an Android phone with Samsung Internet', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36';
    expect(parseUserAgent(ua)).toMatchObject({ deviceName: 'Android-telefoon', browser: 'Samsung Internet' });
  });
  it('recognises Firefox on macOS', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:130.0) Gecko/20100101 Firefox/130.0';
    expect(parseUserAgent(ua)).toMatchObject({ deviceName: 'Mac', browser: 'Firefox', os: 'macOS' });
  });
  it('handles empty input', () => expect(parseUserAgent('').deviceName).toBe('Onbekend apparaat'));
});

describe('approximateLocation', () => {
  it('shows a country', () => expect(approximateLocation('NL', null, null)).toBe('Nederland'));
  it('shows a region, never an address', () => expect(approximateLocation('NL', 'Gelderland', 'Arnhem')).toBe('Regio Arnhem, Nederland'));
  it('handles unknown', () => expect(approximateLocation(null, null, null)).toBe('Locatie onbekend'));
});

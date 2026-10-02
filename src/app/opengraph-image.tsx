import { ImageResponse } from 'next/og';
import { getSettings } from '@/lib/content/queries';

export const dynamic = 'force-dynamic';
export const alt = 'Pizzeria Sarah in Dodewaard';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Fallback social-media preview when no hero photo has been uploaded. */
export default async function OpenGraphImage() {
  const s = await getSettings();
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 80,
        background: '#1d1511',
        color: '#f7f2ea',
      }}
    >
      <div style={{ fontSize: 28, letterSpacing: 6, textTransform: 'uppercase', color: '#f0b48a' }}>{`${s.tagline} · ${s.city}`}</div>
      <div style={{ fontSize: 120, fontWeight: 700, marginTop: 16, lineHeight: 1 }}>{s.businessName}</div>
      {s.foundedYear ? <div style={{ fontSize: 36, marginTop: 28, color: 'rgba(247,242,234,0.8)' }}>{`Sinds ${s.foundedYear}`}</div> : null}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 14, background: '#b3301d' }} />
    </div>,
    size,
  );
}

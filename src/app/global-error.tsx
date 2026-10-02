'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="nl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f7f2ea', color: '#231a15' }}>
        <main style={{ maxWidth: 640, margin: '0 auto', padding: '15vh 24px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 40, lineHeight: 1.1 }}>Er is iets misgegaan</h1>
          <p style={{ fontSize: 18 }}>De website kon even niet worden geladen. Probeer het over een paar minuten opnieuw.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: '12px 20px', fontSize: 16, background: '#b3301d', color: '#fff', border: 0, borderRadius: 4 }}
          >
            Opnieuw proberen
          </button>
        </main>
      </body>
    </html>
  );
}

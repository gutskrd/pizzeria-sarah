'use client';

import Link from 'next/link';

/** Friendly Dutch error page. Technical details are only logged on the server. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="inhoud" className="flex min-h-[70svh] items-center bg-paper">
      <div className="container-site py-20">
        <p className="eyebrow">Even geduld</p>
        <h1 className="mt-3 font-display text-[clamp(2.2rem,6vw,4rem)] leading-none">Er is iets misgegaan</h1>
        <p className="mt-5 max-w-lg text-lg text-ink-soft">Deze pagina kon niet worden geladen. Probeer het opnieuw, of kom later nog eens terug.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Opnieuw proberen
          </button>
          <Link href="/" className="btn btn-outline">
            Naar de homepage
          </Link>
        </div>
      </div>
    </main>
  );
}

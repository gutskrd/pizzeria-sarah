import Link from 'next/link';

export const metadata = { title: 'Pagina niet gevonden – Pizzeria Sarah', robots: { index: false } };

export default function NotFound() {
  return (
    <main id="inhoud" className="flex min-h-[100svh] items-center bg-paper">
      <div className="container-site py-20">
        <p className="eyebrow">Foutcode 404</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,7vw,4.5rem)] leading-none">Deze pagina bestaat niet</h1>
        <p className="mt-5 max-w-lg text-lg text-ink-soft">Misschien is de pagina verplaatst of is er een typefout in het adres geslopen.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            Naar de homepage
          </Link>
          <Link href="/menukaart" className="btn btn-outline">
            Menukaart bekijken
          </Link>
        </div>
      </div>
    </main>
  );
}

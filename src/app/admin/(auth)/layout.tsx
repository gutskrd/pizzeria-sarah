import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Inloggen – Beheer Pizzeria Sarah', robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[100svh] flex-col bg-paper">
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <p className="font-display text-3xl">Pizzeria Sarah</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-muted">Beheer van de website</p>
          </div>
          <div className="admin-card p-6 shadow-sm sm:p-8">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">
            <Link href="/" className="underline underline-offset-2 hover:text-ink">
              Naar de website
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

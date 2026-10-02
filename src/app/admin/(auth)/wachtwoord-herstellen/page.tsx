import type { Metadata } from 'next';
import Link from 'next/link';
import { ResetForm } from '@/components/admin/auth/forms';

export const metadata: Metadata = { referrer: 'no-referrer' };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { token } = await searchParams;
  if (typeof token !== 'string' || token.length < 20) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Ongeldige link</h1>
        <p className="text-ink-soft">Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.</p>
        <Link href="/admin/wachtwoord-vergeten" className="admin-btn admin-btn-primary w-full">
          Nieuwe link aanvragen
        </Link>
      </div>
    );
  }
  return <ResetForm token={token} />;
}

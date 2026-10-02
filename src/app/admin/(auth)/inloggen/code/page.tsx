import Link from 'next/link';
import { hasPendingChallenge } from '@/app/admin/(auth)/actions';
import { CodeForm } from '@/components/admin/auth/forms';

export default async function CodePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/admin';
  const pending = await hasPendingChallenge();
  if (!pending) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Code verlopen</h1>
        <p className="text-ink-soft">Je inlogpoging is verlopen of al gebruikt. Log opnieuw in om een nieuwe code te ontvangen.</p>
        <Link href="/admin/inloggen" className="admin-btn admin-btn-primary w-full">
          Opnieuw inloggen
        </Link>
      </div>
    );
  }
  return <CodeForm next={next} email={pending.email} />;
}

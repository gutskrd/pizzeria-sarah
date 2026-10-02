import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/auth/forms';
import { getCurrentSession } from '@/lib/auth/current';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getCurrentSession()) redirect('/admin');
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/admin';
  const info =
    params.uitgelogd === '1'
      ? 'Je bent uitgelogd.'
      : params.wachtwoord === 'gewijzigd'
        ? 'Je wachtwoord is gewijzigd. Log in met je nieuwe wachtwoord.'
        : undefined;
  return <LoginForm next={next} info={info} />;
}

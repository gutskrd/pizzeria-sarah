import { eq, sql } from 'drizzle-orm';
import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/admin-nav';
import { ConfirmProvider } from '@/components/admin/confirm';
import { ToastProvider } from '@/components/admin/toast';
import { runMaintenance } from '@/lib/admin/maintenance';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';

export const metadata: Metadata = { title: 'Beheer – Pizzeria Sarah', robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const [[unread], [settings]] = await Promise.all([
    db()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.messages)
      .where(eq(schema.messages.status, 'new')),
    db().select({ name: schema.siteSettings.businessName }).from(schema.siteSettings).limit(1),
  ]);
  void runMaintenance();

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-[100svh] bg-[#f6f3ee]">
          <AdminNav unread={unread?.count ?? 0} userName={ctx.user.name} businessName={settings?.name ?? 'Pizzeria Sarah'} />
          <main id="inhoud" className="lg:pl-64">
            <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}

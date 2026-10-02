import type { Metadata } from 'next';
import { ConfirmProvider } from '@/components/admin/confirm';
import { AdminShell } from '@/components/admin/shell/admin-shell';
import { LiveProvider } from '@/components/admin/shell/live-provider';
import { ToastProvider } from '@/components/admin/toast';
import { runMaintenance } from '@/lib/admin/maintenance';
import { getAdminStatus } from '@/lib/admin/status';
import { requireAdmin } from '@/lib/auth/current';
import { getSchedule, getSettings } from '@/lib/content/queries';

export const metadata: Metadata = { title: 'Beheer – Pizzeria Sarah', robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAdmin();
  const [status, settings, schedule] = await Promise.all([getAdminStatus(ctx.user.id), getSettings(), getSchedule()]);
  void runMaintenance();

  return (
    <ToastProvider>
      <ConfirmProvider>
        <LiveProvider initial={status}>
          <AdminShell
            userName={ctx.user.name}
            userEmail={ctx.user.email}
            businessName={settings.businessName}
            schedule={schedule}
            serverNow={new Date().getTime()}
          >
            {children}
          </AdminShell>
        </LiveProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}

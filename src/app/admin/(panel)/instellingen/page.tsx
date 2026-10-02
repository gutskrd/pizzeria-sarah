import { SettingsView } from '@/components/admin/settings-view';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';

export const metadata = { title: 'Instellingen – Beheer' };

export default async function SettingsPage() {
  const ctx = await requireAdmin();
  const [s] = await db().select().from(schema.siteSettings).limit(1);
  if (!s) throw new Error('site_settings missing');
  return (
    <SettingsView
      data={{
        business: {
          businessName: s.businessName,
          tagline: s.tagline,
          phoneDisplay: s.phoneDisplay,
          email: s.email,
          street: s.street,
          postalCode: s.postalCode,
          city: s.city,
          foundedYear: s.foundedYear ? String(s.foundedYear) : '',
        },
        social: { facebookUrl: s.facebookUrl, instagramUrl: s.instagramUrl },
        notifications: { newDeviceAlerts: s.newDeviceAlerts, messageAlerts: s.messageAlerts },
        account: { name: ctx.user.name, email: ctx.user.email },
      }}
    />
  );
}

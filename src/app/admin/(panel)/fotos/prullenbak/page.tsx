import { TrashGrid } from '@/components/admin/photos/trash-grid';
import { listAdminImages } from '@/lib/admin/images';
import { requireAdmin } from '@/lib/auth/current';

export const metadata = { title: 'Prullenbak – Beheer' };

export default async function TrashPage() {
  await requireAdmin();
  return <TrashGrid images={await listAdminImages({ trash: true })} now={new Date().toISOString()} />;
}

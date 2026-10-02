import { isNotNull, sql } from 'drizzle-orm';
import { PhotoLibrary } from '@/components/admin/photos/photo-library';
import { listAdminImages } from '@/lib/admin/images';
import { requireAdmin } from '@/lib/auth/current';
import { db, schema } from '@/lib/db';

export const metadata = { title: "Foto's – Beheer" };

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ toevoegen?: string }> }) {
  await requireAdmin();
  const [images, [trash]] = await Promise.all([
    listAdminImages(),
    db()
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.images)
      .where(isNotNull(schema.images.deletedAt)),
  ]);
  const { toevoegen } = await searchParams;
  return <PhotoLibrary images={images} trashCount={trash?.count ?? 0} openUpload={toevoegen === '1'} />;
}

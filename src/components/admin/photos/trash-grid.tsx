'use client';

/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import Link from 'next/link';
import { deleteImageForever, restoreImage } from '@/app/admin/(panel)/fotos/actions';
import { useConfirm } from '@/components/admin/confirm';
import { EmptyState } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { ArrowLeftIcon, TrashIcon, UndoIcon } from '@/components/ui/icons';
import type { AdminImage } from '@/lib/admin/types';

const DAY = 24 * 60 * 60 * 1000;

export function TrashGrid({ images, now }: { images: AdminImage[]; now: string }) {
  const { run } = useAdminAction();
  const confirm = useConfirm();
  const daysLeft = (deletedAt: string) => Math.max(0, 30 - Math.floor((new Date(now).getTime() - new Date(deletedAt).getTime()) / DAY));

  return (
    <>
      <Link href="/admin/fotos" className="admin-btn admin-btn-ghost admin-btn-sm -ml-2 mb-3">
        <ArrowLeftIcon size={18} /> Terug naar foto&apos;s
      </Link>
      <PageTitle
        title="Prullenbak"
        description="Verwijderde foto's blijven hier 30 dagen staan. Daarna worden ze automatisch definitief verwijderd."
        actions={
          images.length > 0 ? (
            <button
              type="button"
              className="admin-btn admin-btn-danger"
              onClick={async () => {
                const ok = await confirm({
                  title: 'Prullenbak legen?',
                  message: `Alle ${images.length} foto's in de prullenbak worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.`,
                  confirmLabel: 'Definitief verwijderen',
                  tone: 'danger',
                });
                if (ok) await run(() => deleteImageForever({ ids: images.map((i) => i.id) }));
              }}
            >
              <TrashIcon size={18} /> Prullenbak legen
            </button>
          ) : undefined
        }
      />
      {images.length === 0 ? (
        <EmptyState icon={<TrashIcon size={28} />} title="De prullenbak is leeg" />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="overflow-hidden rounded-lg border border-line bg-white">
              <img src={img.thumbUrl} alt="" loading="lazy" className="aspect-square w-full object-cover opacity-80" />
              <div className="p-2.5">
                <p className="truncate font-medium">{img.title || 'Naamloze foto'}</p>
                <p className="text-sm text-muted">Nog {daysLeft(img.deletedAt!)} dagen in de prullenbak</p>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm mt-2 w-full"
                  onClick={() => run(() => restoreImage({ id: img.id }))}
                >
                  <UndoIcon size={16} /> Terugzetten
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

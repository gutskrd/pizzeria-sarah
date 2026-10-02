'use client';

/* eslint-disable @next/next/no-img-element -- admin thumbnails */
import { useState } from 'react';
import { listPickerImages } from '@/app/admin/(panel)/fotos/actions';
import { Dialog } from '@/components/admin/dialog';
import { useToast } from '@/components/admin/toast';
import { NETWORK_ERROR } from '@/components/admin/use-admin-action';
import { CheckIcon, ImageIcon, PlusIcon } from '@/components/ui/icons';
import type { AdminImage } from '@/lib/admin/types';
import { UploadDialog } from './upload-dialog';

export type PickedImage = { id: string; thumbUrl: string; title: string } | null;

/**
 * Chooses a photo from the library or uploads a new one. Used for the homepage
 * photo, menu items and offers.
 */
export function ImagePicker({
  value,
  onChange,
  label,
  allowRemove = true,
  removeLabel = 'Foto weghalen',
  uploadVisibleByDefault = false,
}: {
  value: PickedImage;
  onChange: (image: PickedImage) => void;
  label: string;
  allowRemove?: boolean;
  removeLabel?: string;
  uploadVisibleByDefault?: boolean;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [images, setImages] = useState<AdminImage[] | null>(null);

  const openPicker = async () => {
    setOpen(true);
    try {
      const res = await listPickerImages({});
      if (res.ok) setImages(res.data ?? []);
      else toast.error(res.error);
    } catch {
      toast.error(NETWORK_ERROR);
    }
  };

  const pick = (img: AdminImage) => {
    onChange({ id: img.id, thumbUrl: img.thumbUrl, title: img.title || img.altText });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-paper sm:w-44">
          {value ? <img src={value.thumbUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon size={32} className="text-muted" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={openPicker}
            aria-label={`${label}: ${value ? 'andere foto kiezen' : 'foto kiezen'}`}
          >
            <ImageIcon size={18} /> {value ? 'Andere foto kiezen' : 'Foto kiezen'}
          </button>
          {value && allowRemove && (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => onChange(null)}>
              {removeLabel}
            </button>
          )}
        </div>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={label}
        description="Kies een foto uit je foto's, of voeg een nieuwe foto toe."
        footer={
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setOpen(false)}>
            Annuleren
          </button>
        }
      >
        {images === null ? (
          <p className="py-10 text-center text-muted" role="status">
            Foto&apos;s laden…
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <li>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-paper/60 font-semibold text-tomato hover:border-tomato"
              >
                <PlusIcon size={28} /> Nieuwe foto
              </button>
            </li>
            {images.map((img) => (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => pick(img)}
                  aria-pressed={value?.id === img.id}
                  className="group relative block w-full overflow-hidden rounded-lg border-2 border-transparent text-left aria-pressed:border-tomato"
                >
                  <img src={img.thumbUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                  {value?.id === img.id && (
                    <span className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-tomato text-white">
                      <CheckIcon size={18} />
                    </span>
                  )}
                  <span className="block truncate px-1 py-1.5 text-sm">{img.title || img.altText || 'Naamloze foto'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <UploadDialog
        open={uploadOpen}
        single
        visibleByDefault={uploadVisibleByDefault}
        onClose={() => setUploadOpen(false)}
        onUploaded={(uploaded) => {
          const first = uploaded[0];
          if (first) pick(first);
        }}
      />
    </div>
  );
}

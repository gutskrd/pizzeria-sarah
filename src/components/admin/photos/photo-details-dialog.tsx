'use client';

/* eslint-disable @next/next/no-img-element -- admin previews of already-optimised images */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { setSiteImage } from '@/app/admin/(panel)/fotos/actions';
import { useConfirm } from '@/components/admin/confirm';
import { Dialog } from '@/components/admin/dialog';
import { useToast } from '@/components/admin/toast';
import { uploadWithProgress } from '@/components/admin/upload';
import { useAdminAction } from '@/components/admin/use-admin-action';
import { ArrowRightIcon, HomeIcon, ReplaceIcon, TrashIcon } from '@/components/ui/icons';
import type { AdminImage } from '@/lib/admin/types';
import { PhotoFields, toFormValues, usePhotoSave, type PhotoFormValues } from './photo-form';
import { usePhotoDelete } from './photo-actions';

const dateFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

export function PhotoDetailsDialog({ image, onClose }: { image: AdminImage | null; onClose: () => void }) {
  return image ? (
    <Inner key={image.id + image.previewUrl} image={image} onClose={onClose} />
  ) : (
    <Dialog open={false} onClose={onClose} title="">
      {null}
    </Dialog>
  );
}

function Inner({ image, onClose }: { image: AdminImage; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { run } = useAdminAction();
  const deletePhoto = usePhotoDelete();
  const { save, saving, fieldErrors } = usePhotoSave();
  const [values, setValues] = useState<PhotoFormValues>(toFormValues(image));
  const [replacement, setReplacement] = useState<{ file: File; preview: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = JSON.stringify(values) !== JSON.stringify(toFormValues(image));
  const isHero = image.usages.some((u) => u.label.startsWith('Hoofdfoto'));

  const close = async () => {
    if (progress !== null) return;
    if (
      dirty &&
      !(await confirm({
        title: 'Wijzigingen niet opgeslagen',
        message: 'Je hebt wijzigingen die nog niet zijn opgeslagen. Toch sluiten?',
        confirmLabel: 'Sluiten zonder opslaan',
        tone: 'danger',
      }))
    )
      return;
    if (replacement) URL.revokeObjectURL(replacement.preview);
    onClose();
  };

  const chooseReplacement = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setReplaceError(null);
    setReplacement({ file, preview: URL.createObjectURL(file) });
  };

  const doReplace = async () => {
    if (!replacement) return;
    setProgress(0);
    const form = new FormData();
    form.set('file', replacement.file);
    const res = await uploadWithProgress<AdminImage>(`/api/admin/images/${image.id}/replace`, form, setProgress);
    setProgress(null);
    if (res.ok) {
      URL.revokeObjectURL(replacement.preview);
      setReplacement(null);
      toast.success('Foto vervangen.');
      router.refresh();
      onClose();
    } else {
      setReplaceError(res.error);
      if (res.loggedOut) router.push('/admin/inloggen?next=/admin/fotos');
    }
  };

  if (replacement) {
    return (
      <Dialog
        open
        onClose={() => {
          if (progress === null) {
            URL.revokeObjectURL(replacement.preview);
            setReplacement(null);
          }
        }}
        locked={progress !== null}
        size="lg"
        title="Foto vervangen"
        description="De nieuwe foto komt op precies dezelfde plekken op de website te staan."
        footer={
          <>
            <button type="button" className="admin-btn admin-btn-secondary" disabled={progress !== null} onClick={() => fileRef.current?.click()}>
              Andere foto kiezen
            </button>
            <button type="button" className="admin-btn admin-btn-primary" disabled={progress !== null} onClick={doReplace}>
              {progress !== null ? (progress >= 1 ? 'Bezig met verwerken…' : `Bezig met uploaden… ${Math.round(progress * 100)}%`) : 'Foto vervangen'}
            </button>
          </>
        }
      >
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => chooseReplacement(e.target.files)} />
        {replaceError && (
          <div role="alert" className="mb-4 rounded-md border border-tomato/40 bg-tomato-soft px-4 py-3 text-tomato-dark">
            {replaceError}
          </div>
        )}
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <figure>
            <figcaption className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Huidige foto</figcaption>
            <img src={image.previewUrl} alt="" className="aspect-[4/3] w-full rounded-md bg-paper object-cover" />
          </figure>
          <ArrowRightIcon className="mx-auto rotate-90 text-muted sm:rotate-0" size={28} />
          <figure>
            <figcaption className="mb-2 text-sm font-semibold uppercase tracking-wider text-tomato">Nieuwe foto</figcaption>
            <img src={replacement.preview} alt="" className="aspect-[4/3] w-full rounded-md bg-paper object-cover" />
          </figure>
        </div>
        {image.usages.length > 0 && (
          <p className="mt-5 text-[0.95rem] text-ink-soft">
            Wordt gebruikt bij: <strong className="font-semibold">{image.usages.map((u) => u.label).join(', ')}</strong>. Dat blijft zo.
          </p>
        )}
      </Dialog>
    );
  }

  return (
    <Dialog
      open
      onClose={close}
      size="xl"
      title={image.title || 'Foto'}
      footer={
        <>
          <button
            type="button"
            className="admin-btn admin-btn-danger sm:mr-auto"
            onClick={async () => {
              if (await deletePhoto(image)) onClose();
            }}
          >
            <TrashIcon size={18} /> Verwijderen
          </button>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={() => fileRef.current?.click()}>
            <ReplaceIcon size={18} /> Vervangen
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            disabled={saving || !dirty}
            onClick={async () => {
              if (await save(image.id, values)) onClose();
            }}
          >
            {saving ? 'Bezig met opslaan…' : 'Opslaan'}
          </button>
        </>
      }
    >
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => chooseReplacement(e.target.files)} />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <div className="overflow-hidden rounded-md bg-paper">
            <img
              src={image.previewUrl}
              alt={image.altText}
              width={image.width}
              height={image.height}
              className="max-h-[50vh] w-full object-contain"
              style={{ backgroundImage: `url(${image.placeholder})`, backgroundSize: 'cover' }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            Toegevoegd op {dateFormat.format(new Date(image.createdAt))} · {image.width} × {image.height} pixels
          </p>
          <div className="mt-5">
            <h3 className="font-semibold">Gebruikt op de website</h3>
            {image.usages.length ? (
              <ul className="mt-2 space-y-1.5">
                {image.usages.map((u) => (
                  <li key={u.label} className="flex items-center gap-2 text-[0.97rem]">
                    <span className={`size-2 shrink-0 rounded-full ${u.critical ? 'bg-tomato' : 'bg-basil'}`} />
                    {u.href && u.href.startsWith('/admin') ? (
                      <Link href={u.href} className="underline underline-offset-2 hover:text-tomato">
                        {u.label}
                      </Link>
                    ) : (
                      u.label
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-muted">Deze foto wordt nu nergens op de website getoond.</p>
            )}
            {!isHero && (
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm mt-3 -ml-2"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Hoofdfoto wijzigen?',
                    message: 'Deze foto wordt de grote foto bovenaan de homepage.',
                    confirmLabel: 'Ja, gebruik deze foto',
                  });
                  if (ok) {
                    const r = await run(() => setSiteImage({ id: image.id, role: 'hero' }));
                    if (r.ok) onClose();
                  }
                }}
              >
                <HomeIcon size={18} /> Gebruik als hoofdfoto van de homepage
              </button>
            )}
          </div>
        </div>
        <PhotoFields values={values} onChange={setValues} errors={fieldErrors} />
      </div>
    </Dialog>
  );
}

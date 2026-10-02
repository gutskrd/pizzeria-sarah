'use client';

/* eslint-disable @next/next/no-img-element -- local previews of files being uploaded */
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/admin/dialog';
import { useToast } from '@/components/admin/toast';
import { uploadWithProgress } from '@/components/admin/upload';
import { AlertIcon, CameraIcon, CheckIcon, ImageIcon, UploadIcon } from '@/components/ui/icons';
import type { AdminImage } from '@/lib/admin/types';
import { PhotoFields, toFormValues, usePhotoSave, type PhotoFormValues } from './photo-form';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX = 15 * 1024 * 1024;

type Job = {
  key: string;
  file: File;
  preview: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  error?: string;
  image?: AdminImage;
};

/** Quick client-side check so the owner gets instant feedback (the server checks everything again). */
function precheck(file: File): string | null {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (['heic', 'heif'].includes(ext) || /heic|heif/.test(file.type))
    return "Dit is een iPhone-foto in HEIC-formaat. Kies de foto via 'Foto's kiezen'; je iPhone zet hem dan automatisch om.";
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Dit bestandstype wordt niet ondersteund. Kies een JPG-, PNG- of WebP-foto.';
  if (file.size > MAX) return 'Deze foto is te groot (maximaal 15 MB).';
  return null;
}

export function UploadDialog({
  open,
  onClose,
  initialFiles,
  visibleByDefault = true,
  onUploaded,
  single = false,
}: {
  open: boolean;
  onClose: () => void;
  initialFiles?: File[] | null;
  visibleByDefault?: boolean;
  onUploaded?: (images: AdminImage[]) => void;
  /** Only one photo (e.g. when choosing a photo for a menu item). */
  single?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [step, setStep] = useState<'select' | 'uploading' | 'details' | 'done'>('select');
  const [values, setValues] = useState<PhotoFormValues | null>(null);
  const [dragging, setDragging] = useState(false);
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const { save, saving, fieldErrors } = usePhotoSave();
  const startedWith = useRef<File[] | null>(null);

  const reset = () => {
    jobs.forEach((j) => URL.revokeObjectURL(j.preview));
    setJobs([]);
    setStep('select');
    setValues(null);
  };

  const close = () => {
    if (step === 'uploading') return;
    const uploaded = jobs.filter((j) => j.image).map((j) => j.image!);
    if (step === 'details' && uploaded.length) toast.success('Foto toegevoegd. Je kunt de gegevens later nog aanpassen.');
    reset();
    onClose();
    if (uploaded.length) router.refresh();
  };

  const start = async (files: File[]) => {
    const list = (single ? files.slice(0, 1) : files).slice(0, 30);
    if (list.length === 0) return;
    const created: Job[] = list.map((file, i) => ({
      key: `${Date.now()}-${i}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: precheck(file) ? 'error' : 'waiting',
      error: precheck(file) ?? undefined,
    }));
    setJobs(created);
    setStep('uploading');

    const results: Job[] = [...created];
    for (let i = 0; i < results.length; i++) {
      const job = results[i]!;
      if (job.status === 'error') continue;
      results[i] = { ...job, status: 'uploading' };
      setJobs([...results]);
      const form = new FormData();
      form.set('file', job.file);
      form.set('visible', visibleByDefault ? '1' : '0');
      const res = await uploadWithProgress<AdminImage>('/api/admin/images', form, (p) => {
        results[i] = { ...results[i]!, progress: p };
        setJobs([...results]);
      });
      if (res.ok) results[i] = { ...results[i]!, status: 'done', progress: 1, image: res.data };
      else {
        results[i] = { ...results[i]!, status: 'error', error: res.error };
        if (res.loggedOut) router.push('/admin/inloggen?next=/admin/fotos');
      }
      setJobs([...results]);
    }

    const uploaded = results.filter((r) => r.image).map((r) => r.image!);
    if (uploaded.length) onUploaded?.(uploaded);
    if (uploaded.length === 1 && results.length === 1) {
      setValues(toFormValues(uploaded[0]!));
      setStep('details');
    } else {
      setStep('done');
      if (uploaded.length) {
        toast.success(uploaded.length === 1 ? 'Foto toegevoegd.' : `${uploaded.length} foto's toegevoegd.`);
        router.refresh();
      }
    }
  };

  // Files dropped onto the page open the dialog with those files.
  useEffect(() => {
    if (open && initialFiles?.length && startedWith.current !== initialFiles) {
      startedWith.current = initialFiles;
      void start(initialFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialFiles]);

  const onFiles = (fileList: FileList | null) => {
    if (fileList?.length) void start(Array.from(fileList));
  };

  const uploaded = jobs.find((j) => j.image)?.image;

  return (
    <Dialog
      open={open}
      onClose={close}
      locked={step === 'uploading'}
      size="lg"
      title={step === 'details' ? 'Gegevens van de foto' : single ? 'Foto toevoegen' : "Foto's toevoegen"}
      description={step === 'details' ? 'De foto is geüpload. Vul nog even in wat erop staat.' : undefined}
      footer={
        step === 'details' && uploaded && values ? (
          <>
            <button type="button" className="admin-btn admin-btn-secondary" onClick={close}>
              Later invullen
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={saving}
              onClick={async () => {
                if (await save(uploaded.id, values, 'Foto succesvol toegevoegd.')) {
                  reset();
                  onClose();
                }
              }}
            >
              {saving ? 'Bezig met opslaan…' : 'Opslaan'}
            </button>
          </>
        ) : step === 'done' ? (
          <>
            {jobs.some((j) => j.status === 'error') && (
              <button type="button" className="admin-btn admin-btn-secondary" onClick={reset}>
                Andere foto kiezen
              </button>
            )}
            <button type="button" className="admin-btn admin-btn-primary" onClick={close}>
              Klaar
            </button>
          </>
        ) : undefined
      }
    >
      {step === 'select' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center rounded-lg border-2 border-dashed px-5 py-10 text-center transition-colors sm:py-14 ${
            dragging ? 'border-tomato bg-tomato-soft' : 'border-line-strong bg-paper/50'
          }`}
        >
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-white text-tomato shadow-sm">
            <ImageIcon size={30} />
          </span>
          <p className="mt-4 font-display text-2xl">{single ? 'Kies een foto' : "Kies foto's"}</p>
          <p className="mt-1 hidden text-muted sm:block">
            {single ? 'Sleep een foto hierheen, of kies er een op je computer.' : "Sleep foto's hierheen, of kies ze op je computer."}
          </p>
          <p className="mt-1 text-muted sm:hidden">Uit je fotobibliotheek of maak direct een foto.</p>
          <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => pickRef.current?.click()}>
              <UploadIcon size={18} /> {single ? 'Foto kiezen' : "Foto's kiezen"}
            </button>
            <button type="button" className="admin-btn admin-btn-secondary sm:hidden" onClick={() => cameraRef.current?.click()}>
              <CameraIcon size={18} /> Foto maken
            </button>
          </div>
          <p className="mt-5 text-sm text-muted">JPG, PNG of WebP · maximaal 15 MB per foto</p>
          <input ref={pickRef} type="file" accept={ACCEPT} multiple={!single} hidden onChange={(e) => onFiles(e.target.files)} />
          <input ref={cameraRef} type="file" accept={ACCEPT} capture="environment" hidden onChange={(e) => onFiles(e.target.files)} />
        </div>
      )}

      {(step === 'uploading' || step === 'done') && (
        <ul className="space-y-3" aria-live="polite">
          {jobs.map((job) => (
            <li key={job.key} className="flex items-center gap-4 rounded-md border border-line p-3">
              <img src={job.preview} alt="" className="size-16 shrink-0 rounded-sm bg-paper object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{job.file.name}</p>
                {job.status === 'error' ? (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-tomato-dark">
                    <AlertIcon size={16} className="mt-0.5 shrink-0" /> {job.error}
                  </p>
                ) : job.status === 'done' ? (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-basil">
                    <CheckIcon size={16} /> Toegevoegd
                  </p>
                ) : (
                  <div className="mt-2">
                    <div
                      className="h-2 overflow-hidden rounded-full bg-paper"
                      role="progressbar"
                      aria-label={`Uploaden van ${job.file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(job.progress * 100)}
                    >
                      <div className="h-full rounded-full bg-tomato transition-[width]" style={{ width: `${Math.max(4, job.progress * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {job.status === 'waiting' ? 'Wacht op de beurt…' : job.progress >= 1 ? 'Foto wordt verwerkt…' : 'Bezig met uploaden…'}
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {step === 'details' && uploaded && values && (
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="overflow-hidden rounded-md bg-paper">
            <img src={uploaded.previewUrl} alt="" width={uploaded.width} height={uploaded.height} className="max-h-80 w-full object-contain" />
          </div>
          <PhotoFields values={values} onChange={setValues} errors={fieldErrors} />
        </div>
      )}
    </Dialog>
  );
}

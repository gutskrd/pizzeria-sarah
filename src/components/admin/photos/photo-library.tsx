'use client';

/* eslint-disable @next/next/no-img-element -- admin thumbnails are pre-optimised WebP variants */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { reorderImages, setImageFlags } from '@/app/admin/(panel)/fotos/actions';
import { EmptyState } from '@/components/admin/fields';
import { PageTitle } from '@/components/admin/page-title';
import { moveItem, SortableArea, useSortableItem } from '@/components/admin/sortable';
import { useAdminAction } from '@/components/admin/use-admin-action';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  GripIcon,
  HomeIcon,
  ImageIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from '@/components/ui/icons';
import type { AdminImage } from '@/lib/admin/types';
import { useCleanUrl } from '@/components/admin/use-clean-url';
import { PhotoDetailsDialog } from './photo-details-dialog';
import { UploadDialog } from './upload-dialog';

type Filter = 'all' | 'visible' | 'hidden' | 'featured' | 'used' | 'undescribed';

export const isUndescribed = (img: AdminImage) => img.isVisible && (img.altText.trim() === '' || /^foto van /i.test(img.altText));

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'Alle' },
  { key: 'visible', label: 'Zichtbaar' },
  { key: 'hidden', label: 'Verborgen' },
  { key: 'featured', label: 'Uitgelicht' },
  { key: 'used', label: 'In gebruik' },
  { key: 'undescribed', label: 'Zonder beschrijving' },
];

function matches(img: AdminImage, filter: Filter) {
  switch (filter) {
    case 'visible':
      return img.isVisible;
    case 'hidden':
      return !img.isVisible;
    case 'featured':
      return img.isFeatured;
    case 'used':
      return img.usages.length > 0;
    case 'undescribed':
      return isUndescribed(img);
    default:
      return true;
  }
}

export function PhotoLibrary({
  images: initial,
  trashCount,
  openUpload = false,
  openPhoto,
  initialFilter,
}: {
  images: AdminImage[];
  trashCount: number;
  openUpload?: boolean;
  openPhoto?: string;
  initialFilter?: string;
}) {
  const [images, setImages] = useState(initial);
  const [syncedFrom, setSyncedFrom] = useState(initial);
  const [filter, setFilter] = useState<Filter>(initialFilter === 'zonder-beschrijving' ? 'undescribed' : 'all');
  const [reorder, setReorder] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(openPhoto && initial.some((i) => i.id === openPhoto) ? openPhoto : null);
  useCleanUrl(['foto', 'toevoegen', 'filter']);
  const [uploadOpen, setUploadOpen] = useState(openUpload);
  const [droppedFiles, setDroppedFiles] = useState<File[] | null>(null);
  const [pageDrag, setPageDrag] = useState(false);
  const { run } = useAdminAction();

  // Take over fresh server data after every refresh.
  if (initial !== syncedFrom) {
    setSyncedFrom(initial);
    setImages(initial);
  }

  // Desktop: drop photos anywhere on the page.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setPageDrag(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setPageDrag(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setPageDrag(false);
      if (document.querySelector('dialog[open]')) return;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) {
        setDroppedFiles(files);
        setUploadOpen(true);
      }
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);

  const saveOrder = (next: AdminImage[]) => {
    setImages(next);
    void run(() => reorderImages({ ids: next.map((i) => i.id) }), { success: 'Volgorde opgeslagen.' });
  };

  const toggleVisible = (img: AdminImage) => {
    setImages((list) => list.map((i) => (i.id === img.id ? { ...i, isVisible: !img.isVisible, isFeatured: img.isVisible ? false : i.isFeatured } : i)));
    void run(() => setImageFlags({ id: img.id, isVisible: !img.isVisible, ...(img.isVisible ? { isFeatured: false } : {}) }));
  };

  const shown = reorder ? images : images.filter((i) => matches(i, filter));
  const visibleCount = images.filter((i) => i.isVisible).length;
  const selected = images.find((i) => i.id === selectedId) ?? null;

  return (
    <>
      <PageTitle
        title="Foto's"
        description={
          images.length === 0
            ? "Hier beheer je alle foto's van de website."
            : `${images.length} ${images.length === 1 ? 'foto' : "foto's"} · ${visibleCount} zichtbaar in de galerij`
        }
        actions={
          reorder ? (
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => setReorder(false)}>
              <CheckIcon size={18} /> Klaar
            </button>
          ) : (
            <>
              {images.length > 1 && (
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => {
                    setFilter('all');
                    setReorder(true);
                  }}
                >
                  Volgorde aanpassen
                </button>
              )}
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  setDroppedFiles(null);
                  setUploadOpen(true);
                }}
              >
                <PlusIcon size={18} /> Foto toevoegen
              </button>
            </>
          )
        }
      />

      {images.length === 0 ? (
        <EmptyState icon={<ImageIcon size={28} />} title="Nog geen foto's">
          <p>Voeg foto&apos;s toe van je zaak en je gerechten. Ze verschijnen in de galerij en kun je gebruiken op de homepage en bij de menukaart.</p>
          <button type="button" className="admin-btn admin-btn-primary mt-6" onClick={() => setUploadOpen(true)}>
            <PlusIcon size={18} /> Foto toevoegen
          </button>
        </EmptyState>
      ) : reorder ? (
        <>
          <div className="mb-5 rounded-md border border-line bg-white p-4 text-[0.97rem] text-ink-soft" role="note">
            <strong className="text-ink">Volgorde aanpassen:</strong> sleep een foto naar een andere plek. Op je telefoon houd je de foto even vast en sleep je
            hem. Of gebruik de pijltjes. Deze volgorde zie je ook op de website. Wijzigingen worden direct opgeslagen.
          </div>
          <SortableArea items={images} onReorder={saveOrder} layout="grid" labelOf={(i) => i.title || 'Foto'}>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img, index) => (
                <SortableTile key={img.id} image={img} index={index} total={images.length} onMove={(delta) => saveOrder(moveItem(images, index, delta))} />
              ))}
            </ul>
          </SortableArea>
        </>
      ) : (
        <>
          <div className="-mx-1 mb-5 overflow-x-auto px-1 [scrollbar-width:none]" role="group" aria-label="Filter foto's">
            <div className="flex gap-2">
              {FILTERS.map((f) => {
                const count = images.filter((i) => matches(i, f.key)).length;
                if (f.key === 'undescribed' && count === 0 && filter !== f.key) return null;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={filter === f.key}
                    onClick={() => setFilter(f.key)}
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-white px-4 text-[0.95rem] font-medium aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
                  >
                    {f.label} <span className="tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {shown.length === 0 ? (
            <p className="py-10 text-center text-muted">Geen foto&apos;s in deze selectie.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((img) => (
                <PhotoTile key={img.id} image={img} onOpen={() => setSelectedId(img.id)} onToggleVisible={() => toggleVisible(img)} />
              ))}
            </ul>
          )}
          <p className="mt-6 hidden text-sm text-muted md:block">Tip: je kunt foto&apos;s ook vanaf je computer naar deze pagina slepen.</p>
        </>
      )}

      {trashCount > 0 && !reorder && (
        <Link href="/admin/fotos/prullenbak" className="admin-btn admin-btn-ghost mt-6 -ml-2">
          <TrashIcon size={18} /> Prullenbak ({trashCount})
        </Link>
      )}

      {pageDrag && !uploadOpen && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-tomato/15 p-6 backdrop-blur-[1px]">
          <div className="rounded-lg border-2 border-dashed border-tomato bg-white px-10 py-8 text-center shadow-xl">
            <p className="font-display text-2xl">Laat los om te uploaden</p>
          </div>
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        initialFiles={droppedFiles}
        onClose={() => {
          setUploadOpen(false);
          setDroppedFiles(null);
        }}
      />
      <PhotoDetailsDialog image={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}

function Badges({ image }: { image: AdminImage }) {
  const hero = image.usages.some((u) => u.label.startsWith('Hoofdfoto'));
  return (
    <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
      {hero && (
        <span className="admin-badge bg-ink/85 text-white">
          <HomeIcon size={13} /> Hoofdfoto
        </span>
      )}
      {image.isFeatured && (
        <span className="admin-badge bg-crust text-white">
          <StarIcon size={13} filled /> Uitgelicht
        </span>
      )}
      {!image.isVisible && (
        <span className="admin-badge bg-white/90 text-ink">
          <EyeOffIcon size={13} /> Verborgen
        </span>
      )}
    </div>
  );
}

function usageSummary(image: AdminImage): string {
  if (image.usages.length === 0) return 'Nog nergens gebruikt';
  const labels = image.usages.map((u) => (u.label.startsWith('Menukaart:') ? 'Menukaart' : u.label.startsWith('Aanbieding:') ? 'Aanbieding' : u.label));
  return [...new Set(labels)].join(' · ');
}

function PhotoTile({ image, onOpen, onToggleVisible }: { image: AdminImage; onOpen: () => void; onToggleVisible: () => void }) {
  return (
    <li className="group overflow-hidden rounded-lg border border-line bg-white">
      <button type="button" onClick={onOpen} className="relative block w-full text-left" aria-label={`${image.title || 'Foto'} bekijken en bewerken`}>
        <img
          src={image.thumbUrl}
          alt=""
          loading="lazy"
          className={`aspect-square w-full object-cover transition-opacity ${image.isVisible ? '' : 'opacity-60'}`}
          style={{ backgroundImage: `url(${image.placeholder})`, backgroundSize: 'cover' }}
        />
        <Badges image={image} />
      </button>
      <div className="flex items-start gap-1 p-2.5 pr-1.5">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className={`block truncate font-medium ${image.title ? '' : 'text-muted'}`}>{image.title || 'Naamloze foto'}</span>
          <span className="block truncate text-sm text-muted">{usageSummary(image)}</span>
        </button>
        <button
          type="button"
          onClick={onToggleVisible}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted hover:bg-paper hover:text-ink"
          aria-label={image.isVisible ? `${image.title || 'Foto'} verbergen in de galerij` : `${image.title || 'Foto'} zichtbaar maken in de galerij`}
          title={image.isVisible ? 'Zichtbaar · klik om te verbergen' : 'Verborgen · klik om zichtbaar te maken'}
        >
          {image.isVisible ? <EyeIcon size={20} /> : <EyeOffIcon size={20} />}
        </button>
      </div>
    </li>
  );
}

function SortableTile({ image, index, total, onMove }: { image: AdminImage; index: number; total: number; onMove: (delta: -1 | 1) => void }) {
  const { setNodeRef, style, handleProps, isDragging } = useSortableItem(image.id);
  return (
    <li ref={setNodeRef} style={style} className={`overflow-hidden rounded-lg border bg-white ${isDragging ? 'border-tomato shadow-xl' : 'border-line'}`}>
      <div
        {...handleProps}
        className="relative block w-full cursor-grab touch-none select-none active:cursor-grabbing"
        aria-label={`${image.title || 'Foto'}, plek ${index + 1} van ${total}. Versleep om te verplaatsen.`}
      >
        <img src={image.thumbUrl} alt="" draggable={false} className="pointer-events-none aspect-square w-full object-cover" />
        <span className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-ink shadow">
          <GripIcon size={18} />
        </span>
        <span className="absolute bottom-2 left-2 admin-badge bg-ink/85 text-white tabular-nums">{index + 1}</span>
      </div>
      <div className="flex items-center justify-between gap-1 p-1.5">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
          aria-label={`${image.title || 'Foto'} naar voren`}
        >
          <ArrowLeftIcon size={20} />
        </button>
        <span className="truncate text-sm text-muted">{image.title || 'Naamloze foto'}</span>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-paper disabled:opacity-30"
          aria-label={`${image.title || 'Foto'} naar achteren`}
        >
          <ArrowRightIcon size={20} />
        </button>
      </div>
    </li>
  );
}

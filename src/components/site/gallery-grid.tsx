'use client';

/* eslint-disable @next/next/no-img-element -- images are pre-optimised responsive WebP variants */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from '@/components/ui/icons';
import type { PublicImage } from '@/lib/images/public';
import { Picture } from './picture';

export function GalleryGrid({ images }: { images: PublicImage[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const open = (i: number) => {
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const go = useCallback((delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)), [images.length]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    const onClose = () => setIndex(null);
    dialog.addEventListener('keydown', onKey);
    dialog.addEventListener('close', onClose);
    return () => {
      dialog.removeEventListener('keydown', onKey);
      dialog.removeEventListener('close', onClose);
    };
  }, [go]);

  const current = index !== null ? images[index] : null;
  const neighbours = index !== null ? [images[(index + 1) % images.length], images[(index - 1 + images.length) % images.length]] : [];

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={() => open(i)}
              className="group relative block w-full overflow-hidden rounded-sm bg-line"
              aria-label={`Foto ${i + 1} van ${images.length} vergroten${img.alt ? `: ${img.alt}` : ''}`}
            >
              <Picture
                image={img}
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                priority={i < 4}
                alt=""
                className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Foto bekijken"
        className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          const t = e.changedTouches[0];
          touchStart.current = null;
          if (!start || !t) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
          else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
        }}
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-3 py-2 sm:px-5">
              <p className="text-sm text-white/75" aria-live="polite">
                {index! + 1} van {images.length}
              </p>
              <button
                type="button"
                onClick={close}
                className="inline-flex size-12 items-center justify-center rounded-full hover:bg-white/10"
                aria-label="Sluiten"
              >
                <CloseIcon size={24} />
              </button>
            </div>
            <figure className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-2 pb-4 sm:px-20">
              <img
                key={current.id}
                src={current.largest}
                srcSet={current.srcSet}
                sizes="100vw"
                alt={current.alt}
                width={current.width}
                height={current.height}
                className="reveal max-h-full min-h-0 w-auto max-w-full object-contain"
              />
              {current.caption && <figcaption className="mt-3 max-w-2xl px-4 text-center text-white/85">{current.caption}</figcaption>}
            </figure>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-white/15 sm:inline-flex"
                  aria-label="Vorige foto"
                >
                  <ArrowLeftIcon size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-2 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 hover:bg-white/15 sm:inline-flex"
                  aria-label="Volgende foto"
                >
                  <ArrowRightIcon size={24} />
                </button>
                <div className="flex justify-center gap-4 pb-5 sm:hidden">
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    className="inline-flex size-12 items-center justify-center rounded-full bg-white/10"
                    aria-label="Vorige foto"
                  >
                    <ArrowLeftIcon size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    className="inline-flex size-12 items-center justify-center rounded-full bg-white/10"
                    aria-label="Volgende foto"
                  >
                    <ArrowRightIcon size={22} />
                  </button>
                </div>
              </>
            )}
            <div hidden>{neighbours.map((n) => n && <img key={n.id} src={n.src} alt="" loading="lazy" />)}</div>
          </div>
        )}
      </dialog>
    </>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { CloseIcon } from '@/components/ui/icons';

/**
 * The printed trifold menu. The folded leaflet opens a full-screen view in
 * which it unfolds in 3D (cover first, then the inner flap) and can be turned
 * over to see the outside. The full menu is also on the page as text, so the
 * images are a visual extra.
 */

const SRC = '/menukaart/folder';
// Native size of one panel; the leaflet is three panels wide.
const PANEL_W = 264;
const PANEL_H = 561;
const RATIO = (PANEL_W * 3) / PANEL_H;
const FOLD_MS = 1330;

type Side = 'binnen' | 'buiten';

function useFolderSize(active: boolean) {
  const [size, setSize] = useState({ w: 0, h: 0, scale: 1 });
  useEffect(() => {
    if (!active) return;
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availW = vw - (vw < 640 ? 24 : 96);
      const availH = vh - (vh < 500 ? 110 : 190);
      const w = Math.max(240, Math.min(availW, availH * RATIO, PANEL_W * 3 * 1.25));
      const h = w / RATIO;
      // Closed, only one panel shows; make it larger so the cover is easy to see.
      const scale = Math.max(1, Math.min(availH / h, (vw * 0.62) / (w / 3), 2.2));
      setSize({ w, h, scale });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active]);
  return size;
}

function Face({ src, face }: { src: string; face: 'voor' | 'achter' }) {
  return (
    <div className="folder-face" data-face={face}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static panel images, already optimised */}
      <img src={`${SRC}/${src}.webp`} alt="" width={PANEL_W} height={PANEL_H} decoding="async" draggable={false} />
    </div>
  );
}

export function MenuFolder({ date = 'november 2025', className = '', tone = 'light' }: { date?: string; className?: string; tone?: 'light' | 'dark' }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [side, setSide] = useState<Side>('binnen');
  // Jump straight to the folded state when the view opens, without animating.
  const [instant, setInstant] = useState(true);
  const size = useFolderSize(visible);

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    if (!visible) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, [visible]);

  const show = async (e: React.MouseEvent) => {
    e.preventDefault();
    setMounted(true);
    setInstant(true);
    setVisible(true);
    setClosing(false);
    setSide('binnen');
    setOpen(false);
    dialogRef.current?.showModal();
    // Wait for the panels to load so the leaflet does not unfold half-empty.
    await new Promise((r) => requestAnimationFrame(r));
    const images = Array.from(folderRef.current?.querySelectorAll('img') ?? []);
    await Promise.race([Promise.all(images.map((img) => img.decode().catch(() => null))), new Promise((r) => setTimeout(r, 1500))]);
    setInstant(false);
    later(() => setOpen(true), reducedMotion() ? 0 : 280);
  };

  const hide = () => {
    if (closing) return;
    const finish = () => {
      dialogRef.current?.close();
      setVisible(false);
      setClosing(false);
      setSide('binnen');
    };
    setOpen(false);
    if (reducedMotion()) return finish();
    setClosing(true);
    later(finish, FOLD_MS);
  };

  return (
    <>
      <a
        href={`${SRC}/binnenkant.webp`}
        onClick={show}
        onPointerEnter={() => setMounted(true)}
        onFocus={() => setMounted(true)}
        className={`folder-cover-wrap group inline-flex flex-col items-center gap-5 ${className}`}
        aria-label={`Bekijk de menukaart-folder (${date})`}
      >
        <span className="folder-cover w-[11.5rem] sm:w-[13rem] lg:w-[15rem]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static image */}
          <img src={`${SRC}/buiten-3.webp`} alt="" width={PANEL_W} height={PANEL_H} />
        </span>
        <span
          className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] [font-stretch:85%] ${tone === 'dark' ? 'text-white' : 'text-ink'}`}
        >
          <span className="inline-block h-0.5 w-6 bg-tomato transition-all duration-300 group-hover:w-9" aria-hidden="true" />
          Open de folder
        </span>
      </a>

      <dialog
        ref={dialogRef}
        className="folder-dialog"
        aria-label={`Menukaart-folder, ${date}`}
        data-closing={closing ? 'true' : undefined}
        onCancel={(e) => {
          e.preventDefault();
          hide();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) hide();
        }}
      >
        {mounted && (
          <div className="flex h-full flex-col" onClick={(e) => e.target === e.currentTarget && hide()}>
            <div className="flex items-center justify-between gap-4 px-4 pt-4 sm:px-8 sm:pt-6">
              <p className="text-sm font-bold uppercase tracking-[0.1em] text-white/80 [font-stretch:85%]">Menukaart · {date}</p>
              <button
                type="button"
                onClick={hide}
                className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Folder sluiten"
              >
                <CloseIcon size={22} />
              </button>
            </div>

            <div className="folder-stage flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.target === e.currentTarget && hide()}>
              <div className="relative" style={{ width: size.w, height: size.h }}>
                <div
                  className={`folder-shadow ${instant ? 'folder-instant' : ''}`}
                  data-open={open}
                  style={{ '--closed-scale': size.scale } as React.CSSProperties}
                  aria-hidden="true"
                />
                <div
                  ref={folderRef}
                  className={`folder h-full w-full ${instant ? 'folder-instant' : ''}`}
                  data-open={open}
                  data-side={side}
                  style={{ '--closed-scale': size.scale } as React.CSSProperties}
                  role="img"
                  aria-label={side === 'binnen' ? 'Binnenkant van de folder met de menukaart' : 'Buitenkant van de folder met de menukaart en contactgegevens'}
                  onClick={() => !open && !closing && setOpen(true)}
                >
                  <div className="folder-panel" data-panel="links">
                    <Face src="binnen-1" face="voor" />
                    <Face src="buiten-3" face="achter" />
                  </div>
                  <div className="folder-panel" data-panel="midden">
                    <Face src="binnen-2" face="voor" />
                    <Face src="buiten-2" face="achter" />
                  </div>
                  <div className="folder-panel" data-panel="rechts">
                    <Face src="binnen-3" face="voor" />
                    <Face src="buiten-1" face="achter" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 px-4 pb-5 pt-3 sm:pb-8">
              <div className="inline-flex rounded-full bg-white/10 p-1" role="group" aria-label="Kant van de folder">
                {(['binnen', 'buiten'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={side === s}
                    disabled={!open}
                    onClick={() => setSide(s)}
                    className="min-h-10 rounded-full px-4 text-sm font-bold uppercase tracking-[0.06em] text-white/80 transition-colors [font-stretch:85%] hover:text-white disabled:opacity-50 aria-pressed:bg-white aria-pressed:text-ink"
                  >
                    {s === 'binnen' ? 'Binnenkant' : 'Buitenkant'}
                  </button>
                ))}
              </div>
              <a
                href={`${SRC}/${side === 'binnen' ? 'binnenkant' : 'buitenkant'}.webp`}
                target="_blank"
                rel="noopener"
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold uppercase tracking-[0.06em] text-white underline decoration-tomato decoration-2 underline-offset-4 [font-stretch:85%] hover:decoration-white"
              >
                Vergroten
              </a>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

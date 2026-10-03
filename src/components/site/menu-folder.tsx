'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRightIcon, CloseIcon } from '@/components/ui/icons';
import type { PublicFolder } from '@/lib/content/folder-types';

/**
 * The printed trifold menu. The folded leaflet opens a full-screen view in
 * which it unfolds in 3D (cover first, then the inner flap) and can be turned
 * over to see the outside. The full menu is also on the page as text, so the
 * images are a visual extra.
 */

const FOLD_MS = 1330;

type Side = 'binnen' | 'buiten';

function useFolderSize(active: boolean, panelWidth: number, panelHeight: number) {
  const [size, setSize] = useState({ w: 0, h: 0, scale: 1 });
  useEffect(() => {
    if (!active) return;
    // The open leaflet is three panels wide.
    const ratio = (panelWidth * 3) / panelHeight;
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availW = vw - (vw < 640 ? 24 : 96);
      const availH = vh - (vh < 500 ? 110 : 190);
      const w = Math.max(240, Math.min(availW, availH * ratio, panelWidth * 3));
      const h = w / ratio;
      // Closed, only one panel shows; make it larger so the cover is easy to see.
      const scale = Math.max(1, Math.min(availH / h, (vw * 0.62) / (w / 3), 2.2));
      setSize({ w, h, scale });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [active, panelWidth, panelHeight]);
  return size;
}

function Face({ src, face, folder }: { src: string; face: 'voor' | 'achter'; folder: PublicFolder }) {
  return (
    <div className="folder-face" data-face={face}>
      {/* eslint-disable-next-line @next/next/no-img-element -- panels are generated at their display size */}
      <img src={src} alt="" width={folder.panelWidth} height={folder.panelHeight} decoding="async" draggable={false} />
    </div>
  );
}

export function MenuFolder({ folder, className = '', tone = 'light' }: { folder: PublicFolder; className?: string; tone?: 'light' | 'dark' }) {
  const title = folder.label ? `Menukaart · ${folder.label}` : 'Menukaart';
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
  const size = useFolderSize(visible, folder.panelWidth, folder.panelHeight);

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
        href={folder.sheets.binnen}
        onClick={show}
        onPointerEnter={() => setMounted(true)}
        onFocus={() => setMounted(true)}
        className={`folder-cover-wrap group relative isolate inline-flex flex-col items-center gap-5 ${className}`}
        aria-label={folder.label ? `Bekijk de menukaart-folder (${folder.label})` : 'Bekijk de menukaart-folder'}
      >
        <span className="folder-cover w-[11.5rem] sm:w-[13rem] lg:w-[15rem]">
          {/* The cover lifts now and then, showing the flap underneath. */}
          <span className="folder-cover-inner">
            {/* eslint-disable-next-line @next/next/no-img-element -- generated panel */}
            <img src={folder.panels.buiten[0]} alt="" width={folder.panelWidth} height={folder.panelHeight} className="folder-cover-under" />
            {/* eslint-disable-next-line @next/next/no-img-element -- generated panel */}
            <img src={folder.panels.buiten[2]} alt="" width={folder.panelWidth} height={folder.panelHeight} className="folder-cover-front" />
          </span>
        </span>
        <span
          className={`inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] [font-stretch:85%] ${tone === 'dark' ? 'text-white' : 'text-ink'}`}
        >
          <span className="inline-block h-0.5 w-6 bg-tomato transition-all duration-300 group-hover:w-9" aria-hidden="true" />
          Open de folder
          <ArrowRightIcon size={16} className="folder-hint-arrow text-tomato" aria-hidden="true" />
        </span>
      </a>

      <dialog
        ref={dialogRef}
        className="folder-dialog"
        aria-label={folder.label ? `Menukaart-folder, ${folder.label}` : 'Menukaart-folder'}
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
              <p className="text-sm font-bold uppercase tracking-[0.1em] text-white/80 [font-stretch:85%]">{title}</p>
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
                    <Face folder={folder} src={folder.panels.binnen[0]} face="voor" />
                    <Face folder={folder} src={folder.panels.buiten[2]} face="achter" />
                  </div>
                  <div className="folder-panel" data-panel="midden">
                    <Face folder={folder} src={folder.panels.binnen[1]} face="voor" />
                    <Face folder={folder} src={folder.panels.buiten[1]} face="achter" />
                  </div>
                  <div className="folder-panel" data-panel="rechts">
                    <Face folder={folder} src={folder.panels.binnen[2]} face="voor" />
                    <Face folder={folder} src={folder.panels.buiten[0]} face="achter" />
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
                href="/menukaart#gerechten"
                onClick={() => {
                  // Leave the flyer at once and jump to the menu as text.
                  dialogRef.current?.close();
                  setVisible(false);
                  setOpen(false);
                }}
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold uppercase tracking-[0.06em] text-white underline decoration-tomato decoration-2 underline-offset-4 [font-stretch:85%] hover:decoration-white"
              >
                Als tekst lezen
              </a>
              <a
                href={folder.sheets[side]}
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

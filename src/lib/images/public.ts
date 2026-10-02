import { mediaUrl } from './storage';

export type ImageRecord = {
  id: string;
  storageKey: string;
  altText: string;
  caption: string;
  title: string;
  width: number;
  height: number;
  variantWidths: number[];
  placeholder: string;
};

export type PublicImage = {
  id: string;
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  title: string;
  placeholder: string;
  ogUrl: string;
  largest: string;
};

/** Builds `src`/`srcset` for our pre-generated WebP variants. */
export function toPublicImage(img: ImageRecord): PublicImage {
  const widths = [...img.variantWidths].sort((a, b) => a - b);
  const pick = widths.filter((w) => w <= 1280).at(-1) ?? widths[0]!;
  return {
    id: img.id,
    src: mediaUrl(img.storageKey, `${pick}w.webp`),
    srcSet: widths.map((w) => `${mediaUrl(img.storageKey, `${w}w.webp`)} ${w}w`).join(', '),
    width: img.width,
    height: img.height,
    alt: img.altText,
    caption: img.caption,
    title: img.title,
    placeholder: img.placeholder,
    ogUrl: mediaUrl(img.storageKey, 'og.jpg'),
    largest: mediaUrl(img.storageKey, `${widths.at(-1)}w.webp`),
  };
}

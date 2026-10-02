/* eslint-disable @next/next/no-img-element -- images are pre-optimised into responsive WebP variants on upload */
import type { PublicImage } from '@/lib/images/public';

type Props = {
  image: PublicImage;
  sizes: string;
  priority?: boolean;
  className?: string;
  alt?: string;
};

/** Responsive, lazy-loaded image with a blurred placeholder and fixed dimensions (no layout shift). */
export function Picture({ image, sizes, priority = false, className = '', alt }: Props) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt ?? image.alt}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
      style={image.placeholder ? { backgroundImage: `url(${image.placeholder})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    />
  );
}

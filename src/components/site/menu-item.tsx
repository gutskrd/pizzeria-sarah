import type { PublicMenuItem } from '@/lib/content/queries';
import { formatPrice } from '@/lib/format';
import { Picture } from './picture';

function PriceText({ item }: { item: PublicMenuItem }) {
  if (item.priceCents !== null) return <>{formatPrice(item.priceCents)}</>;
  if (item.variants.length) return <>vanaf {formatPrice(Math.min(...item.variants.map((v) => v.priceCents)))}</>;
  return null;
}

export function MenuItemRow({
  item,
  headingLevel = 'h3',
  showCategory = false,
  reveal,
}: {
  item: PublicMenuItem;
  headingLevel?: 'h3' | 'h4';
  showCategory?: boolean;
  /** Position in a list that fades in while scrolling. */
  reveal?: number;
}) {
  const Heading = headingLevel;
  const hasPrice = item.priceCents !== null || item.variants.length > 0;
  return (
    <li
      id={showCategory ? undefined : `gerecht-${item.id}`}
      className="menu-row scroll-mt-40 flex gap-4 border-b border-line py-3.5"
      data-reveal={reveal !== undefined ? '' : undefined}
      style={reveal !== undefined ? ({ '--reveal-i': reveal } as React.CSSProperties) : undefined}
    >
      {item.number && <span className="w-7 shrink-0 pt-[0.2rem] text-sm font-semibold tabular-nums text-muted">{item.number}</span>}
      <div className="min-w-0 flex-1">
        {showCategory && <p className="mb-0.5 text-xs font-bold uppercase tracking-[0.1em] text-tomato [font-stretch:85%]">{item.categoryName}</p>}
        <div className="flex items-baseline justify-between gap-4">
          <Heading className="min-w-0 text-[1.15rem] leading-snug [font-stretch:85%]">
            {item.name}
            {item.isFeatured && !showCategory && (
              <span className="ml-2 inline-flex translate-y-[-2px] items-center rounded-full bg-tomato px-2 py-0.5 align-middle text-[0.68rem] font-bold uppercase tracking-[0.08em] text-white [font-stretch:90%]">
                Aanrader
              </span>
            )}
          </Heading>
          {hasPrice && (
            <span className="shrink-0 whitespace-nowrap text-[1.05rem] font-bold tabular-nums">
              <PriceText item={item} />
            </span>
          )}
        </div>
        {item.description && <p className="mt-0.5 max-w-prose text-[0.95rem] leading-snug text-muted">{item.description}</p>}
        {item.variants.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem]" aria-label={`Prijzen voor ${item.name}`}>
            {item.variants.map((v) => (
              <li key={v.label}>
                <span className="text-muted">{v.label}</span> <span className="font-semibold tabular-nums">{formatPrice(v.priceCents)}</span>
              </li>
            ))}
          </ul>
        )}
        {item.allergens && (
          <p className="mt-1.5 text-sm text-ink-soft">
            <span className="font-semibold">Allergenen:</span> {item.allergens}
          </p>
        )}
      </div>
      {item.image && (
        <div className="w-16 shrink-0 self-start overflow-hidden rounded-sm bg-line sm:w-20">
          <Picture image={item.image} sizes="80px" className="aspect-square h-full w-full object-cover" alt={item.image.alt || item.name} />
        </div>
      )}
    </li>
  );
}

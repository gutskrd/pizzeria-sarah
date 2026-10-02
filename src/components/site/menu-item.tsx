import type { PublicMenuItem } from '@/lib/content/queries';
import { formatPrice } from '@/lib/format';
import { Picture } from './picture';

function PriceText({ item }: { item: PublicMenuItem }) {
  if (item.priceCents !== null) return <>{formatPrice(item.priceCents)}</>;
  if (item.variants.length) return <>vanaf {formatPrice(Math.min(...item.variants.map((v) => v.priceCents)))}</>;
  return null;
}

export function MenuItemRow({ item, headingLevel = 'h3', showCategory = false }: { item: PublicMenuItem; headingLevel?: 'h3' | 'h4'; showCategory?: boolean }) {
  const Heading = headingLevel;
  const hasPrice = item.priceCents !== null || item.variants.length > 0;
  return (
    <li className="flex gap-4 border-b border-line py-5 last:border-b-0">
      <div className="min-w-0 flex-1">
        {showCategory && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{item.categoryName}</p>}
        <div className="flex items-baseline gap-3">
          <Heading className="min-w-0 font-display text-[1.2rem] font-medium leading-snug md:text-[1.3rem]">
            {item.number && <span className="mr-2 font-sans text-base font-semibold tabular-nums text-muted">{item.number}</span>}
            {item.name}
          </Heading>
          {hasPrice && (
            <>
              <span className="leader hidden min-[380px]:block" aria-hidden="true" />
              <span className="ml-auto shrink-0 whitespace-nowrap font-semibold tabular-nums">
                <PriceText item={item} />
              </span>
            </>
          )}
        </div>
        {item.description && <p className="mt-1.5 max-w-prose text-[0.97rem] text-muted">{item.description}</p>}
        {item.variants.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.95rem]" aria-label={`Prijzen voor ${item.name}`}>
            {item.variants.map((v) => (
              <li key={v.label}>
                <span className="text-muted">{v.label}</span> <span className="font-medium tabular-nums">{formatPrice(v.priceCents)}</span>
              </li>
            ))}
          </ul>
        )}
        {item.allergens && (
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-semibold">Allergenen:</span> {item.allergens}
          </p>
        )}
      </div>
      {item.image && (
        <div className="w-20 shrink-0 overflow-hidden rounded-sm bg-line sm:w-28">
          <Picture image={item.image} sizes="112px" className="aspect-square h-full w-full object-cover" alt={item.image.alt || item.name} />
        </div>
      )}
    </li>
  );
}

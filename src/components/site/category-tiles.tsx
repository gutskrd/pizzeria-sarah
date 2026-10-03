import Link from 'next/link';
import type { PublicMenuCategory } from '@/lib/content/queries';
import { formatPrice } from '@/lib/format';
import { FoodIcon } from './food-icon';

function lowestPrice(category: PublicMenuCategory): number | null {
  const prices = category.items.flatMap((i) => (i.variants.length ? i.variants.map((v) => v.priceCents) : i.priceCents !== null ? [i.priceCents] : []));
  return prices.length ? Math.min(...prices) : null;
}

/** "Waar heb je zin in?": every menu category as a tile, straight to that part of the menu. */
export function CategoryTiles({ menu }: { menu: PublicMenuCategory[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
      {menu.map((c, i) => {
        const from = lowestPrice(c);
        return (
          <li key={c.id} data-reveal style={{ '--reveal-i': i % 5 } as React.CSSProperties}>
            <Link
              href={`/menukaart#${c.slug}`}
              className="zin-tile group flex h-full flex-col rounded-[4px] border border-line bg-white p-4 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-tomato/40 hover:shadow-[0_18px_36px_-20px_rgba(216,31,38,0.55)] sm:p-5"
            >
              <span className="zin-icon inline-flex size-12 items-center justify-center rounded-full bg-tomato-soft text-tomato transition-colors duration-300 group-hover:bg-tomato group-hover:text-white">
                <FoodIcon name={c.name} size={26} />
              </span>
              <span className="mt-3 text-[1.15rem] font-extrabold uppercase leading-tight [font-stretch:78%] sm:text-[1.25rem]">{c.name}</span>
              <span className="mt-1 text-sm text-muted">
                {c.items.length} {c.items.length === 1 ? 'gerecht' : 'gerechten'}
                {from !== null && (
                  <>
                    {' · '}
                    <span className="whitespace-nowrap font-semibold text-ink">vanaf {formatPrice(from)}</span>
                  </>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

import type { PublicOffer } from '@/lib/content/queries';
import { formatCalendarDate } from '@/lib/format';
import { Picture } from './picture';

export function OffersList({ offers }: { offers: PublicOffer[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-2">
      {offers.map((offer) => (
        <li key={offer.id} className="flex flex-col overflow-hidden rounded-md border border-line bg-cream sm:flex-row">
          {offer.image && (
            <div className="sm:w-2/5">
              <Picture
                image={offer.image}
                sizes="(min-width: 768px) 20vw, 100vw"
                className="aspect-[4/3] h-full w-full object-cover"
                alt={offer.image.alt || offer.title}
              />
            </div>
          )}
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <h3 className="font-display text-2xl">{offer.title}</h3>
            {offer.priceText && <p className="mt-1 text-lg font-semibold text-tomato">{offer.priceText}</p>}
            {offer.description && <p className="mt-2 whitespace-pre-line text-muted">{offer.description}</p>}
            {offer.endsOn && <p className="mt-auto pt-4 text-sm text-ink-soft">Geldig t/m {formatCalendarDate(offer.endsOn)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

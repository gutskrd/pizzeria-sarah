import { BagIcon, ClockIcon, GrillIcon, HeartIcon, PizzaIcon, SeatIcon } from '@/components/ui/icons';
import type { HighlightIcon as IconName } from '@/lib/db/schema';

const ICONS = { seat: SeatIcon, pizza: PizzaIcon, clock: ClockIcon, grill: GrillIcon, heart: HeartIcon, bag: BagIcon } as const;

export function HighlightIcon({ name, size = 28 }: { name: IconName; size?: number }) {
  const Icon = ICONS[name] ?? HeartIcon;
  return <Icon size={size} />;
}

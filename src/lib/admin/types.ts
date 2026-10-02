/** Shapes shared between admin server code and client components (no server imports). */

export type ImageUsage = { label: string; critical: boolean; href?: string };

export type AdminImage = {
  id: string;
  thumbUrl: string;
  previewUrl: string;
  title: string;
  altText: string;
  caption: string;
  isVisible: boolean;
  isFeatured: boolean;
  width: number;
  height: number;
  createdAt: string;
  deletedAt: string | null;
  placeholder: string;
  usages: ImageUsage[];
};

export type AdminMenuItem = {
  id: string;
  categoryId: string;
  number: string;
  name: string;
  description: string;
  priceCents: number | null;
  variants: Array<{ label: string; priceCents: number }>;
  allergens: string;
  image: { id: string; thumbUrl: string; title: string } | null;
  isVisible: boolean;
  isFeatured: boolean;
};

export type AdminMenuCategory = {
  id: string;
  name: string;
  description: string;
  isVisible: boolean;
  items: AdminMenuItem[];
};

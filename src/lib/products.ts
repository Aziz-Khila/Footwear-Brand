import { assetUrl, brand, brandProducts } from "./brand";
import { scaleForAspect } from "./scale";
import type { ProductData, ProductImage } from "./schema";

export type ProductView = { src: string; width: number; height: number; scale: number };

export type Product = Omit<ProductData, "image" | "gallery"> & {
  /** The wall photo (side profile) */
  image: ProductView;
  /** Every view for the product page, starting with the wall photo */
  views: ProductView[];
};

export const SIZES = brand.commerce.sizes;

const toView = (img: ProductImage, scale: number): ProductView => ({
  src: assetUrl(img.file),
  width: img.width,
  height: img.height,
  scale,
});

export const products: Product[] = brandProducts.map(({ image, gallery, ...p }) => {
  const main = toView(image, p.scale);
  return {
    ...p,
    image: main,
    views: [main, ...gallery.map((g) => toView(g, scaleForAspect(g.width / g.height)))],
  };
});

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

/** Columns of the desktop wall grid. */
export const WALL_COLUMNS = brand.layout.columns;

export function getNeighbors(slug: string) {
  const i = products.findIndex((p) => p.slug === slug);
  const n = products.length;
  const col = i % WALL_COLUMNS;
  return {
    index: i,
    prev: products[(i - 1 + n) % n],
    next: products[(i + 1) % n],
    // Only pairs that sit beside this one on the wall are shown flanking the hero,
    // so the zoom from the wall lands on the same shoes it started from.
    hasPrevOnWall: col > 0,
    hasNextOnWall: col < WALL_COLUMNS - 1 && i + 1 < n,
  };
}

export { formatPrice } from "./brand";

export const pad = (n: number) => String(n).padStart(2, "0");

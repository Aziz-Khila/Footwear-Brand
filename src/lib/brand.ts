import brandJson from "@/brand/brand.json";
import productsJson from "@/brand/products.json";
import { DEFAULT_LANDING, DEFAULT_SOCIALS } from "./defaults";
import type { BrandConfig, ProductData } from "./schema";

type BrandFile = Omit<BrandConfig, "landing" | "socials" | "logoText"> & {
  landing?: Partial<BrandConfig["landing"]>;
  socials?: BrandConfig["socials"];
  logoText?: boolean;
};
type ProductFile = Omit<ProductData, "gallery"> & { gallery?: ProductData["gallery"] };

/**
 * The brand this storefront renders. Edited through the admin, or by hand in src/brand/.
 * Validated on the server by validateBrand(), so zod stays out of the client bundle;
 * fields added after a brand was created fall back to their defaults here.
 */
const file = brandJson as unknown as BrandFile;
const landing = { ...DEFAULT_LANDING, ...file.landing };
// Older brands stored a single featured slug (or null)
const featured: unknown = landing.featured;
landing.featured = Array.isArray(featured) ? featured : typeof featured === "string" ? [featured] : [];

export const brand: BrandConfig = {
  ...file,
  logoText: file.logoText ?? true,
  socials: { ...DEFAULT_SOCIALS, ...file.socials },
  landing,
};

export const brandProducts: ProductData[] = (productsJson as ProductFile[]).map((p) => ({
  ...p,
  gallery: p.gallery ?? [],
}));

export const assetUrl = (file: string) => `/brand/${file}`;

const priceFormat = new Intl.NumberFormat(brand.commerce.locale, {
  style: "currency",
  currency: brand.commerce.currency,
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => priceFormat.format(value);

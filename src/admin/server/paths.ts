import path from "node:path";

export const ROOT = process.cwd();

/** Source of truth for every brand: brands/<id>/{brand.json, products.json, assets/} */
export const BRANDS_DIR = path.join(ROOT, "brands");

/** The brand the storefront renders (imported by src/lib/brand.ts) */
export const ACTIVE_DATA_DIR = path.join(ROOT, "src", "brand");
export const ACTIVE_ASSETS_DIR = path.join(ROOT, "public", "brand");

export const EXPORTS_DIR = path.join(ROOT, "exports");
export const MODEL_DIR = path.join(ROOT, ".cache", "models");

export const brandDir = (id: string) => path.join(BRANDS_DIR, id);
export const brandAssetsDir = (id: string) => path.join(BRANDS_DIR, id, "assets");

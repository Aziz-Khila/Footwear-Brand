import fs from "node:fs/promises";
import path from "node:path";
import { BrandSchema, ProductsSchema, type BrandConfig, type ProductData } from "@/lib/schema";
import { slugify as toSlug, uniqueSlug } from "@/lib/slug";
import { ACTIVE_ASSETS_DIR, ACTIVE_DATA_DIR, BRANDS_DIR, brandAssetsDir, brandDir } from "./paths";

export const slugify = (s: string) => toSlug(s, "brand");

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(file, "utf8")) as T;
const writeJson = (file: string, data: unknown) => fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");

export async function getActiveId(): Promise<string> {
  const active = await readJson<BrandConfig>(path.join(ACTIVE_DATA_DIR, "brand.json"));
  return active.id;
}

export async function listBrands() {
  const entries = await fs.readdir(BRANDS_DIR, { withFileTypes: true });
  const brands = await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (e) => {
        try {
          const b = await readJson<BrandConfig>(path.join(BRANDS_DIR, e.name, "brand.json"));
          const p = await readJson<ProductData[]>(path.join(BRANDS_DIR, e.name, "products.json"));
          return { id: b.id, name: b.name, products: p.length, accent: b.theme.accent };
        } catch {
          return null;
        }
      }),
  );
  return brands.filter((b) => b !== null).sort((a, b) => (a.id === "concept" ? -1 : a.name.localeCompare(b.name)));
}

/** Reads a brand with schema defaults applied, so fields added in later template versions are filled in. */
export async function readBrand(id: string) {
  const [rawBrand, rawProducts] = await Promise.all([
    readJson<BrandConfig>(path.join(brandDir(id), "brand.json")),
    readJson<ProductData[]>(path.join(brandDir(id), "products.json")),
  ]);
  const b = BrandSchema.safeParse(rawBrand);
  const p = ProductsSchema.safeParse(rawProducts);
  return { brand: b.success ? b.data : rawBrand, products: p.success ? p.data : rawProducts };
}

/** Writes to the brand folder and, if it is the brand on screen, to the storefront too. */
export async function saveBrand(id: string, input: unknown) {
  const brand = BrandSchema.parse({ ...(input as object), id });
  await writeJson(path.join(brandDir(id), "brand.json"), brand);
  if ((await getActiveId()) === id) await writeJson(path.join(ACTIVE_DATA_DIR, "brand.json"), brand);
  return brand;
}

export async function saveProducts(id: string, input: unknown) {
  const products = ProductsSchema.parse(input);
  if (products.length === 0) throw new Error("A brand needs at least one product.");
  const slugs = new Set(products.map((p) => p.slug));
  if (slugs.size !== products.length) throw new Error("Two products share the same URL slug.");
  await writeJson(path.join(brandDir(id), "products.json"), products);
  if ((await getActiveId()) === id) await writeJson(path.join(ACTIVE_DATA_DIR, "products.json"), products);
  return products;
}

export async function saveAsset(id: string, file: string, data: Buffer) {
  await fs.mkdir(brandAssetsDir(id), { recursive: true });
  await fs.writeFile(path.join(brandAssetsDir(id), file), data);
  if ((await getActiveId()) === id) {
    await fs.mkdir(ACTIVE_ASSETS_DIR, { recursive: true });
    await fs.writeFile(path.join(ACTIVE_ASSETS_DIR, file), data);
  }
}

export async function readAsset(id: string, file: string) {
  return fs.readFile(path.join(brandAssetsDir(id), path.basename(file)));
}

/** Puts a brand on screen: copies its data into src/brand and its assets into public/brand. */
export async function activateBrand(id: string) {
  const { brand, products } = await readBrand(id);
  await fs.rm(ACTIVE_ASSETS_DIR, { recursive: true, force: true });
  await fs.mkdir(ACTIVE_ASSETS_DIR, { recursive: true });
  await fs.cp(brandAssetsDir(id), ACTIVE_ASSETS_DIR, { recursive: true }).catch(() => {});
  // Products first: the storefront validates the pair, and brand.json carries the id
  await writeJson(path.join(ACTIVE_DATA_DIR, "products.json"), products);
  await writeJson(path.join(ACTIVE_DATA_DIR, "brand.json"), brand);
}

/** New brand = copy of an existing one under a new name, so it renders immediately. */
export async function createBrand(name: string, fromId: string) {
  const id = uniqueSlug(
    slugify(name),
    (await listBrands()).map((b) => b.id),
  );

  await fs.cp(brandDir(fromId), brandDir(id), { recursive: true });
  const { brand } = await readBrand(id);
  await writeJson(path.join(brandDir(id), "brand.json"), { ...brand, id, name });
  await activateBrand(id);
  return id;
}

export async function deleteBrand(id: string) {
  if (id === "concept") throw new Error("The concept brand is the template default and can't be deleted.");
  if ((await getActiveId()) === id) await activateBrand("concept");
  await fs.rm(brandDir(id), { recursive: true, force: true });
}

/** Asset filenames are unique per upload so browsers and the image optimizer never serve stale files. */
export const assetName = (prefix: string, ext: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`;

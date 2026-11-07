import "server-only";
import { brand, brandProducts } from "./brand";
import { BrandSchema, ProductsSchema } from "./schema";

let checked = false;

/** Fails the render (and the build) with a readable message if src/brand/ is malformed. */
export function validateBrand() {
  if (checked) return;
  const b = BrandSchema.safeParse(brand);
  const p = ProductsSchema.safeParse(brandProducts);
  const issues = [
    ...(b.success ? [] : b.error.issues.map((i) => `brand.json → ${i.path.join(".")}: ${i.message}`)),
    ...(p.success ? [] : p.error.issues.map((i) => `products.json → ${i.path.join(".")}: ${i.message}`)),
  ];
  if (brandProducts.length === 0) issues.push("products.json → add at least one product");
  if (issues.length) throw new Error(`Invalid brand data in src/brand/:\n${issues.join("\n")}`);
  checked = true;
}

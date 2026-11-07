import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductView } from "@/components/ProductView";
import { getNeighbors, getProduct, products } from "@/lib/products";

// A Suspense fallback here would break the wall → product shared-element morph,
// which needs the product to render in the same commit as the navigation.
export const instant = false;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} — ${product.colorway}`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const { index, prev, next, hasPrevOnWall, hasNextOnWall } = getNeighbors(slug);

  return (
    <ProductView
      key={product.slug}
      product={product}
      prev={prev}
      next={next}
      showPrev={hasPrevOnWall}
      showNext={hasNextOnWall}
      index={index}
      total={products.length}
    />
  );
}

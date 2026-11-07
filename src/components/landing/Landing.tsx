import { brand } from "@/lib/brand";
import { products } from "@/lib/products";
import { socialLinks } from "@/lib/socials";
import { Closing } from "./Closing";
import { Featured } from "./Featured";
import { Manifesto } from "./Manifesto";
import { Promises } from "./Promises";
import { Rack } from "./Rack";

/** Everything below the wall on the home page. Copy comes from the brand's `landing` settings. */
export function Landing() {
  const { landing, copy } = brand;
  const picked = landing.featured.flatMap((slug) => products.filter((p) => p.slug === slug));
  const featured = picked.length ? picked : products.slice(0, 1);
  const sections = [
    landing.manifesto.trim() ? "manifesto" : null,
    "featured",
    "rack",
    landing.promises.length ? "promises" : null,
  ].filter(Boolean) as string[];
  const n = (id: string) => `(${String(sections.indexOf(id) + 1).padStart(2, "0")})`;

  return (
    <div className="relative">
      {landing.manifesto.trim() && <Manifesto text={landing.manifesto} index={n("manifesto")} />}
      <Featured products={featured} label={landing.featuredLabel} index={n("featured")} />
      <Rack title={landing.rackTitle} products={products} index={n("rack")} />
      <Promises items={landing.promises} index={n("promises")} />
      <Closing
        name={brand.name}
        title={landing.closingTitle}
        newsletter={landing.newsletter}
        footerNote={copy.footerNote}
        socials={socialLinks(brand.socials)}
      />
    </div>
  );
}

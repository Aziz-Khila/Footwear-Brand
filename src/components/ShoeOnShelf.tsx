import Image from "next/image";
import { ViewTransition } from "react";
import { cameraMove } from "@/lib/camera";
import type { Product, ProductView } from "@/lib/products";

type Role = "wall" | "hero" | "neighbor";

/**
 * Every role requests the hero-sized file, so the image is already decoded when a
 * wall thumbnail zooms into the hero; otherwise the first frames of the zoom are blank.
 */
export const HERO_SIZES = "(min-width: 768px) 60vw, 90vw";

type UnitProps = {
  product: Product;
  /** Which photo to show; defaults to the wall photo. */
  view?: ProductView;
  /** Animate the photo in, for when the visitor switches views (never on mount, which would fight the page morph). */
  swap?: boolean;
  glow?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  style?: React.CSSProperties;
  role?: Role;
  vt?: string;
};

/**
 * A shoe resting on an acrylic shelf. All internal proportions are expressed in
 * container units so the wall thumbnail and the product hero are the same shape
 * at different scales, which makes the shared-element morph read as a camera zoom.
 */
export function ShelfUnit({ product, view, swap, glow, priority, sizes, className, style, role, vt }: UnitProps) {
  const image = view ?? product.image;
  return (
    <div className={`unit ${className ?? ""}`} data-glow={!!glow} data-role={role} data-vt={vt} style={style}>
      <div className="unit-stage">
        <div className="unit-contact" />
        <div
          key={image.src}
          className={`unit-shoe ${swap ? "unit-swap" : ""}`}
          style={{ width: `${image.scale * 100}%` }}
        >
          <Image
            src={image.src}
            alt={`${product.name} — ${product.colorway}`}
            width={image.width}
            height={image.height}
            priority={priority}
            sizes={sizes ?? HERO_SIZES}
            draggable={false}
            className="relative z-[1] h-auto w-full select-none"
          />
          <div
            aria-hidden
            className="unit-uplight"
            style={{ maskImage: `url(${image.src})`, WebkitMaskImage: `url(${image.src})` }}
          />
        </div>
      </div>
      <div className="shelf" />
    </div>
  );
}

/**
 * Neighbours only morph while browsing between products (prev/next). Coming from
 * the wall, only the clicked pair zooms into the hero and the neighbours fade in.
 * Wall units only take part in wall ⇄ product navigations, so links elsewhere on
 * the home page (featured, rack) don't fly a shoe in from the wall.
 */
const SHARE = {
  wall: { "nav-forward": "morph-wall", "nav-back": "morph-wall", default: "none" },
  hero: "morph-hero",
  neighbor: { "nav-prev": "morph-hero", "nav-next": "morph-hero", default: "none" },
} as const;

type Props = Omit<UnitProps, "role" | "vt" | "glow"> & {
  role: Role;
  /** Set to false to keep this unit out of shared-element morphs. */
  morph?: boolean;
};

export function ShoeOnShelf({ product, role, morph = true, ...unit }: Props) {
  const name = `unit-${product.slug}`;
  return (
    <ViewTransition
      name={name}
      share={morph ? SHARE[role] : "none"}
      default="none"
      onShare={role === "neighbor" ? undefined : (_, types) => cameraMove(name, types)}
    >
      <ShelfUnit product={product} role={role} vt={name} glow={role === "hero"} {...unit} />
    </ViewTransition>
  );
}

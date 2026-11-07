import { z } from "zod";
import { DEFAULT_LANDING, DEFAULT_SOCIALS } from "./defaults";

export const SANS_FONTS = [
  "geist",
  "inter",
  "inter-tight",
  "space-grotesk",
  "manrope",
  "dm-sans",
  "archivo",
  "syne",
  "unbounded",
  "bricolage-grotesque",
] as const;

export const MONO_FONTS = ["geist-mono", "jetbrains-mono", "ibm-plex-mono", "space-mono", "dm-mono"] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #ff6b1f");

export const BrandSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  tagline: z.string(),
  logo: z.string().nullable(),
  /** Show the brand name next to the logo (for symbol-only logos). */
  logoText: z.boolean().default(true),
  favicon: z.string().nullable(),
  /** Full URLs or @handles; empty ones are hidden. */
  socials: z
    .object({
      instagram: z.string(),
      tiktok: z.string(),
      x: z.string(),
      youtube: z.string(),
      facebook: z.string(),
      pinterest: z.string(),
    })
    .partial()
    .default(DEFAULT_SOCIALS),
  theme: z.object({
    accent: hex,
    ink: hex,
    mute: hex,
    wall: hex,
    spotlight: z.number().min(0).max(2),
    haze: z.number().min(0).max(2),
    sans: z.enum(SANS_FONTS),
    mono: z.enum(MONO_FONTS),
  }),
  copy: z.object({
    collection: z.string(),
    showroomLabel: z.string(),
    wallHeadline: z.string(),
    footerNote: z.string(),
    checkoutNotice: z.string(),
  }),
  commerce: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    locale: z.string().min(2),
    sizeSystem: z.string().min(1),
    sizes: z.array(z.string().min(1)).min(1),
    freeShippingThreshold: z.number().min(0),
  }),
  layout: z.object({
    columns: z.number().int().min(3).max(6),
  }),
  landing: z
    .object({
      manifesto: z.string(),
      /** Product slugs shown in the featured scene, in order; empty = the first product. */
      featured: z.preprocess(
        (v) => (v == null ? [] : typeof v === "string" ? [v] : v),
        z.array(z.string()).max(4),
      ),
      featuredLabel: z.string(),
      rackTitle: z.string(),
      promises: z.array(z.object({ title: z.string(), body: z.string() })).max(3),
      closingTitle: z.string(),
      newsletter: z.string(),
    })
    .default(DEFAULT_LANDING),
});

export const ImageSchema = z.object({
  file: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Set by the studio: "side" = clean side profile (wall-ready), "angle" = any other view. */
  view: z.enum(["side", "angle"]).optional(),
  /** Which way the toe points in a side view; wall photos are mirrored to face left. */
  facing: z.enum(["left", "right"]).optional(),
  /** Studio only: the unmirrored photo this mirrored copy was made from (restored when it leaves the wall). */
  mirrorOf: z.string().optional(),
});

export const ProductSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  line: z.string(),
  colorway: z.string(),
  price: z.number().min(0),
  description: z.string(),
  details: z.array(z.string()),
  soldOut: z.array(z.string()),
  /** Width of the shoe relative to its shelf, so high-tops and low-tops read at a similar visual weight. */
  scale: z.number().min(0.5).max(1),
  /** The wall photo: a side profile, toe pointing left. */
  image: ImageSchema,
  /** Extra views shown on the product page (other side, pair, top, details…). */
  gallery: z.array(ImageSchema).default([]),
});

export const ProductsSchema = z.array(ProductSchema);

export type BrandConfig = z.infer<typeof BrandSchema>;
export type ProductData = z.infer<typeof ProductSchema>;
export type ProductImage = z.infer<typeof ImageSchema>;
export type SansFont = (typeof SANS_FONTS)[number];
export type MonoFont = (typeof MONO_FONTS)[number];

export const FONT_LABELS: Record<SansFont | MonoFont, string> = {
  geist: "Geist",
  inter: "Inter",
  "inter-tight": "Inter Tight",
  "space-grotesk": "Space Grotesk",
  manrope: "Manrope",
  "dm-sans": "DM Sans",
  archivo: "Archivo",
  syne: "Syne",
  unbounded: "Unbounded",
  "bricolage-grotesque": "Bricolage Grotesque",
  "geist-mono": "Geist Mono",
  "jetbrains-mono": "JetBrains Mono",
  "ibm-plex-mono": "IBM Plex Mono",
  "space-mono": "Space Mono",
  "dm-mono": "DM Mono",
};

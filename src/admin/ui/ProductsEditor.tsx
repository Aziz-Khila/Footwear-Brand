"use client";

import { useRef, useState } from "react";
import { scaleForAspect } from "@/lib/scale";
import type { BrandConfig, ProductData, ProductImage } from "@/lib/schema";
import { slugify, uniqueSlug } from "@/lib/slug";
import { api, assetUrl, type UploadedShoe } from "./api";
import { Button, Chips, Field, NumberInput, Panel, Slider, TextArea, TextInput } from "./fields";

type Props = {
  brand: BrandConfig;
  products: ProductData[];
  onChange: (products: ProductData[]) => void;
  modelReady: boolean;
  onModelReady: () => void;
  onPreview: (slug: string) => void;
  onError: (message: string) => void;
};

/** Words photographers add to tell shots apart; ignored when grouping photos into one product. */
const VIEW_WORDS =
  /\b(side|front|back|rear|top|bottom|sole|outsole|detail|details|pair|angle|lateral|medial|left|right|view|alt|main|hero|copy|heel|toe)\b/gi;

/** "VAPOR 17 ELITE SG-PRO (2).png", "vapor-17-elite-sg-pro_front.jpg" → "Vapor 17 Elite Sg Pro" */
const productNameFromFile = (name: string) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/\(\d+\)/g, " ")
    .replace(/%20|[-_+]+/g, " ")
    .replace(VIEW_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    // Title-case, but keep short codes like "SG", "FG", "OG" in capitals
    .map((w) => (/^[A-Z]{1,2}$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ") || "New Pair";

/** Photos whose names only differ by a copy number or a view word become one product. */
function groupPhotos(files: File[]) {
  const groups = new Map<string, { name: string; files: File[] }>();
  for (const file of files) {
    const name = productNameFromFile(file.name);
    const key = slugify(name, "pair");
    const g = groups.get(key) ?? { name, files: [] };
    g.files.push(file);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * Side profiles first (best score first, toe-left preferred so nothing needs mirroring),
 * then the other views in upload order.
 */
const rankForWall = (shoes: UploadedShoe[]) => {
  const wallScore = (s: UploadedShoe) => s.sideScore + (s.facing === "left" ? 0.1 : 0);
  const sides = shoes.filter((s) => s.view === "side").sort((a, b) => wallScore(b) - wallScore(a));
  const others = shoes.filter((s) => s.view !== "side");
  return sides.length ? [...sides, ...others] : [...others].sort((a, b) => b.sideScore - a.sideScore);
};

const toImage = (s: UploadedShoe): ProductImage => ({
  file: s.file,
  width: s.width,
  height: s.height,
  view: s.view,
  ...(s.facing ? { facing: s.facing } : {}),
});

/** The wall always shows the toe pointing left: mirror a right-facing side view when it goes on the wall. */
async function wallReady(img: ProductImage): Promise<ProductImage> {
  if (img.facing !== "right") return img;
  const flipped = await api.flip(img.file);
  return { ...img, file: flipped.file, width: flipped.width, height: flipped.height, facing: "left", mirrorOf: img.file };
}

/** Undo a mirrored copy, so photos leaving the wall keep their logos readable. */
function unmirrored(img: ProductImage): ProductImage {
  if (!img.mirrorOf) return img;
  const { mirrorOf, ...rest } = img;
  const facing = img.facing === "left" ? "right" : img.facing === "right" ? "left" : undefined;
  return { ...rest, file: mirrorOf, ...(facing ? { facing } : {}) };
}

/** A shoe on its acrylic shelf, using the storefront's own shelf styles. */
function ShelfPreview({ product, glow }: { product: ProductData; glow?: boolean }) {
  return (
    <div className="unit w-full" data-glow={glow}>
      <div className="unit-stage">
        <div className="unit-contact" />
        <div className="unit-shoe" style={{ width: `${product.scale * 100}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- studio preview of a freshly uploaded asset */}
          <img
            src={assetUrl(product.image.file)}
            alt={product.name}
            width={product.image.width}
            height={product.image.height}
            className="relative z-[1] h-auto w-full select-none"
            draggable={false}
          />
        </div>
      </div>
      <div className="shelf" />
    </div>
  );
}

function SlugInput({ value, taken, onCommit }: { value: string; taken: string[]; onCommit: (slug: string) => void }) {
  const [draft, setDraft] = useState(value);
  const commit = () => {
    const slug = uniqueSlug(slugify(draft, value), taken);
    setDraft(slug);
    if (slug !== value) onCommit(slug);
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
      className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-white/30"
    />
  );
}

function DetailsInput({ value, onChange }: { value: string[]; onChange: (details: string[]) => void }) {
  const [draft, setDraft] = useState(value.join("\n"));
  return (
    <TextArea
      rows={3}
      value={draft}
      onChange={(text) => {
        setDraft(text);
        onChange(text.split("\n").map((d) => d.trim()).filter(Boolean));
      }}
    />
  );
}

export function ProductsEditor({ brand, products, onChange, modelReady, onModelReady, onPreview, onError }: Props) {
  const [selected, setSelected] = useState(products[0]?.slug ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [viewDrag, setViewDrag] = useState<number | null>(null);
  const addInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const anglesInput = useRef<HTMLInputElement>(null);

  const current = products.find((p) => p.slug === selected) ?? null;

  const update = (slug: string, patch: Partial<ProductData>) =>
    onChange(products.map((p) => (p.slug === slug ? { ...p, ...patch } : p)));

  const select = (slug: string) => {
    setSelected(slug);
    onPreview(slug);
  };

  const uploadShoe = async (file: File, label: string) => {
    setBusy(modelReady ? label : `${label} — first run downloads the background-removal model (~180 MB)…`);
    try {
      const shoe = await api.upload<UploadedShoe>("shoe", file);
      onModelReady();
      return shoe;
    } finally {
      setBusy(null);
    }
  };

  /** Upload several photos; returns them sorted so the most wall-ready side view comes first. */
  const processAll = async (files: File[], counter: { done: number; total: number }) => {
    const shoes: UploadedShoe[] = [];
    for (const file of files) {
      counter.done++;
      shoes.push(await uploadShoe(file, `Removing background ${counter.done} / ${counter.total}`));
    }
    return rankForWall(shoes);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const groups = groupPhotos([...files]);
    const counter = { done: 0, total: files.length };
    let next = products;
    let last: string | null = null;
    try {
      for (const group of groups) {
        const [main, ...rest] = await processAll(group.files, counter);
        const wallImage = await wallReady(toImage(main));
        const slug = uniqueSlug(slugify(group.name, "pair"), next.map((p) => p.slug));
        next = [
          ...next,
          {
            slug,
            name: group.name,
            line: products[0]?.line ?? "",
            colorway: "",
            price: products[0]?.price ?? 150,
            description: "",
            details: [],
            soldOut: [],
            scale: main.scale,
            image: wallImage,
            gallery: rest.map(toImage),
          },
        ];
        last = slug;
        onChange(next);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
    if (last) select(last);
  };

  const addAngles = async (files: FileList | null) => {
    if (!current || !files?.length) return;
    try {
      const shoes = await processAll([...files], { done: 0, total: files.length });
      const gallery = [...current.gallery, ...shoes.map(toImage)];
      // A real side view replaces a wall photo that isn't one
      const best = shoes[0];
      if (current.image.view === "angle" && best.view === "side") {
        update(current.slug, {
          image: await wallReady(toImage(best)),
          scale: best.scale,
          gallery: [unmirrored(current.image), ...gallery.filter((g) => g.file !== best.file)],
        });
      } else {
        update(current.slug, { gallery });
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  /** Reorder the views; whichever lands first becomes the wall photo and opens the product page. */
  const moveView = async (from: number, to: number) => {
    if (!current || from === to) return;
    const views = [unmirrored(current.image), ...current.gallery];
    const [item] = views.splice(from, 1);
    views.splice(to, 0, item);
    const [first, ...rest] = views;
    const sameWall = first.file === (current.image.mirrorOf ?? current.image.file);
    try {
      update(current.slug, {
        ...(sameWall
          ? {}
          : { image: await wallReady(first), scale: scaleForAspect(first.width / first.height) }),
        gallery: rest,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const removeView = (file: string) => {
    if (!current) return;
    update(current.slug, { gallery: current.gallery.filter((g) => g.file !== file) });
  };

  const replacePhoto = async (files: FileList | null) => {
    if (!current || !files?.[0]) return;
    try {
      const shoe = await uploadShoe(files[0], "Removing background");
      update(current.slug, { scale: shoe.scale, image: await wallReady(toImage(shoe)) });
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const flip = async () => {
    if (!current) return;
    if (current.image.mirrorOf) {
      update(current.slug, { image: unmirrored(current.image) });
      return;
    }
    setBusy("Flipping");
    try {
      const img = await api.flip(current.image.file);
      const facing = current.image.facing === "right" ? "left" : current.image.facing === "left" ? "right" : undefined;
      update(current.slug, {
        image: {
          ...current.image,
          file: img.file,
          width: img.width,
          height: img.height,
          mirrorOf: current.image.file,
          ...(facing ? { facing } : {}),
        },
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const rename = (name: string) => {
    if (!current) return;
    const autoSlug = current.slug === slugify(current.name, "pair") || /^pair(-\d+)?$/.test(current.slug);
    const slug = autoSlug
      ? uniqueSlug(slugify(name, "pair"), products.filter((p) => p.slug !== current.slug).map((p) => p.slug))
      : current.slug;
    update(current.slug, { name, slug });
    if (slug !== current.slug) setSelected(slug);
  };

  const remove = () => {
    if (!current || products.length <= 1) return;
    if (!window.confirm(`Delete “${current.name}”?`)) return;
    const i = products.findIndex((p) => p.slug === current.slug);
    const next = products.filter((p) => p.slug !== current.slug);
    onChange(next);
    setSelected(next[Math.min(i, next.length - 1)]?.slug ?? null);
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...products];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <Panel
        title={`Products (${products.length})`}
        hint={`Drag to reorder — the wall fills ${brand.layout.columns} per row in this order. Drop many photos at once: shots of the same shoe (vapor.jpg, vapor (1).jpg, vapor-front.jpg) become one product, with its side view on the wall.`}
      >
        <div
          className="grid grid-cols-3 gap-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            if (e.dataTransfer.files.length) {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }
          }}
        >
          {products.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => setDragIndex(null)}
              onDrop={(e) => {
                if (dragIndex !== null) {
                  e.preventDefault();
                  e.stopPropagation();
                  move(dragIndex, i);
                  setDragIndex(null);
                }
              }}
              onClick={() => select(p.slug)}
              className={`group relative flex flex-col gap-2 rounded-xl border p-2 pb-2.5 text-left transition-colors ${
                p.slug === selected
                  ? "border-[var(--brand-accent)] bg-white/[0.06]"
                  : "border-white/[0.06] bg-black/20 hover:border-white/20"
              } ${dragIndex === i ? "opacity-40" : ""}`}
            >
              <span className="label absolute left-2 top-2 text-mute/60">{String(i + 1).padStart(2, "0")}</span>
              <div className="px-2 pt-5">
                <ShelfPreview product={p} />
              </div>
              <div className="truncate text-[12px] font-semibold text-ink">{p.name}</div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => addInput.current?.click()}
            disabled={!!busy}
            className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 text-mute transition-colors hover:border-white/35 hover:text-ink disabled:opacity-40"
          >
            <span className="text-[22px] leading-none">+</span>
            <span className="label">Add photos</span>
          </button>
        </div>
        <input
          ref={addInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {busy && (
          <p className="flex items-center gap-2 text-[12.5px] text-ink">
            <span className="size-2 animate-pulse rounded-full bg-[var(--brand-accent)]" />
            {busy}
          </p>
        )}
        {!modelReady && !busy && (
          <p className="text-[12px] text-mute">
            Photos are cut out locally with an AI model. The first upload downloads it once (~180 MB).
          </p>
        )}
      </Panel>

      {current && (
        <Panel title={current.name} hint={`/p/${current.slug}`}>
          <div className="rounded-xl bg-black/40 px-8 pb-10 pt-6">
            <ShelfPreview product={current} glow />
          </div>
          {current.image.view === "angle" && (
            <p className="rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-[12px] text-amber-200">
              This wall photo doesn&apos;t look like a side view. The wall and the zoom look best with a side
              profile — add one with “Add angles” or move a side view first below.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => replaceInput.current?.click()} disabled={!!busy}>
              Replace wall photo
            </Button>
            <Button onClick={flip} disabled={!!busy}>
              Flip direction
            </Button>
            <Button variant="danger" onClick={remove} disabled={products.length <= 1}>
              Delete
            </Button>
          </div>
          <input
            ref={replaceInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              replacePhoto(e.target.files);
              e.target.value = "";
            }}
          />

          <Field
            label={`Views (${current.gallery.length + 1})`}
            hint="Drag to sort, or use the arrows. The first one sits on the wall and opens the product page; the rest follow as thumbnails in this order."
          >
            <div className="grid grid-cols-4 gap-2">
              {[current.image, ...current.gallery].map((img, i, all) => (
                <div
                  key={img.file}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    setViewDrag(i);
                  }}
                  onDragEnd={() => setViewDrag(null)}
                  onDragOver={(e) => viewDrag !== null && e.preventDefault()}
                  onDrop={(e) => {
                    if (viewDrag === null) return;
                    e.preventDefault();
                    moveView(viewDrag, i);
                    setViewDrag(null);
                  }}
                  className={`group relative cursor-grab rounded-lg border bg-black/40 p-1.5 active:cursor-grabbing ${
                    i === 0 ? "border-[var(--brand-accent)]/60" : "border-white/[0.07]"
                  } ${viewDrag === i ? "opacity-40" : ""}`}
                >
                  <div className="grid aspect-square place-items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element -- studio preview of an uploaded asset */}
                    <img src={assetUrl(img.file)} alt="" draggable={false} className="max-h-full w-full object-contain" />
                  </div>
                  {i === 0 ? (
                    <span className="label absolute left-1.5 top-1.5 rounded bg-[var(--brand-accent)] px-1.5 py-0.5 text-[9px] text-black">
                      Wall
                    </span>
                  ) : (
                    <span className="label absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-mute">
                      {i + 1}
                    </span>
                  )}
                  <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={() => moveView(i, i - 1)}
                      aria-label="Move earlier"
                      className="rounded bg-black/80 px-1.5 py-1 text-[10px] text-ink hover:bg-black disabled:opacity-30"
                    >
                      ←
                    </button>
                    {i > 0 ? (
                      <button
                        type="button"
                        onClick={() => moveView(i, 0)}
                        className="flex-1 rounded bg-black/80 py-1 text-[10px] font-semibold text-ink hover:bg-black"
                      >
                        First
                      </button>
                    ) : (
                      <span className="flex-1" />
                    )}
                    <button
                      type="button"
                      disabled={i === all.length - 1}
                      onClick={() => moveView(i, i + 1)}
                      aria-label="Move later"
                      className="rounded bg-black/80 px-1.5 py-1 text-[10px] text-ink hover:bg-black disabled:opacity-30"
                    >
                      →
                    </button>
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => removeView(img.file)}
                        aria-label="Remove view"
                        className="rounded bg-black/80 px-1.5 py-1 text-[10px] text-red-300 hover:bg-black"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => anglesInput.current?.click()}
                disabled={!!busy}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 text-mute hover:border-white/35 hover:text-ink disabled:opacity-40"
              >
                <span className="text-[18px] leading-none">+</span>
                <span className="label text-[9px]">Add angles</span>
              </button>
            </div>
          </Field>
          <input
            ref={anglesInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              addAngles(e.target.files);
              e.target.value = "";
            }}
          />

          <Field label="Size on shelf" hint="Auto-set from the photo. Make high-tops a little narrower than low-tops.">
            <Slider
              value={current.scale}
              min={0.6}
              max={1}
              step={0.01}
              onChange={(scale) => update(current.slug, { scale })}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Name">
              <TextInput value={current.name} onChange={rename} />
            </Field>
            <Field label={`Price (${brand.commerce.currency})`}>
              <NumberInput value={current.price} onChange={(price) => update(current.slug, { price })} />
            </Field>
            <Field label="Line" hint="e.g. Running, Court, Lifestyle">
              <TextInput value={current.line} onChange={(line) => update(current.slug, { line })} />
            </Field>
            <Field label="Colourway">
              <TextInput value={current.colorway} onChange={(colorway) => update(current.slug, { colorway })} />
            </Field>
          </div>

          <Field label="URL slug" hint="Used in the product address. Saved when you leave the field.">
            <SlugInput
              key={current.slug}
              value={current.slug}
              taken={products.filter((p) => p !== current).map((p) => p.slug)}
              onCommit={(slug) => {
                update(current.slug, { slug });
                setSelected(slug);
              }}
            />
          </Field>

          <Field label="Description">
            <TextArea value={current.description} onChange={(description) => update(current.slug, { description })} />
          </Field>

          <Field label="Details" hint="One per line — shown as bullet points.">
            <DetailsInput key={current.slug} value={current.details} onChange={(details) => update(current.slug, { details })} />
          </Field>

          <Field label={`Sold-out sizes (${brand.commerce.sizeSystem})`} hint="Tap a size to mark it sold out.">
            <Chips
              options={brand.commerce.sizes}
              selected={current.soldOut}
              onToggle={(size) =>
                update(current.slug, {
                  soldOut: current.soldOut.includes(size)
                    ? current.soldOut.filter((s) => s !== size)
                    : [...current.soldOut, size],
                })
              }
            />
          </Field>
        </Panel>
      )}
    </div>
  );
}

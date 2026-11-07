"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { wallMatchedGap } from "@/lib/camera";
import { brand } from "@/lib/brand";
import { useCart } from "@/lib/cart";
import { SIZES, formatPrice, pad, type Product } from "@/lib/products";
import { ShoeOnShelf } from "./ShoeOnShelf";

type Props = {
  product: Product;
  prev: Product;
  next: Product;
  /** Whether prev/next sit beside this pair on the wall and should flank the hero. */
  showPrev: boolean;
  showNext: boolean;
  index: number;
  total: number;
};

const ease = [0.2, 0.8, 0.2, 1] as const;

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.6, delay: 0.25 + delay, ease },
});

export function ProductView({ product, prev, next, showPrev, showNext, index, total }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const cartOpen = useCart((s) => s.open);
  const [size, setSize] = useState<string | null>(null);
  const [nudge, setNudge] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);
  const [swapped, setSwapped] = useState(false);
  const views = product.views;

  const showView = (i: number) => {
    setViewIndex((i + views.length) % views.length);
    setSwapped(true);
  };

  const mainRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const sync = () => {
      const el = mainRef.current;
      if (!el) return;
      if (window.innerWidth >= 768) {
        el.style.setProperty("--gap", `${wallMatchedGap(window.innerWidth, window.innerHeight, brand.layout.columns)}px`);
      } else {
        el.style.removeProperty("--gap");
      }
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (cartOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") router.push(`/p/${prev.slug}`, { transitionTypes: ["nav-prev"] });
      if (e.key === "ArrowRight") router.push(`/p/${next.slug}`, { transitionTypes: ["nav-next"] });
      if (e.key === "Escape") router.push("/", { transitionTypes: ["nav-back"] });
      if (views.length > 1 && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        setViewIndex((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + views.length) % views.length);
        setSwapped(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prev.slug, next.slug, cartOpen, views.length]);

  const addToBag = () => {
    if (size === null) {
      setNudge((n) => n + 1);
      return;
    }
    add(product.slug, size);
  };

  return (
    <main ref={mainRef} className="vt-page pdp relative min-h-svh overflow-x-hidden md:h-svh md:overflow-hidden">
      {/* Title */}
      <div className="relative z-10 px-5 pt-20 md:absolute md:left-8 md:top-24 md:p-0">
        <motion.p {...rise(0)} className="label">
          {brand.name} / {product.line}
        </motion.p>
        <motion.h1
          {...rise(0.05)}
          className="mt-2 text-[clamp(2.4rem,4.6vw,4.75rem)] font-semibold uppercase leading-[0.9] tracking-[-0.045em] text-ink"
        >
          {product.name}
        </motion.h1>
        <motion.p {...rise(0.1)} className="label mt-3">
          {product.colorway}
        </motion.p>
        {views.length > 1 && (
          <motion.div {...rise(0.15)} className="mt-6">
            <p className="label mb-2">
              View {viewIndex + 1} / {views.length}
            </p>
            <div className="flex gap-2">
              {views.map((v, i) => (
                <button
                  key={v.src}
                  type="button"
                  onClick={() => showView(i)}
                  aria-label={`View ${i + 1}`}
                  aria-pressed={i === viewIndex}
                  className={`view-thumb grid size-14 place-items-center rounded-xl border p-1.5 md:size-16 ${
                    i === viewIndex
                      ? "border-ember bg-white/[0.08]"
                      : "border-white/[0.08] bg-white/[0.03] hover:border-white/25"
                  }`}
                >
                  <Image
                    src={v.src}
                    alt=""
                    width={v.width}
                    height={v.height}
                    sizes="64px"
                    className="max-h-full w-full object-contain"
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Stage */}
      <div className="pdp-stage relative h-[40svh] md:absolute md:inset-0 md:h-auto">
        {showPrev && (
          <Link
            href={`/p/${prev.slug}`}
            transitionTypes={["nav-prev"]}
            aria-label={`Previous: ${prev.name}`}
            className="pdp-neighbor pdp-prev"
          >
            <ShoeOnShelf product={prev} role="neighbor" />
          </Link>
        )}

        <div className="pdp-hero">
          <ShoeOnShelf product={product} role="hero" view={views[viewIndex]} swap={swapped} priority />
        </div>

        {showNext && (
          <Link
            href={`/p/${next.slug}`}
            transitionTypes={["nav-next"]}
            aria-label={`Next: ${next.name}`}
            className="pdp-neighbor pdp-next"
          >
            <ShoeOnShelf product={next} role="neighbor" />
          </Link>
        )}
      </div>

      {/* Purchase panel */}
      <motion.aside
        {...rise(0.15)}
        className="relative z-20 mx-5 mb-8 md:absolute md:right-8 md:top-24 md:m-0 md:w-[300px]"
      >
        <div className="panel rounded-2xl p-4">
          <div className="label flex items-baseline justify-between">
            <span>
              Model {pad(index + 1)} / {pad(total)}
            </span>
            <span className="text-[22px] font-semibold tracking-[-0.03em] text-ink normal-case">
              {formatPrice(product.price)}
            </span>
          </div>

          <div className="mt-4 h-px bg-white/10" />

          <div className="label mt-4 flex justify-between">
            <span>Size — {brand.commerce.sizeSystem}</span>
            <span className={size ? "text-ink" : nudge ? "text-ember" : ""}>
              {size ?? (nudge ? "Pick a size first" : "Select")}
            </span>
          </div>

          <motion.div
            key={nudge}
            animate={nudge ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
            transition={{ duration: 0.4 }}
            className="mt-3 grid grid-cols-5 gap-1.5"
          >
            {SIZES.map((s) => {
              const out = product.soldOut.includes(s);
              const active = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={out}
                  onClick={() => setSize(s)}
                  className={`h-9 rounded-full text-[12px] font-medium tabular-nums transition-all ${
                    active
                      ? "bg-ink text-[#2b2a2d]"
                      : out
                        ? "cursor-not-allowed text-mute/40 line-through"
                        : "bg-white/[0.06] text-ink hover:bg-white/15"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </motion.div>

          <button type="button" onClick={addToBag} className="pill group mt-4">
            <span className="pl-5 text-[13px] font-semibold tracking-[-0.01em]">
              {size ? `Add to bag — ${brand.commerce.sizeSystem} ${size}` : "Add to bag"}
            </span>
            <span className="pill-knob">
              <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </span>
          </button>

          <p className="mt-4 text-[12.5px] leading-relaxed text-mute">{product.description}</p>

          <ul className="label mt-4 space-y-1.5">
            {product.details.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <span className="size-1 rounded-full bg-ember" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </motion.aside>

      {/* Footer */}
      <footer className="label relative z-30 flex items-center justify-between px-5 pb-5 md:fixed md:inset-x-0 md:bottom-0 md:px-8">
        <Link href="/" transitionTypes={["nav-back"]} className="transition-colors hover:text-ink">
          ← Back to wall
        </Link>
        <span className="hidden md:inline">← → Browse &nbsp;·&nbsp; Esc Wall</span>
        <div className="flex items-center gap-3">
          <Link
            href={`/p/${prev.slug}`}
            transitionTypes={["nav-prev"]}
            aria-label="Previous pair"
            className="grid size-7 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/15 hover:text-ink"
          >
            ←
          </Link>
          <span className="tabular-nums text-ink">
            {pad(index + 1)} / {pad(total)}
          </span>
          <Link
            href={`/p/${next.slug}`}
            transitionTypes={["nav-next"]}
            aria-label="Next pair"
            className="grid size-7 place-items-center rounded-full bg-white/[0.06] transition-colors hover:bg-white/15 hover:text-ink"
          >
            →
          </Link>
        </div>
      </footer>
    </main>
  );
}

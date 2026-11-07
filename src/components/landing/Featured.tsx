"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from "motion/react";
import { formatPrice, pad, type Product } from "@/lib/products";
import { ShelfUnit } from "../ShoeOnShelf";

const CALLOUTS = ["callout-0", "callout-1", "callout-2"] as const;

/** Maps a 0–1 position inside one pair's slice of the scroll onto the whole scene's progress. */
type At = (t: number) => number;

function Callout({
  progress,
  at,
  k,
  last,
  className,
  children,
}: {
  progress: MotionValue<number>;
  at: At;
  k: number;
  last: boolean;
  className: string;
  children: string;
}) {
  const reduce = useReducedMotion();
  const range = [at(0.36 + k * 0.07), at(0.43 + k * 0.07), at(0.78), at(0.86)];
  const opacity = useTransform(progress, range, [0, 1, 1, last ? 1 : 0]);
  const y = useTransform(progress, range, reduce ? [0, 0, 0, 0] : [14, 0, 0, 0]);
  return (
    <motion.div style={{ opacity, y }} className={`label absolute z-10 flex items-center gap-2 text-ink ${className}`}>
      <span className="size-1.5 rounded-full bg-ember shadow-[0_0_10px_var(--brand-accent)]" />
      {children}
    </motion.div>
  );
}

function Slide({
  product,
  progress: p,
  i,
  n,
  label,
}: {
  product: Product;
  progress: MotionValue<number>;
  i: number;
  n: number;
  label: string;
}) {
  const reduce = useReducedMotion();
  const first = i === 0;
  const last = i === n - 1;
  const at: At = (t) => (i + t) / n;

  // Glide in from the right, settle, then (unless it's the last pair) glide off to the left
  const move = [at(0), at(0.3), at(0.84), at(1)];
  const shoeX = useTransform(p, move, reduce ? ["0vw", "0vw", "0vw", "0vw"] : ["38vw", "0vw", "0vw", last ? "0vw" : "-38vw"]);
  const shoeRotate = useTransform(p, move, reduce ? [0, 0, 0, 0] : [-9, 0, 0, last ? 0 : 6]);
  const shoeScale = useTransform(p, move, reduce ? [1, 1, 1, 1] : [0.72, 1, 1, last ? 1 : 0.86]);
  const opacity = useTransform(p, [at(0), at(0.16), at(0.88), at(1)], [first ? 1 : 0, 1, 1, last ? 1 : 0]);
  const visibility = useTransform(opacity, (o) => (o < 0.01 ? "hidden" : "visible"));
  const glow = useTransform(p, [at(0.24), at(0.36), at(0.8), at(0.9)], [0, 1, 1, last ? 1 : 0]);
  const nameX = useTransform(p, [at(0), at(1)], reduce ? ["-20%", "-20%"] : ["12%", "-52%"]);

  const infoRange = [at(0.5), at(0.62), at(0.78), at(0.86)];
  const infoOpacity = useTransform(p, infoRange, [0, 1, 1, last ? 1 : 0]);
  const infoY = useTransform(p, infoRange, reduce ? [0, 0, 0, 0] : [24, 0, 0, last ? 0 : -16]);
  const infoEvents = useTransform(infoOpacity, (o) => (o > 0.5 ? "auto" : "none"));

  return (
    <motion.div style={{ opacity, visibility }} className="absolute inset-0 flex items-center justify-center">
      <motion.div
        aria-hidden
        style={{ x: nameX }}
        className="featured-outline pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 whitespace-nowrap text-[24vw] font-semibold uppercase leading-none tracking-[-0.05em] will-change-transform"
      >
        {product.name} — {product.name}
      </motion.div>

      <motion.div
        style={{ x: shoeX, rotate: shoeRotate, scale: shoeScale, "--glow": glow } as MotionStyle}
        className="relative w-[min(86vw,104svh)] md:w-[min(58vw,104svh)]"
      >
        <ShelfUnit product={product} className="unit-glow-var w-full" />
        {product.details.slice(0, 3).map((d, k) => (
          <Callout key={d} progress={p} at={at} k={k} last={last} className={CALLOUTS[k]}>
            {d}
          </Callout>
        ))}
      </motion.div>

      <motion.div
        style={{ opacity: infoOpacity, y: infoY, pointerEvents: infoEvents }}
        className="absolute bottom-10 left-5 right-5 flex flex-col gap-5 md:bottom-14 md:left-8 md:right-8 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <p className="label">
            {label} / {product.line}
          </p>
          <h2 className="mt-2 text-[clamp(2.2rem,5vw,4.5rem)] font-semibold uppercase leading-[0.9] tracking-[-0.045em] text-ink">
            {product.name}
          </h2>
          <p className="label mt-3">
            {product.colorway} — {formatPrice(product.price)}
          </p>
        </div>
        <Link href={`/p/${product.slug}`} className="pill group w-auto self-start md:self-auto">
          <span className="pl-5 pr-4 text-[13px] font-semibold">View the pair</span>
          <span className="pill-knob">→</span>
        </Link>
      </motion.div>
    </motion.div>
  );
}

function SegmentBar({ progress, i, n }: { progress: MotionValue<number>; i: number; n: number }) {
  const scaleX = useTransform(progress, [i / n, (i + 0.62) / n], [0, 1]);
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums">{pad(i + 1)}</span>
      <span className="relative h-px w-8 overflow-hidden bg-white/15 md:w-12">
        <motion.span style={{ scaleX }} className="absolute inset-0 origin-left bg-ember" />
      </span>
    </span>
  );
}

/**
 * Pinned scene: each featured pair in turn glides onto its shelf, the shelf lights up, its
 * details are called out one by one, and its name drifts by in outline behind it.
 */
export function Featured({ products, label, index }: { products: Product[]; label: string; index: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const n = products.length;
  const introOpacity = useTransform(p, [0, 0.12 / n, 0.3 / n], reduce ? [1, 1, 1] : [1, 1, 0]);

  return (
    <section id="featured" ref={ref} className="relative" style={{ height: `${150 + 150 * n}vh` }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        {products.map((product, i) => (
          <Slide key={product.slug} product={product} progress={p} i={i} n={n} label={label} />
        ))}

        <motion.p style={{ opacity: introOpacity }} className="label absolute left-5 top-24 md:left-8">
          <span className="text-ember">{index}</span>&nbsp;&nbsp;{label}
        </motion.p>

        {n > 1 && (
          <div className="label absolute right-5 top-24 flex gap-3 md:right-8">
            {products.map((product, i) => (
              <SegmentBar key={product.slug} progress={p} i={i} n={n} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

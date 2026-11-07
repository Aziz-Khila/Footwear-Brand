"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { formatPrice, pad, type Product } from "@/lib/products";
import { ShelfUnit } from "../ShoeOnShelf";

/**
 * The whole catalogue on one long shelf. On desktop the section pins and vertical
 * scrolling slides the rack sideways; on phones it's a native swipeable row.
 */
export function Rack({ title, products, index }: { title: string; products: Product[]; index: string }) {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDistance(window.innerWidth >= 768 && !reduce ? Math.max(0, el.scrollWidth - window.innerWidth) : 0);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [reduce]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  return (
    <section
      id="collection"
      ref={ref}
      className="relative"
      style={{ height: distance ? `calc(100svh + ${distance}px)` : undefined }}
    >
      <div className={`${distance ? "sticky top-0 h-svh" : ""} flex flex-col justify-center overflow-hidden py-16`}>
        <div className="mb-10 flex items-end justify-between px-5 md:px-8">
          <div>
            <p className="label">
              <span className="text-ember">{index}</span>&nbsp;&nbsp;Catalogue
            </p>
            <h2 className="mt-3 text-[clamp(2rem,4.4vw,4rem)] font-semibold uppercase leading-[0.9] tracking-[-0.045em] text-ink">
              {title}
            </h2>
          </div>
          <p className="label hidden md:block">{pad(products.length)} pairs</p>
        </div>

        <div className={distance ? "" : "overflow-x-auto [scrollbar-width:none] snap-x snap-mandatory"}>
          <motion.div ref={track} style={{ x }} className="flex w-max gap-6 px-5 will-change-transform md:gap-10 md:px-8">
            {products.map((p, i) => (
              <Link
                key={p.slug}
                href={`/p/${p.slug}`}
                className="rack-card group flex w-[68vw] shrink-0 snap-start flex-col sm:w-[44vw] md:w-[26vw] lg:w-[22vw]"
              >
                <div className="flex aspect-[4/3] items-end px-[6%] pb-[8%]">
                  <ShelfUnit product={p} className="w-full" sizes="(min-width: 768px) 26vw, 68vw" />
                </div>
                <div className="label mt-2 flex justify-between border-t border-white/10 pt-3">
                  <span>
                    <span className="text-mute/60">{pad(i + 1)}</span>&nbsp;&nbsp;<span className="text-ink">{p.name}</span>
                  </span>
                  <span className="text-ink">{formatPrice(p.price)}</span>
                </div>
                <p className="label mt-1">{p.line}</p>
              </Link>
            ))}
          </motion.div>
        </div>

        {distance > 0 && (
          <div className="mx-5 mt-12 h-px bg-white/10 md:mx-8">
            <motion.div style={{ scaleX: scrollYProgress }} className="h-full origin-left bg-ember" />
          </div>
        )}
      </div>
    </section>
  );
}

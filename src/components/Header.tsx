"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { brand } from "@/lib/brand";
import { useBagCount, useCart } from "@/lib/cart";
import { products } from "@/lib/products";
import { Logo } from "./Logo";

const SECTIONS = [
  { id: "wall", label: "Wall" },
  ...(brand.landing.manifesto.trim() ? [{ id: "story", label: "Story" }] : []),
  { id: "featured", label: "Featured" },
  { id: "collection", label: "Collection" },
  { id: "newsletter", label: "Newsletter" },
];

/** The section crossing the middle of the screen. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState("wall");
  useEffect(() => {
    if (!enabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [enabled]);
  return enabled ? active : null;
}

export function Header() {
  const count = useBagCount();
  const setOpen = useCart((s) => s.setOpen);
  const onHome = usePathname() === "/";
  const active = useActiveSection(onHome);
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (id: string) => (e: React.MouseEvent) => {
    setMenuOpen(false);
    if (!onHome) return;
    e.preventDefault();
    if (id === "wall") window.scrollTo({ top: 0, behavior: "smooth" });
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const link = (s: (typeof SECTIONS)[number], className: string) => (
    <Link
      key={s.id}
      href={s.id === "wall" ? "/" : `/#${s.id}`}
      // Back to the wall from a product zooms out; other sections just fade in
      transitionTypes={s.id === "wall" ? ["nav-back"] : undefined}
      // The wall scrolls to the pair being returned to itself (see revealReturn)
      scroll={s.id === "wall" ? false : undefined}
      onClick={go(s.id)}
      className={className}
    >
      {s.label}
      {s.id === "collection" && <sup className="ml-0.5 text-[8px] text-mute">{products.length}</sup>}
    </Link>
  );

  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="site-header fixed inset-x-0 top-0 z-40 grid h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-transparent px-5 md:px-8"
    >
      <div className="flex items-center gap-5">
        <Logo />
        <span className="label hidden xl:inline">{brand.copy.collection}</span>
      </div>

      <nav className="label hidden items-center gap-1 md:flex">
        {SECTIONS.map((s) => {
          const on = onHome ? active === s.id : s.id === "wall";
          return (
            <span key={s.id} className="relative">
              {on && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  className="absolute inset-0 rounded-full bg-white/10"
                />
              )}
              {link(s, `relative block rounded-full px-3 py-1.5 transition-colors hover:text-ink ${on ? "text-ink" : ""}`)}
            </span>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-expanded={menuOpen}
        className="label rounded-full px-3 py-1.5 text-ink transition-colors hover:bg-white/10 md:hidden"
      >
        {menuOpen ? "Close" : "Menu"}
      </button>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="label group flex items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 transition-colors hover:bg-white/10 hover:text-ink"
        >
          Bag
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[10px] font-semibold text-[#2b2a2d] tabular-nums">
            {count}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-x-3 top-[60px] flex flex-col rounded-2xl border border-white/10 bg-[color-mix(in_oklab,var(--brand-wall)_70%,black)] p-2 backdrop-blur-xl md:hidden"
          >
            {SECTIONS.map((s) =>
              link(
                s,
                `flex items-center rounded-xl px-4 py-3 text-[15px] font-semibold tracking-[-0.02em] transition-colors hover:bg-white/[0.06] ${
                  active === s.id ? "text-ink" : "text-ink/70"
                }`,
              ),
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

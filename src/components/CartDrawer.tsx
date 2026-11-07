"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/lib/cart";
import { brand } from "@/lib/brand";
import { formatPrice, getProduct } from "@/lib/products";

const FREE_SHIPPING = brand.commerce.freeShippingThreshold;
const ease = [0.2, 0.8, 0.2, 1] as const;

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const lines = items.flatMap((i) => {
    const product = getProduct(i.slug);
    return product ? [{ ...i, product }] : [];
  });
  const subtotal = lines.reduce((n, l) => n + l.product.price * l.qty, 0);
  const toFree = Math.max(0, FREE_SHIPPING - subtotal);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.aside
            key="drawer"
            role="dialog"
            aria-label="Shopping bag"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease }}
            className="panel panel-solid fixed inset-y-2 right-2 z-50 flex w-[calc(100%-1rem)] max-w-[420px] flex-col rounded-2xl"
          >
            <div className="flex items-center justify-between p-5">
              <span className="label text-ink">Bag ({items.reduce((n, i) => n + i.qty, 0)})</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="label rounded-full px-3 py-1.5 transition-colors hover:bg-white/10 hover:text-ink"
              >
                Close
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
                <p className="text-[15px] font-medium text-ink">Your bag is empty.</p>
                <p className="text-[13px] text-mute">Pick a pair off the wall to get started.</p>
              </div>
            ) : (
              <ul className="flex-1 space-y-2 overflow-y-auto px-3">
                <AnimatePresence initial={false}>
                  {lines.map((l) => (
                    <motion.li
                      key={`${l.slug}-${l.size}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 24 }}
                      transition={{ duration: 0.35, ease }}
                      className="flex gap-4 rounded-xl bg-white/[0.04] p-3"
                    >
                      <div className="grid size-20 shrink-0 place-items-center rounded-lg bg-white/[0.05]">
                        <Image
                          src={l.product.image.src}
                          alt={l.product.name}
                          width={l.product.image.width}
                          height={l.product.image.height}
                          sizes="80px"
                          className="h-auto w-[88%]"
                        />
                      </div>
                      <div className="flex flex-1 flex-col">
                        <div className="flex justify-between gap-2">
                          <span className="text-[14px] font-semibold uppercase tracking-[-0.02em] text-ink">
                            {l.product.name}
                          </span>
                          <span className="text-[14px] font-medium tabular-nums text-ink">
                            {formatPrice(l.product.price * l.qty)}
                          </span>
                        </div>
                        <span className="label mt-0.5">
                          {l.product.colorway} · {brand.commerce.sizeSystem} {l.size}
                        </span>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <div className="flex items-center rounded-full bg-white/[0.06]">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setQty(l.slug, l.size, l.qty - 1)}
                              className="grid size-7 place-items-center rounded-full text-ink hover:bg-white/10"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-[12px] tabular-nums text-ink">{l.qty}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setQty(l.slug, l.size, l.qty + 1)}
                              className="grid size-7 place-items-center rounded-full text-ink hover:bg-white/10"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(l.slug, l.size)}
                            className="label transition-colors hover:text-ink"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            <div className="space-y-4 p-5">
              {lines.length > 0 && (
                <div>
                  <div className="label flex justify-between">
                    <span>{toFree > 0 ? `${formatPrice(toFree)} away from free shipping` : "Free shipping unlocked"}</span>
                  </div>
                  <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-ember shadow-[0_0_12px_color-mix(in_oklab,var(--brand-accent)_80%,transparent)]"
                      animate={{ width: `${Math.min(100, (subtotal / FREE_SHIPPING) * 100)}%` }}
                      transition={{ duration: 0.6, ease }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="label">Subtotal</span>
                <span className="text-[22px] font-semibold tracking-[-0.03em] tabular-nums text-ink">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <button
                type="button"
                disabled={lines.length === 0}
                onClick={() => setNotice(true)}
                className="pill disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="pl-5 text-[13px] font-semibold">Checkout</span>
                <span className="pill-knob">→</span>
              </button>
              {notice && (
                <p className="label text-center text-ember">{brand.copy.checkoutNotice}</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

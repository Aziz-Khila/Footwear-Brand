"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { brand } from "./brand";

export type CartItem = { slug: string; size: string; qty: number };

type CartState = {
  items: CartItem[];
  open: boolean;
  add: (slug: string, size: string) => void;
  setQty: (slug: string, size: string, qty: number) => void;
  remove: (slug: string, size: string) => void;
  setOpen: (open: boolean) => void;
};

const same = (a: CartItem, slug: string, size: string) => a.slug === slug && a.size === size;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      add: (slug, size) =>
        set((s) => {
          const existing = s.items.find((i) => same(i, slug, size));
          const items = existing
            ? s.items.map((i) => (same(i, slug, size) ? { ...i, qty: i.qty + 1 } : i))
            : [...s.items, { slug, size, qty: 1 }];
          return { items, open: true };
        }),
      setQty: (slug, size, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => !same(i, slug, size))
              : s.items.map((i) => (same(i, slug, size) ? { ...i, qty } : i)),
        })),
      remove: (slug, size) => set((s) => ({ items: s.items.filter((i) => !same(i, slug, size)) })),
      setOpen: (open) => set({ open }),
    }),
    {
      name: `bag-${brand.id}`,
      skipHydration: true,
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const useBagCount = () => useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));

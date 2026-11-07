"use client";

import Link from "next/link";
import { useLayoutEffect, useState } from "react";
import { rememberPageOrigin, revealReturn } from "@/lib/camera";
import { WALL_COLUMNS, formatPrice, pad, products } from "@/lib/products";
import { ShoeOnShelf } from "./ShoeOnShelf";

export function Wall() {
  // Once a pair is clicked, only it may morph — otherwise wall shoes that reappear
  // as neighbours on the product page would be paired up too.
  const [active, setActive] = useState<string | null>(null);

  // Runs inside the navigation commit, so the zoom-out's "after" snapshot already shows the pair on screen
  useLayoutEffect(revealReturn, []);

  return (
    <ul
      data-leaving={active !== null}
      style={{ "--wall-cols": WALL_COLUMNS } as React.CSSProperties}
      className="wall grid w-full grid-cols-2 gap-x-4 gap-y-10 px-5 md:grid-cols-[repeat(var(--wall-cols),minmax(0,1fr))] md:gap-x-6 md:gap-y-[6svh] md:px-[4vw]"
    >
      {products.map((p, i) => (
        <li key={p.slug} className="wall-cell">
          <Link
            href={`/p/${p.slug}`}
            transitionTypes={["nav-forward"]}
            onClick={(e) => {
              rememberPageOrigin(e.currentTarget);
              setActive(p.slug);
            }}
            className="group relative flex h-full flex-col items-center justify-end outline-none"
          >
            <ShoeOnShelf
              product={p}
              role="wall"
              morph={active === null || active === p.slug}
              priority={i < WALL_COLUMNS}
              className="w-[min(92%,34svh)] md:w-[min(92%,36svh)]"
            />
            <div className="wall-label label mt-4 flex w-[min(92%,34svh)] justify-between md:w-[min(92%,36svh)]">
              <span>
                <span className="text-mute/60">{pad(i + 1)}</span>&nbsp;&nbsp;
                <span className="text-ink">{p.name}</span>
              </span>
              <span className="text-ink">{formatPrice(p.price)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { assetUrl, brand } from "@/lib/brand";

/** The brand logo from brand.json (optionally with the name beside it), or a wordmark when none is set. */
export function Logo() {
  const onHome = usePathname() === "/";

  return (
    <Link
      href="/"
      transitionTypes={["nav-back"]}
      // Already home: a link to the same page doesn't move, so glide back up to the wall
      onClick={(e) => {
        if (!onHome) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label={`${brand.name} home`}
      className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.04em] text-ink"
    >
      {brand.logo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- logos can be SVG of any aspect ratio */}
          <img
            src={assetUrl(brand.logo)}
            alt={brand.logoText ? "" : brand.name}
            className={`w-auto max-w-[160px] object-contain ${brand.logoText ? "h-[22px]" : "h-6"}`}
          />
          {brand.logoText && <span>{brand.name}.</span>}
        </>
      ) : (
        <>
          <span className="grid size-[18px] place-items-center rounded-[4px] bg-ink">
            <span className="h-[2px] w-[9px] -skew-x-[20deg] rounded-full bg-[#2b2a2d]" />
          </span>
          {brand.name}.
        </>
      )}
    </Link>
  );
}

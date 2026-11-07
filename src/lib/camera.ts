"use client";

/** Must match the `.morph-*` group timing in globals.css so the page and the shoe move as one. */
export const CAMERA_DURATION = 900;
export const CAMERA_EASE = "cubic-bezier(0.65, 0, 0.25, 1)";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Gap between the product-page hero and its neighbours that puts them exactly where
 * the zoomed-in wall places the shoes next to it. Mirrors the desktop layout of
 * Wall.tsx (4vw gutters, 24px gaps, units min(92%, 36svh)) and the `--hero-w` of
 * `.pdp` in globals.css.
 */
export function wallMatchedGap(vw: number, vh: number, columns: number) {
  const cell = (0.92 * vw - (columns - 1) * 24) / columns;
  const unit = Math.min(0.92 * cell, 0.36 * vh);
  const hero = Math.min(0.54 * vw, 0.96 * vh);
  return Math.max(24, ((cell + 24) * hero) / unit - hero);
}

function readGroupStart(name: string): Rect | null {
  const pseudo = `::view-transition-group(${name})`;
  const anim = document
    .getAnimations()
    .find((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === pseudo);
  const first = (anim?.effect as KeyframeEffect | undefined)?.getKeyframes()[0];
  if (!first || typeof first.transform !== "string") return null;
  const m = new DOMMatrixReadOnly(first.transform);
  return { x: m.e, y: m.f, w: parseFloat(String(first.width)), h: parseFloat(String(first.height)) };
}

/**
 * Turns the wall ⇄ product navigation into a single camera move: the rest of the old
 * page scales with the morphing shoe, and the new page arrives on the same path, so
 * neighbouring shoes stay on screen and simply hand over to their product-page copies.
 */
let live: Animation[] = [];
let origin = { x: 0, y: 0 };

/** Call when leaving the wall: records where the page group sat on screen (it moves when the home page is scrolled). */
export function rememberPageOrigin(from: Element) {
  const r = from.closest(".vt-page")?.getBoundingClientRect();
  origin = r ? { x: r.left, y: r.top } : { x: 0, y: 0 };
}

/**
 * Pseudo-element animations keep targeting `::view-transition-*(page)` after they end,
 * so with `fill: both` they would leak into the next transition. Drop them on finish:
 * the CSS fallback ends in the same visual state, so this causes no flash.
 */
function track(anim: Animation) {
  live.push(anim);
  anim.finished
    .catch(() => {})
    .finally(() => {
      anim.cancel();
      live = live.filter((a) => a !== anim);
    });
}

export function cameraMove(name: string, types: string[]) {
  live.forEach((a) => a.cancel());
  live = [];

  const forward = types.includes("nav-forward");
  if (!forward && !types.includes("nav-back")) return;

  const from = readGroupStart(name);
  const target = document.querySelector(`[data-vt="${name}"]`);
  if (!from || !target || !from.w) return;
  const r = target.getBoundingClientRect();

  const s = r.width / from.w;
  const tx = r.left + r.width / 2 - s * (from.x + from.w / 2);
  const ty = r.top + r.height / 2 - s * (from.y + from.h / 2);

  const timing: KeyframeAnimationOptions = {
    duration: CAMERA_DURATION,
    easing: CAMERA_EASE,
    fill: "both",
  };
  const root = document.documentElement;

  // Only the wall rides the camera. The product page clips its edge shoes, so scaling
  // it would expose the cut; it fades in place instead, where its neighbours line up
  // with the zoomed wall's (see wallMatchedGap) as the move settles.
  // The wall's snapshot is drawn at the top-left of the group; when the home page was
  // scrolled, `origin` puts it back where it was on screen.
  const o = forward ? origin : { x: 0, y: 0 };
  origin = { x: 0, y: 0 };
  const identity = `translate(${o.x}px, ${o.y}px) scale(1)`;
  const zoomedIn = forward
    ? `translate(${s * o.x + tx}px, ${s * o.y + ty}px) scale(${s})`
    : `translate(${-tx / s}px, ${-ty / s}px) scale(${1 / s})`;
  const wall = forward ? "old" : "new";
  const pdp = forward ? "new" : "old";

  const wallPseudo = `::view-transition-${wall}(page)`;
  const pdpPseudo = `::view-transition-${pdp}(page)`;

  track(
    root.animate(
      [
        { transformOrigin: "0 0", transform: forward ? identity : zoomedIn },
        { transformOrigin: "0 0", transform: forward ? zoomedIn : identity },
      ],
      { ...timing, pseudoElement: wallPseudo },
    ),
  );

  // The handover happens on a linear clock where the two layouts coincide: at the
  // very end when zooming in, at the very start when zooming out.
  const fade = (pseudoElement: string, from: number, to: number, start: number, end: number) =>
    track(
      root.animate(
        [
          { opacity: from },
          { opacity: from, offset: start },
          { opacity: to, offset: end },
          { opacity: to },
        ],
        { ...timing, easing: "linear", pseudoElement },
      ),
    );

  if (forward) {
    fade(wallPseudo, 1, 0, 0.72, 1);
    fade(pdpPseudo, 0, 1, 0.66, 0.96);
  } else {
    fade(wallPseudo, 0, 1, 0, 0.16);
    fade(pdpPseudo, 1, 0, 0.02, 0.22);
  }
}

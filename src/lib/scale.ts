/** Display width relative to the shelf: tall high-tops sit a little narrower than long low-tops. */
export const scaleForAspect = (aspect: number) =>
  Math.round(Math.min(0.92, Math.max(0.78, 0.62 + 0.13 * aspect)) * 100) / 100;

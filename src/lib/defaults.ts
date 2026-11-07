/** Landing-page copy used when a brand hasn't customised it yet (client-safe, no zod). */
export const DEFAULT_LANDING = {
  manifesto:
    "Every pair on this wall was chosen to be looked at twice. Sculpted soles, honest materials and colour that holds its own on any street.",
  featured: [] as string[],
  featuredLabel: "Featured drop",
  rackTitle: "The full rack",
  promises: [
    { title: "Free shipping", body: "Tracked to your door within 48 hours on qualifying orders." },
    { title: "30-day returns", body: "Not the one? Send it back within 30 days, no questions asked." },
    { title: "Built to last", body: "Premium leathers, knits and foams, finished by hand." },
  ],
  closingTitle: "Find your pair.",
  newsletter: "New drops land here first. No spam, ever.",
};

export const DEFAULT_SOCIALS = {
  instagram: "",
  tiktok: "",
  x: "",
  youtube: "",
  facebook: "",
  pinterest: "",
};

import type { DEFAULT_SOCIALS } from "./defaults";

export type SocialId = keyof typeof DEFAULT_SOCIALS;

export const SOCIAL_NETWORKS: { id: SocialId; label: string; base: string }[] = [
  { id: "instagram", label: "Instagram", base: "https://www.instagram.com/" },
  { id: "tiktok", label: "TikTok", base: "https://www.tiktok.com/@" },
  { id: "x", label: "X", base: "https://x.com/" },
  { id: "youtube", label: "YouTube", base: "https://www.youtube.com/@" },
  { id: "facebook", label: "Facebook", base: "https://www.facebook.com/" },
  { id: "pinterest", label: "Pinterest", base: "https://www.pinterest.com/" },
];

/** Accepts a full URL, "instagram.com/brand" or just "@brand". */
export function socialUrl(base: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+\//.test(v)) return `https://${v}`;
  return base + v.replace(/^@/, "");
}

export function socialLinks(socials: Partial<Record<SocialId, string>>) {
  return SOCIAL_NETWORKS.flatMap(({ id, label, base }) => {
    const href = socialUrl(base, socials[id] ?? "");
    return href ? [{ id, label, href }] : [];
  });
}

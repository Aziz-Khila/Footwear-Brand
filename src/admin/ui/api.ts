import type { BrandConfig, ProductData } from "@/lib/schema";

export type BrandSummary = { id: string; name: string; products: number; accent: string };

export type StudioState = {
  activeId: string;
  brands: BrandSummary[];
  brand: BrandConfig;
  products: ProductData[];
  modelReady: boolean;
};

export type UploadedShoe = {
  file: string;
  width: number;
  height: number;
  scale: number;
  view: "side" | "angle";
  facing?: "left" | "right";
  sideScore: number;
};

export type ExportResult = {
  path: string;
  files: number;
  git: "committed" | "nothing-to-commit" | "staged" | "unavailable";
  commit?: string;
  warnings: string[];
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/admin/api/${url}`, init);
  const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  if (!res.ok || data.error) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  state: () => call<StudioState>("state", { cache: "no-store" }),
  createBrand: (name: string) => call<{ activeId: string }>("brands", json("POST", { action: "create", name })),
  activate: (id: string) => call<{ activeId: string }>("brands", json("POST", { action: "activate", id })),
  deleteBrand: (id: string) => call<{ activeId: string }>("brands", json("POST", { action: "delete", id })),
  saveBrand: (brand: BrandConfig) => call<{ brand: BrandConfig }>("brand", json("PUT", brand)),
  saveProducts: (products: ProductData[]) => call<{ products: ProductData[] }>("products", json("PUT", products)),
  upload: <T>(kind: "shoe" | "logo" | "favicon", file: File) => {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    return call<T>("upload", { method: "POST", body: form });
  },
  flip: (file: string) => call<{ file: string; width: number; height: number }>("flip", json("POST", { file })),
  exportBrand: () => call<ExportResult>("export", { method: "POST" }),
  openFolder: (path: string) => call<{ ok: true }>("export", json("PUT", { path })),
};

export const assetUrl = (file: string) => `/brand/${file}`;

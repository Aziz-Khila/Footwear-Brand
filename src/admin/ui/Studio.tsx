"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FONT_LABELS, MONO_FONTS, SANS_FONTS, type BrandConfig, type ProductData } from "@/lib/schema";
import { slugify } from "@/lib/slug";
import { SOCIAL_NETWORKS } from "@/lib/socials";
import { api, assetUrl, type ExportResult, type StudioState } from "./api";
import { Button, ColorInput, Field, NumberInput, Panel, Select, Slider, TextArea, TextInput } from "./fields";
import { ProductsEditor } from "./ProductsEditor";

type Section = "identity" | "theme" | "text" | "landing" | "shop" | "products" | "export";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "identity", label: "Identity" },
  { id: "theme", label: "Theme" },
  { id: "text", label: "Text" },
  { id: "landing", label: "Landing page" },
  { id: "shop", label: "Shop settings" },
  { id: "products", label: "Products" },
  { id: "export", label: "Export" },
];

const THEME_PRESETS: { name: string; accent: string; wall: string; ink: string; mute: string }[] = [
  { name: "Ember", accent: "#ff6b1f", wall: "#262428", ink: "#eeece8", mute: "#a19ea3" },
  { name: "Ice", accent: "#4cc9ff", wall: "#1f252e", ink: "#eef4f8", mute: "#9aa7b3" },
  { name: "Acid", accent: "#c6ff3d", wall: "#232323", ink: "#f1f1ec", mute: "#a3a39b" },
  { name: "Rose", accent: "#ff4f8b", wall: "#2a2226", ink: "#f6ecef", mute: "#b29fa6" },
  { name: "Gold", accent: "#f5b83d", wall: "#27231c", ink: "#f3eee4", mute: "#ada595" },
  { name: "Violet", accent: "#8b5cff", wall: "#221f2b", ink: "#efecf6", mute: "#a59fb5" },
];

const SIZE_PRESETS: { label: string; system: string; sizes: string[] }[] = [
  { label: "EU 38–46", system: "EU", sizes: ["38", "39", "40", "41", "42", "43", "44", "45", "46"] },
  { label: "EU 36–42", system: "EU", sizes: ["36", "37", "38", "39", "40", "41", "42"] },
  {
    label: "US 7–13",
    system: "US",
    sizes: ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"],
  },
  { label: "UK 6–12", system: "UK", sizes: ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "11", "12"] },
];

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "SEK", "DKK", "NOK", "PLN", "AED", "MAD"];
const LOCALES = [
  { value: "en-IE", label: "English (€1,234)" },
  { value: "en-US", label: "English US ($1,234)" },
  { value: "en-GB", label: "English UK (£1,234)" },
  { value: "fr-FR", label: "Français (1 234 €)" },
  { value: "de-DE", label: "Deutsch (1.234 €)" },
  { value: "es-ES", label: "Español (1234 €)" },
  { value: "it-IT", label: "Italiano (1.234 €)" },
  { value: "nl-NL", label: "Nederlands (€ 1.234)" },
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Debounced, serialised saving: keystrokes coalesce, and saves never overlap or reorder. */
function useAutosave<T>(save: (value: T) => Promise<unknown>, setStatus: (s: SaveStatus) => void, onError: (m: string) => void) {
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<{ value: T } | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const inFlight = useRef(0);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const job = pending.current;
    if (!job) return chain.current;
    pending.current = null;
    setStatus("saving");
    inFlight.current++;
    chain.current = chain.current
      .then(() => save(job.value))
      .then(() => setStatus(pending.current ? "saving" : "saved"))
      .catch((err: unknown) => {
        setStatus("error");
        onError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        inFlight.current--;
      });
    return chain.current;
  }, [save, setStatus, onError]);

  const busy = useCallback(() => pending.current !== null || inFlight.current > 0, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setStatus("saving");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 450);
    },
    [flush, setStatus],
  );

  return { schedule, flush, busy };
}

export function Studio() {
  const [state, setState] = useState<StudioState | null>(null);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [products, setProducts] = useState<ProductData[] | null>(null);
  const [section, setSection] = useState<Section>("identity");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState("/");
  const [previewKey, setPreviewKey] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [newName, setNewName] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [exported, setExported] = useState<ExportResult | null>(null);
  const [sizesVersion, setSizesVersion] = useState(0);
  const [lastProduct, setLastProduct] = useState<string | null>(null);

  const apply = useCallback((s: StudioState) => {
    setState(s);
    setBrand(s.brand);
    setProducts(s.products);
  }, []);

  const load = useCallback(() => api.state().then(apply), [apply]);

  useEffect(() => {
    let alive = true;
    api
      .state()
      .then((s) => alive && apply(s))
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [apply]);

  const brandSaver = useAutosave(api.saveBrand, setStatus, setError);
  const productSaver = useAutosave(api.saveProducts, setStatus, setError);

  // Pick up changes made outside this tab (another tab, a script, edits on disk) when coming back to it,
  // so a stale copy here never autosaves over them
  const brandBusy = brandSaver.busy;
  const productsBusy = productSaver.busy;
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible" || brandBusy() || productsBusy()) return;
      api
        .state()
        .then((s) => !brandBusy() && !productsBusy() && apply(s))
        .catch(() => {});
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [apply, brandBusy, productsBusy]);

  const editBrand = (patch: (b: BrandConfig) => BrandConfig) => {
    if (!brand) return;
    const next = patch(brand);
    setBrand(next);
    brandSaver.schedule(next);
  };

  const editProducts = (next: ProductData[]) => {
    setProducts(next);
    productSaver.schedule(next);
  };

  const flushAll = async () => {
    await Promise.all([brandSaver.flush(), productSaver.flush()]);
  };

  const switchBrand = async (run: () => Promise<unknown>) => {
    setWorking(true);
    try {
      await flushAll();
      await run();
      await load();
      setPreviewPath("/");
      setExported(null);
      setPreviewKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  };

  const runExport = async () => {
    setWorking(true);
    setExported(null);
    try {
      await flushAll();
      setExported(await api.exportBrand());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWorking(false);
    }
  };

  const uploadMark = async (kind: "logo" | "favicon", file: File | undefined) => {
    if (!file) return;
    try {
      await brandSaver.flush();
      const { brand: saved } = await api.upload<{ brand: BrandConfig }>(kind, file);
      setBrand(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!state || !brand || !products) {
    return (
      <div className="grid min-h-svh place-items-center text-[13px] text-mute">
        {error ? <p className="max-w-md whitespace-pre-line text-red-300">{error}</p> : "Loading studio…"}
      </div>
    );
  }

  const t = brand.theme;
  const setTheme = (patch: Partial<BrandConfig["theme"]>) => editBrand((b) => ({ ...b, theme: { ...b.theme, ...patch } }));
  const setCopy = (patch: Partial<BrandConfig["copy"]>) => editBrand((b) => ({ ...b, copy: { ...b.copy, ...patch } }));
  const setLanding = (patch: Partial<BrandConfig["landing"]>) =>
    editBrand((b) => ({ ...b, landing: { ...b.landing, ...patch } }));
  const setCommerce = (patch: Partial<BrandConfig["commerce"]>) =>
    editBrand((b) => ({ ...b, commerce: { ...b.commerce, ...patch } }));

  const exportSlug = slugify(brand.name, "brand");

  return (
    <div
      className="grid h-svh grid-cols-[220px_minmax(380px,520px)_1fr] text-ink"
      style={{ "--brand-accent": t.accent } as React.CSSProperties}
    >
      {/* Sidebar */}
      <aside className="flex flex-col gap-6 border-r border-white/[0.06] bg-black/30 p-4">
        <div>
          <div className="flex items-center gap-2 text-[14px] font-bold tracking-[-0.03em]">
            <span className="size-2.5 rounded-full" style={{ background: t.accent }} />
            Brand Studio
          </div>
          <p className="label mt-1">Local only</p>
        </div>

        <div className="space-y-2">
          <span className="label block">Brand</span>
          <Select
            value={state.activeId}
            onChange={(id) => switchBrand(() => api.activate(id))}
            options={state.brands.map((b) => ({
              value: b.id,
              label: `${b.name}${b.id === "concept" ? " (concept)" : ""}`,
            }))}
          />
          {newName === null ? (
            <div className="flex gap-2">
              <Button onClick={() => setNewName("")} disabled={working}>
                + New brand
              </Button>
              {state.activeId !== "concept" && (
                <Button
                  variant="danger"
                  disabled={working}
                  onClick={() =>
                    window.confirm(`Delete ${brand.name}? Its folder in brands/ is removed.`) &&
                    switchBrand(() => api.deleteBrand(state.activeId))
                  }
                >
                  Delete
                </Button>
              )}
            </div>
          ) : (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newName.trim();
                if (!name) return;
                setNewName(null);
                switchBrand(() => api.createBrand(name));
              }}
            >
              <TextInput value={newName} onChange={setNewName} placeholder="Brand name" />
              <p className="text-[11.5px] text-mute">Starts as a copy of {brand.name}.</p>
              <div className="flex gap-2">
                <Button type="submit" variant="primary">
                  Create
                </Button>
                <Button onClick={() => setNewName(null)}>Cancel</Button>
              </div>
            </form>
          )}
        </div>

        <nav className="flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${
                section === s.id ? "bg-white/10 font-semibold text-ink" : "text-mute hover:bg-white/[0.05] hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto space-y-1 text-[12px]">
          <p className={status === "error" ? "text-red-300" : "text-mute"}>
            {working ? "Working…" : { idle: "All changes saved", saving: "Saving…", saved: "All changes saved", error: "Save failed" }[status]}
          </p>
          <a href="/" target="_blank" className="text-mute underline-offset-2 hover:text-ink hover:underline">
            Open store in a new tab ↗
          </a>
        </div>
      </aside>

      {/* Editor */}
      <main className="space-y-4 overflow-y-auto p-5">
        {error && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-[12.5px] text-red-200">
            <p className="whitespace-pre-line">{error}</p>
            <button type="button" onClick={() => setError(null)} className="label text-red-200">
              Dismiss
            </button>
          </div>
        )}

        {section === "identity" && (
          <>
            <Panel title="Identity" hint="The brand name is used in the header, page titles and footer.">
              <Field label="Brand name">
                <TextInput value={brand.name} onChange={(name) => editBrand((b) => ({ ...b, name }))} />
              </Field>
              <Field label="Tagline" hint="Used as the site description for search engines and link previews.">
                <TextInput value={brand.tagline} onChange={(tagline) => editBrand((b) => ({ ...b, tagline }))} />
              </Field>
            </Panel>
            <Panel title="Logo" hint="SVG or PNG on a transparent background. Without one, the name is shown as a wordmark.">
              <div className="flex h-20 items-center justify-center rounded-xl bg-black/40">
                {brand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- uploaded brand asset
                  <img src={assetUrl(brand.logo)} alt="" className="h-8 w-auto max-w-[220px] object-contain" />
                ) : (
                  <span className="text-[18px] font-bold tracking-[-0.04em]">{brand.name}.</span>
                )}
              </div>
              <div className="flex gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center rounded-full bg-white/[0.07] px-4 text-[12.5px] font-semibold hover:bg-white/[0.12]">
                  Upload logo
                  <input type="file" accept="image/*" hidden onChange={(e) => uploadMark("logo", e.target.files?.[0])} />
                </label>
                {brand.logo && <Button onClick={() => editBrand((b) => ({ ...b, logo: null }))}>Use wordmark</Button>}
              </div>
              {brand.logo && (
                <Field label="In the header" hint="Symbol-only logos usually look best with the name beside them.">
                  <Select
                    value={brand.logoText ? "with-name" : "logo-only"}
                    onChange={(v) => editBrand((b) => ({ ...b, logoText: v === "with-name" }))}
                    options={[
                      { value: "with-name", label: `Logo + “${brand.name}.”` },
                      { value: "logo-only", label: "Logo only" },
                    ]}
                  />
                </Field>
              )}
            </Panel>
            <Panel title="Socials" hint="Shown in the footer. Paste a full link or just the @handle; leave empty to hide.">
              <div className="grid grid-cols-2 gap-3">
                {SOCIAL_NETWORKS.map((s) => (
                  <Field key={s.id} label={s.label}>
                    <TextInput
                      value={brand.socials[s.id] ?? ""}
                      placeholder="@handle"
                      onChange={(v) => editBrand((b) => ({ ...b, socials: { ...b.socials, [s.id]: v } }))}
                    />
                  </Field>
                ))}
              </div>
            </Panel>
            <Panel title="Favicon" hint="The small icon in the browser tab. A square PNG works best.">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-lg bg-black/40">
                  {brand.favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element -- uploaded brand asset
                    <img src={assetUrl(brand.favicon)} alt="" className="size-7 object-contain" />
                  ) : (
                    <span className="label">None</span>
                  )}
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center rounded-full bg-white/[0.07] px-4 text-[12.5px] font-semibold hover:bg-white/[0.12]">
                  Upload favicon
                  <input type="file" accept="image/*" hidden onChange={(e) => uploadMark("favicon", e.target.files?.[0])} />
                </label>
                {brand.favicon && <Button onClick={() => editBrand((b) => ({ ...b, favicon: null }))}>Remove</Button>}
              </div>
            </Panel>
          </>
        )}

        {section === "theme" && (
          <>
            <Panel title="Presets" hint="A starting point — every colour can be fine-tuned below.">
              <div className="grid grid-cols-3 gap-2">
                {THEME_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setTheme({ accent: p.accent, wall: p.wall, ink: p.ink, mute: p.mute })}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.08] p-2.5 text-left text-[12.5px] font-semibold hover:border-white/25"
                    style={{ background: p.wall }}
                  >
                    <span className="size-4 rounded-full shadow-[0_0_12px_currentColor]" style={{ background: p.accent, color: p.accent }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Colours">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Accent" hint="Shelf glow, light, buttons">
                  <ColorInput value={t.accent} onChange={(accent) => setTheme({ accent })} />
                </Field>
                <Field label="Wall" hint="Base colour of the wall">
                  <ColorInput value={t.wall} onChange={(wall) => setTheme({ wall })} />
                </Field>
                <Field label="Text">
                  <ColorInput value={t.ink} onChange={(ink) => setTheme({ ink })} />
                </Field>
                <Field label="Muted text">
                  <ColorInput value={t.mute} onChange={(mute) => setTheme({ mute })} />
                </Field>
              </div>
            </Panel>
            <Panel title="Lighting">
              <Field label="Spotlights">
                <Slider value={t.spotlight} min={0} max={2} step={0.05} onChange={(spotlight) => setTheme({ spotlight })} />
              </Field>
              <Field label="Haze">
                <Slider value={t.haze} min={0} max={2} step={0.05} onChange={(haze) => setTheme({ haze })} />
              </Field>
            </Panel>
            <Panel title="Typography">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Main font">
                  <Select
                    value={t.sans}
                    onChange={(sans) => setTheme({ sans })}
                    options={SANS_FONTS.map((f) => ({ value: f, label: FONT_LABELS[f] }))}
                  />
                </Field>
                <Field label="Label font">
                  <Select
                    value={t.mono}
                    onChange={(mono) => setTheme({ mono })}
                    options={MONO_FONTS.map((f) => ({ value: f, label: FONT_LABELS[f] }))}
                  />
                </Field>
              </div>
            </Panel>
            <Panel title="Wall layout" hint="Shoes per row on desktop. Phones always show two.">
              <Slider
                value={brand.layout.columns}
                min={3}
                max={6}
                step={1}
                format={(v) => String(v)}
                onChange={(columns) => editBrand((b) => ({ ...b, layout: { ...b.layout, columns } }))}
              />
            </Panel>
          </>
        )}

        {section === "text" && (
          <Panel title="Text on the site">
            <Field label="Collection label" hint="Top-left, next to the logo">
              <TextInput value={brand.copy.collection} onChange={(collection) => setCopy({ collection })} />
            </Field>
            <Field label="Wall label" hint="Small label above the headline">
              <TextInput value={brand.copy.showroomLabel} onChange={(showroomLabel) => setCopy({ showroomLabel })} />
            </Field>
            <Field label="Wall headline">
              <TextInput value={brand.copy.wallHeadline} onChange={(wallHeadline) => setCopy({ wallHeadline })} />
            </Field>
            <Field label="Footer note" hint="Centre of the wall footer">
              <TextInput value={brand.copy.footerNote} onChange={(footerNote) => setCopy({ footerNote })} />
            </Field>
            <Field label="Checkout message" hint="Shown when the checkout button is pressed">
              <TextInput value={brand.copy.checkoutNotice} onChange={(checkoutNotice) => setCopy({ checkoutNotice })} />
            </Field>
          </Panel>
        )}

        {section === "landing" && (
          <>
            <Panel title="Manifesto" hint="A statement that lights up word by word as visitors scroll past the wall. Leave empty to hide it.">
              <TextArea value={brand.landing.manifesto} rows={4} onChange={(manifesto) => setLanding({ manifesto })} />
            </Panel>
            <Panel
              title="Featured drop"
              hint="A pinned scroll scene: each pair glides onto a lit shelf in turn and its first three details are called out."
            >
              <Field
                label={`Pairs (${brand.landing.featured.length} / 4)`}
                hint={`Tap in the order they should appear. None picked shows the first product (${products[0]?.name ?? "—"}).`}
              >
                <div className="flex flex-wrap gap-1.5">
                  {products.map((p) => {
                    const order = brand.landing.featured.indexOf(p.slug);
                    const full = brand.landing.featured.length >= 4;
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        disabled={order < 0 && full}
                        onClick={() =>
                          setLanding({
                            featured:
                              order >= 0
                                ? brand.landing.featured.filter((s) => s !== p.slug)
                                : [...brand.landing.featured, p.slug],
                          })
                        }
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors disabled:opacity-30 ${
                          order >= 0
                            ? "border-[var(--brand-accent)] bg-white/[0.08] text-ink"
                            : "border-white/10 text-mute hover:border-white/25 hover:text-ink"
                        }`}
                      >
                        {order >= 0 && (
                          <span className="grid size-4 place-items-center rounded-full bg-[var(--brand-accent)] text-[9.5px] font-bold text-black">
                            {order + 1}
                          </span>
                        )}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Label">
                <TextInput value={brand.landing.featuredLabel} onChange={(featuredLabel) => setLanding({ featuredLabel })} />
              </Field>
            </Panel>
            <Panel title="Catalogue" hint="Every product on one long shelf that slides sideways as you scroll.">
              <Field label="Title">
                <TextInput value={brand.landing.rackTitle} onChange={(rackTitle) => setLanding({ rackTitle })} />
              </Field>
            </Panel>
            <Panel title="Promises" hint="Up to three — shipping, returns, craft… Clear a title and text to drop one.">
              {[0, 1, 2].map((i) => {
                const item = brand.landing.promises[i] ?? { title: "", body: "" };
                const setItem = (patch: Partial<typeof item>) => {
                  const list = [0, 1, 2].map((j) => brand.landing.promises[j] ?? { title: "", body: "" });
                  list[i] = { ...item, ...patch };
                  setLanding({ promises: list.filter((p) => p.title.trim() || p.body.trim()) });
                };
                return (
                  <div key={i} className="grid grid-cols-[1fr_2fr] gap-2">
                    <TextInput value={item.title} placeholder={`Promise ${i + 1}`} onChange={(title) => setItem({ title })} />
                    <TextInput value={item.body} placeholder="One sentence" onChange={(body) => setItem({ body })} />
                  </div>
                );
              })}
            </Panel>
            <Panel title="Closing" hint="The last screen: a headline, a newsletter sign-up and the brand name rising letter by letter.">
              <Field label="Headline">
                <TextInput value={brand.landing.closingTitle} onChange={(closingTitle) => setLanding({ closingTitle })} />
              </Field>
              <Field label="Newsletter text" hint="The form shows a thank-you message; connect it to your email tool when going live.">
                <TextInput value={brand.landing.newsletter} onChange={(newsletter) => setLanding({ newsletter })} />
              </Field>
            </Panel>
          </>
        )}

        {section === "shop" && (
          <>
            <Panel title="Prices">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency">
                  <Select
                    value={brand.commerce.currency}
                    onChange={(currency) => setCommerce({ currency })}
                    options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  />
                </Field>
                <Field label="Number format">
                  <Select
                    value={brand.commerce.locale}
                    onChange={(locale) => setCommerce({ locale })}
                    options={LOCALES}
                  />
                </Field>
              </div>
              <Field label="Free shipping from" hint="Drives the progress bar in the bag. Set 0 to always show free shipping.">
                <NumberInput
                  value={brand.commerce.freeShippingThreshold}
                  onChange={(freeShippingThreshold) => setCommerce({ freeShippingThreshold })}
                />
              </Field>
            </Panel>
            <Panel title="Sizes" hint="The size grid on every product page.">
              <div className="flex flex-wrap gap-2">
                {SIZE_PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    onClick={() => {
                      setCommerce({ sizeSystem: p.system, sizes: p.sizes });
                      setSizesVersion((v) => v + 1);
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-3">
                <Field label="System">
                  <TextInput value={brand.commerce.sizeSystem} onChange={(sizeSystem) => setCommerce({ sizeSystem })} />
                </Field>
                <Field label="Sizes" hint="Comma separated">
                  <SizesInput
                    key={`${state.activeId}-${sizesVersion}`}
                    value={brand.commerce.sizes}
                    onChange={(sizes) => setCommerce({ sizes })}
                  />
                </Field>
              </div>
            </Panel>
          </>
        )}

        {section === "products" && (
          <ProductsEditor
            brand={brand}
            products={products}
            onChange={editProducts}
            modelReady={state.modelReady}
            onModelReady={() => setState((s) => (s ? { ...s, modelReady: true } : s))}
            onPreview={(slug) => {
              setLastProduct(slug);
              // A new or renamed product only exists for the store once its save has landed
              productSaver.flush().then(() => {
                setPreviewPath(`/p/${slug}`);
                setPreviewKey((k) => k + 1);
              });
            }}
            onError={setError}
          />
        )}

        {section === "export" && (
          <Panel
            title={`Export ${brand.name}`}
            hint="Creates a standalone storefront with only this brand — no studio, no other brands — ready to push to the client's GitHub."
          >
            <div className="rounded-xl bg-black/30 p-3 font-mono text-[12px] text-mute">exports/{exportSlug || "brand"}/</div>
            <Button variant="primary" onClick={runExport} disabled={working}>
              {working ? "Exporting…" : "Export brand"}
            </Button>
            {exported && (
              <div className="space-y-3 rounded-xl border border-white/[0.08] bg-black/30 p-4 text-[12.5px]">
                <p className="font-semibold text-ink">Exported {exported.files} files</p>
                <p className="break-all font-mono text-[11.5px] text-mute">{exported.path}</p>
                <p className="text-mute">
                  {
                    {
                      committed: `Git repository ready — committed “${exported.commit}”.`,
                      "nothing-to-commit": "Git repository up to date — nothing changed since the last export.",
                      staged: "Git repository created; files are staged but not committed.",
                      unavailable: "Git isn't installed, so no repository was created.",
                    }[exported.git]
                  }
                </p>
                {exported.warnings.map((w) => (
                  <p key={w} className="text-amber-300">
                    {w}
                  </p>
                ))}
                <Button onClick={() => api.openFolder(exported.path).catch((e: Error) => setError(e.message))}>
                  Open folder
                </Button>
                <div>
                  <p className="label mb-1.5">Push to the client&apos;s GitHub</p>
                  <pre className="overflow-x-auto rounded-lg bg-black/50 p-3 font-mono text-[11.5px] leading-relaxed text-ink">
                    {`cd "${exported.path}"
git remote add origin https://github.com/<client>/<repo>.git
git push -u origin main`}
                  </pre>
                </div>
              </div>
            )}
          </Panel>
        )}
      </main>

      {/* Live preview */}
      <section className="flex min-w-0 flex-col border-l border-white/[0.06] bg-black/40">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreviewPath("/")}
              className={`label rounded-full px-3 py-1.5 ${previewPath === "/" ? "bg-white/10 text-ink" : "hover:text-ink"}`}
            >
              Wall
            </button>
            <button
              type="button"
              onClick={() => {
                const slug = products.some((p) => p.slug === lastProduct) ? lastProduct : products[0].slug;
                setPreviewPath(`/p/${slug}`);
              }}
              className={`label rounded-full px-3 py-1.5 ${previewPath !== "/" ? "bg-white/10 text-ink" : "hover:text-ink"}`}
            >
              Product
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMobile((m) => !m)}
              className={`label rounded-full px-3 py-1.5 ${mobile ? "bg-white/10 text-ink" : "hover:text-ink"}`}
            >
              Mobile
            </button>
            <button type="button" onClick={() => setPreviewKey((k) => k + 1)} className="label rounded-full px-3 py-1.5 hover:text-ink">
              Reload
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden p-3">
          <iframe
            key={`${previewKey}-${previewPath}`}
            src={previewPath}
            title="Store preview"
            className={`h-full rounded-lg border border-white/[0.08] bg-black ${mobile ? "w-[390px]" : "w-full"}`}
          />
        </div>
      </section>
    </div>
  );
}

function SizesInput({ value, onChange }: { value: string[]; onChange: (sizes: string[]) => void }) {
  const [draft, setDraft] = useState(value.join(", "));
  return (
    <TextInput
      value={draft}
      onChange={(text) => {
        setDraft(text);
        const sizes = text
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (sizes.length) onChange([...new Set(sizes)]);
      }}
    />
  );
}

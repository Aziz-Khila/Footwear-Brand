import type { Metadata } from "next";
import { Atmosphere } from "@/components/Atmosphere";
import { CartDrawer } from "@/components/CartDrawer";
import { Header } from "@/components/Header";
import { assetUrl, brand } from "@/lib/brand";
import { fontClasses } from "@/lib/fonts";
import { validateBrand } from "@/lib/validate-brand";
import "../globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.name} — The Wall`,
    template: `%s | ${brand.name}`,
  },
  description: brand.tagline,
  icons: brand.favicon ? { icon: assetUrl(brand.favicon) } : undefined,
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  validateBrand();
  const { theme } = brand;

  return (
    <html
      lang="en"
      className={`${fontClasses()} antialiased`}
      style={
        {
          "--brand-accent": theme.accent,
          "--brand-ink": theme.ink,
          "--brand-mute": theme.mute,
          "--brand-wall": theme.wall,
        } as React.CSSProperties
      }
    >
      <body className="scene" suppressHydrationWarning>
        <Atmosphere
          accent={theme.accent}
          wall={theme.wall}
          spotlight={theme.spotlight}
          haze={theme.haze}
          columns={brand.layout.columns}
        />
        <Header />
        {children}
        <CartDrawer />
      </body>
    </html>
  );
}

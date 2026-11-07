import {
  Archivo,
  Bricolage_Grotesque,
  DM_Mono,
  DM_Sans,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Manrope,
  Space_Grotesk,
  Space_Mono,
  Syne,
  Unbounded,
} from "next/font/google";
import { brand } from "./brand";
import type { MonoFont, SansFont } from "./schema";

// Every option sets the same CSS variables, so only the selected font's class needs
// to be applied. Exported brands get a version of this file with just their fonts.
const geist = Geist({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const inter = Inter({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const syne = Syne({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const unbounded = Unbounded({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-brand-sans", preload: false });

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-brand-mono", preload: false });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-brand-mono", preload: false });
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-brand-mono",
  preload: false,
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-brand-mono",
  preload: false,
});
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-brand-mono", preload: false });

const sans: Partial<Record<SansFont, { variable: string }>> = {
  geist,
  inter,
  "inter-tight": interTight,
  "space-grotesk": spaceGrotesk,
  manrope,
  "dm-sans": dmSans,
  archivo,
  syne,
  unbounded,
  "bricolage-grotesque": bricolage,
};

const mono: Partial<Record<MonoFont, { variable: string }>> = {
  "geist-mono": geistMono,
  "jetbrains-mono": jetbrainsMono,
  "ibm-plex-mono": ibmPlexMono,
  "space-mono": spaceMono,
  "dm-mono": dmMono,
};

export function fontClasses() {
  const s = sans[brand.theme.sans] ?? geist;
  const m = mono[brand.theme.mono] ?? geistMono;
  return `${s.variable} ${m.variable}`;
}

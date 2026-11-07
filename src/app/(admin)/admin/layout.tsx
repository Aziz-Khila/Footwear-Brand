import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../../globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-brand-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-brand-mono" });

export const metadata: Metadata = {
  title: "Brand Studio",
  robots: { index: false, follow: false },
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== "development") notFound();
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} antialiased`}>
      <body className="bg-[#141316]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

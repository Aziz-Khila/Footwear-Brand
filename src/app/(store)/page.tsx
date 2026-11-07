import { Wall } from "@/components/Wall";
import { Landing } from "@/components/landing/Landing";
import { brand } from "@/lib/brand";
import { products } from "@/lib/products";

export default function Home() {
  return (
    <main className="relative">
      {/* The wall is the page group for the wall ⇄ product camera move; the landing below stays out of it */}
      <section id="wall" className="vt-page relative flex min-h-svh flex-col">
        <div className="px-5 pt-20 md:px-8 md:pt-24">
          <p className="label">{brand.copy.showroomLabel}</p>
          <h1 className="mt-1 text-[13px] font-medium text-ink/80">{brand.copy.wallHeadline}</h1>
        </div>

        <div className="flex flex-1 items-center py-10 md:py-0">
          <Wall />
        </div>

        <footer className="label flex items-center justify-between px-5 pb-5 md:px-8">
          <span>© {brand.name}</span>
          <span className="scroll-cue hidden items-center gap-3 sm:flex">
            <span className="scroll-cue-line" />
            Scroll to explore
          </span>
          <span>
            {products.length} / {products.length} on display
          </span>
        </footer>
      </section>

      <Landing />
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

function Letter({ progress, i, n, children }: { progress: MotionValue<number>; i: number; n: number; children: string }) {
  const reduce = useReducedMotion();
  const start = (i / n) * 0.5;
  const y = useTransform(progress, [start, start + 0.5], reduce ? ["0%", "0%"] : ["105%", "0%"]);
  return (
    <motion.span style={{ y }} className="inline-block">
      {children === " " ? "\u00a0" : children}
    </motion.span>
  );
}

/** The brand name rises out of the floor letter by letter, then a sign-up and the footer. */
export function Closing({
  name,
  title,
  newsletter,
  footerNote,
  socials,
}: {
  name: string;
  title: string;
  newsletter: string;
  footerNote: string;
  socials: { id: string; label: string; href: string }[];
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const letters = [...name.toUpperCase()];

  return (
    <section id="newsletter" ref={ref} className="relative overflow-hidden px-5 pt-[16vh] md:px-8">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <h2 className="reveal max-w-[12ch] text-[clamp(2.4rem,6vw,5.5rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-ink">
          {title}
        </h2>
        <form
          className="reveal w-full max-w-[420px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.includes("@")) setJoined(true);
          }}
        >
          <p className="mb-3 text-[13.5px] text-mute">{newsletter}</p>
          {joined ? (
            <p className="flex h-[46px] items-center rounded-full border border-white/15 px-5 text-[13px] text-ink">
              <span className="mr-2 text-ember">●</span> You&apos;re on the list.
            </p>
          ) : (
            <div className="flex h-[46px] items-center rounded-full border border-white/15 bg-white/[0.04] pl-5 pr-1 focus-within:border-white/35">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-mute/60"
              />
              <button type="submit" className="pill-knob shrink-0" aria-label="Join">
                →
              </button>
            </div>
          )}
        </form>
      </div>

      <div
        aria-hidden
        className="closing-mark mt-[10vh] flex select-none justify-center overflow-hidden whitespace-nowrap text-[19vw] font-bold leading-[0.8] tracking-[-0.06em]"
      >
        {letters.map((l, i) => (
          <Letter key={i} progress={scrollYProgress} i={i} n={letters.length}>
            {l}
          </Letter>
        ))}
      </div>

      <footer className="label relative flex flex-col gap-3 border-t border-white/10 py-6 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-6">
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>© {name}</span>
          {socials.map((s) => (
            <a
              key={s.id}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1 transition-colors hover:text-ink"
            >
              {s.label}
              <span className="inline-block transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px">
                ↗
              </span>
            </a>
          ))}
        </span>
        <span className="sm:text-center">{footerNote}</span>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="text-left transition-colors hover:text-ink sm:justify-self-end sm:text-right"
        >
          Back to the wall ↑
        </button>
      </footer>
    </section>
  );
}

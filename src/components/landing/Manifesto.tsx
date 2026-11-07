"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

function Word({ progress, range, children }: { progress: MotionValue<number>; range: [number, number]; children: string }) {
  const reduce = useReducedMotion();
  const opacity = useTransform(progress, range, reduce ? [1, 1] : [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.24em] inline-block">
      {children}
    </motion.span>
  );
}

/** A statement that lights up word by word as it scrolls through the viewport. */
export function Manifesto({ text, index }: { text: string; index: string }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.4"] });
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <section id="story" ref={ref} className="relative mx-auto max-w-[1180px] px-5 py-[26vh] md:px-8">
      <p className="label mb-8">
        <span className="text-ember">{index}</span>&nbsp;&nbsp;Manifesto
      </p>
      <p className="text-[clamp(1.9rem,4.6vw,4.4rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-ink">
        {words.map((w, i) => (
          <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
            {w}
          </Word>
        ))}
      </p>
    </section>
  );
}

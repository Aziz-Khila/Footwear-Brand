/** Three brand promises; revealed by a CSS scroll timeline (no JavaScript). */
export function Promises({ items, index }: { items: { title: string; body: string }[]; index: string }) {
  if (!items.length) return null;
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-[18vh] md:px-8">
      <p className="label mb-12">
        <span className="text-ember">{index}</span>&nbsp;&nbsp;Promises
      </p>
      <div className="grid gap-12 md:grid-cols-3 md:gap-8">
        {items.map((item, i) => (
          <div key={item.title + i} className="reveal border-t border-white/10 pt-6" style={{ "--i": i } as React.CSSProperties}>
            <span className="font-mono text-[12px] text-ember">0{i + 1}</span>
            <h3 className="mt-5 text-[clamp(1.5rem,2.4vw,2.1rem)] font-semibold tracking-[-0.035em] text-ink">{item.title}</h3>
            <p className="mt-3 max-w-[34ch] text-[14px] leading-relaxed text-mute">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

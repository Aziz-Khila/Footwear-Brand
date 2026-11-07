"use client";

import { useState } from "react";

export function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <header className="mb-4">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {hint && <p className="mt-1 text-[12.5px] leading-relaxed text-mute">{hint}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-mute/80">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13.5px] text-ink outline-none transition-colors placeholder:text-mute/50 focus:border-white/30";

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    />
  );
}

export function NumberInput({ value, onChange, min = 0, step = 1 }: { value: number; onChange: (v: number) => void; min?: number; step?: number }) {
  const [draft, setDraft] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (Number(draft) !== value) setDraft(String(value));
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n) && n >= min) onChange(n);
      }}
      className={inputClass}
    />
  );
}

export function TextArea({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} resize-y leading-relaxed`}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={`${inputClass} appearance-none`}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#1d1c20]">
          {o.label}
        </option>
      ))}
    </select>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <div className="flex items-center gap-2">
      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg border border-white/15" style={{ background: value }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      <input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          if (HEX.test(e.target.value)) onChange(e.target.value.toLowerCase());
        }}
        className={`${inputClass} font-mono uppercase`}
      />
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step,
  format = (v) => v.toFixed(2),
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer accent-[var(--brand-accent)]"
      />
      <span className="w-12 text-right font-mono text-[12px] tabular-nums text-ink">{format(value)}</span>
    </div>
  );
}

export function Chips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            className={`h-8 min-w-11 rounded-full px-3 text-[12px] font-medium tabular-nums transition-colors ${
              on ? "bg-white/[0.04] text-mute/50 line-through" : "bg-white/10 text-ink hover:bg-white/15"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-ink text-[#1d1c20] hover:bg-white",
    ghost: "bg-white/[0.07] text-ink hover:bg-white/[0.12]",
    danger: "bg-red-500/10 text-red-300 hover:bg-red-500/20",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[12.5px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  );
}

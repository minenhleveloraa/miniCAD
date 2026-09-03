import { RadioTower } from "lucide-react";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
};

export function BrandMark({ inverse = false, compact = false }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-3" aria-label="MiniCAD">
      <span
        className={`relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-105 ${
          inverse
            ? "bg-white/95 text-[var(--charcoal)] shadow-black/10"
            : "bg-[var(--charcoal)] text-white shadow-[var(--charcoal)]/10"
        }`}
      >
        <RadioTower className="relative z-10 size-5" strokeWidth={2.3} />
        <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[var(--coral)] to-[var(--coral-light)]" />
      </span>
      <span className={compact ? "hidden sm:block" : "block"}>
        <span
          className={`block text-[0.95rem] leading-none font-bold tracking-[-0.02em] ${
            inverse ? "text-white" : "text-[var(--ink)]"
          }`}
        >
          Mini<span className="hero-gradient-text font-bold">CAD</span>
        </span>
        <span
          className={`mt-1.5 block text-[0.6rem] leading-none font-medium tracking-[0.15em] uppercase ${
            inverse ? "text-white/50" : "text-[var(--ink-muted)]"
          }`}
        >
          Dispatch system
        </span>
      </span>
    </div>
  );
}

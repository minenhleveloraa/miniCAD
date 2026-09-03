import type { LucideIcon } from "lucide-react";

type PlaceholderPanelProps = {
  description: string;
  icon: LucideIcon;
  title: string;
};

export function PlaceholderPanel({
  description,
  icon: Icon,
  title,
}: PlaceholderPanelProps) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-serif text-xl text-[var(--ink)]">{title}</h2>
        <span className="text-xs font-semibold text-[var(--ink-muted)]">Not connected yet</span>
      </div>

      <div className="mt-5 grid min-h-52 place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--ink)]/12 bg-white/45 px-6 py-10 text-center">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--ink)]/9 bg-white text-[var(--ink-muted)]">
            <Icon className="size-5" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-sm font-semibold text-[var(--ink-soft)]">No data connected</p>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--ink-muted)]">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

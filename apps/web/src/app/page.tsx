import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Shield } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

export default function Home() {
  return (
    <main className="welcome-bg min-h-svh text-[var(--ink)]">
      <div className="mx-auto flex min-h-svh w-full max-w-[1440px] flex-col px-5 sm:px-8 lg:px-12">
        {/* ── Header ── */}
        <header className="animate-fade-in flex h-20 items-center justify-between sm:h-24">
          <BrandMark />

          <Link
            href="/login"
            className="group inline-flex h-11 items-center gap-2.5 rounded-full border border-[var(--ink)]/8 bg-white/70 px-5 text-sm font-semibold shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--ink)]/15 hover:bg-white hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--coral)]"
          >
            Open console
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </header>

        {/* ── Hero ── */}
        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-0 xl:gap-20">
          {/* Text side */}
          <div className="relative z-10 max-w-xl">
            <div className="animate-fade-in-up mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--coral)]/12 bg-[var(--coral)]/5 px-4 py-2 text-xs font-semibold tracking-wide text-[var(--coral)]">
              <Shield className="size-3.5" />
              Secure dispatch system
            </div>

            <h1 className="animate-fade-in-up delay-100 text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.92] font-bold tracking-[-0.04em]">
              Welcome to{" "}
              <span className="font-serif block mt-2">
                Mini<span className="hero-gradient-text">CAD</span>.
              </span>
            </h1>

            <p className="animate-fade-in-up delay-200 mt-8 max-w-md text-lg leading-relaxed text-[var(--ink-soft)] sm:text-xl">
              Your calm, connected workspace for incident coordination and
              real-time response management.
            </p>

            <div className="animate-fade-in-up delay-300 mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--coral)] to-[var(--coral-light)] px-8 text-base font-semibold text-white shadow-[var(--shadow-glow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-16px_rgba(232,99,74,0.45)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--coral)]"
              >
                Get started
                <span className="grid size-8 place-items-center rounded-full bg-white/15 transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight className="size-4" />
                </span>
              </Link>
            </div>
          </div>

          {/* Visual side — gradient panel */}
          <div className="animate-slide-in-right delay-300 relative hidden lg:block">
            <div className="animate-float gradient-panel aspect-[3/4] max-h-[580px] w-full max-w-[480px] ml-auto">
              <Image
                src="/warm-gradient.jpg"
                alt=""
                width={960}
                height={1280}
                className="rounded-[var(--radius-2xl)]"
                priority
              />
              <div className="gradient-panel-overlay rounded-[var(--radius-2xl)]" />

              {/* Floating glass card */}
              <div className="glass-card absolute -bottom-6 -left-8 px-6 py-5 animate-fade-in-up delay-500">
                <p className="text-sm font-semibold text-[var(--ink)]">Incident dispatch</p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Real-time coordination for your team
                </p>
              </div>
            </div>
          </div>

          {/* Mobile visual */}
          <div className="animate-scale-in delay-200 lg:hidden">
            <div className="gradient-panel aspect-[16/9] w-full overflow-hidden">
              <Image
                src="/warm-gradient.jpg"
                alt=""
                width={960}
                height={540}
                className="rounded-[var(--radius-xl)]"
                priority
              />
              <div className="gradient-panel-overlay rounded-[var(--radius-xl)]" />
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="animate-fade-in delay-500 flex items-center justify-between border-t border-[var(--ink)]/6 py-6 text-xs text-[var(--ink-muted)]">
          <span className="font-medium">MiniCAD Dispatch System</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </footer>
      </div>
    </main>
  );
}

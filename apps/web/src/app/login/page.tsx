import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Secure dispatcher access to the MiniCAD incident console.",
};

type LoginPageProps = {
  searchParams: Promise<{ notice?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { notice } = await searchParams;

  return (
    <main className="min-h-svh bg-[var(--cream)]">
      <div className="grid min-h-svh lg:grid-cols-[1.1fr_0.9fr]">
        {/* ── Left decorative panel ── */}
        <section className="login-left-panel relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
          {/* Background image */}
          <div className="login-image-wrapper">
            <Image
              src="/warm-gradient.jpg"
              alt=""
              fill
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="login-image-overlay" />
          </div>

          {/* Warm orbs */}
          <div className="warm-orb warm-orb-one" aria-hidden="true" />
          <div className="warm-orb warm-orb-two" aria-hidden="true" />

          {/* Top bar */}
          <div className="animate-fade-in relative z-10 flex items-center justify-between">
            <BrandMark inverse />
            <Link
              href="/"
              className="group inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 text-xs font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--coral)]"
            >
              <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Back home
            </Link>
          </div>

          {/* Center content */}
          <div className="animate-fade-in-up delay-200 relative z-10 max-w-md">
            <h1 className="font-serif text-[clamp(3rem,5vw,5rem)] leading-[0.95] font-normal text-white tracking-[-0.03em]">
              Sign in.
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/55">
              Access your dispatch console and coordinate incident responses in
              real time.
            </p>
          </div>

          {/* Bottom spacer */}
          <div className="relative z-10" />
        </section>

        {/* ── Right form panel ── */}
        <section className="relative flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          {/* Mobile top bar */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 sm:p-8 lg:hidden">
            <BrandMark compact />
            <Link
              href="/"
              className="group inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ink)]/8 bg-white/70 px-4 text-xs font-medium text-[var(--ink-muted)] backdrop-blur transition-all duration-300 hover:bg-white hover:text-[var(--ink)]"
            >
              <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              Back
            </Link>
          </div>

          <div className="w-full max-w-[440px]">
            {/* Form card */}
            <div className="login-form-card animate-scale-in delay-100 p-8 sm:p-10">
              {/* Heading */}
              <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-[-0.03em] text-[var(--ink)] sm:text-4xl">
                  Welcome back<span className="hero-gradient-text">.</span>
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">
                  Enter your credentials to open the dispatch console.
                </p>
              </div>

              <LoginForm />

              {notice === "dispatcher-only" ? (
                <p
                  role="status"
                  className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800"
                >
                  This website is reserved for dispatcher accounts.
                </p>
              ) : null}
            </div>

            {/* Bottom note */}
            <p className="animate-fade-in delay-500 mt-6 text-center text-xs text-[var(--ink-muted)]">
              Secure, encrypted connection
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

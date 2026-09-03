import type { Metadata } from "next";
import { ClipboardPlus, DatabaseZap, ShieldCheck } from "lucide-react";

import { IncidentForm } from "@/app/dashboard/incidents/new/incident-form";

export const metadata: Metadata = {
  title: "Log incident",
  description: "Create a secure incident record in the MiniCAD dispatcher workspace.",
};

export default function NewIncidentPage() {
  return (
    <div className="mx-auto w-full max-w-[1440px] p-5 sm:p-8 lg:p-10">
      <div className="mb-6 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--coral)]/18 bg-[var(--coral)]/7 px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-[var(--coral)] uppercase">
          <ClipboardPlus className="size-3.5" strokeWidth={1.9} />
          New incident
        </span>
        <h1 className="mt-4 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Log the caller&apos;s report</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)] sm:text-base">
          Capture the essential details first. The incident enters the live queue as New and can be dispatched in the next workflow stage.
        </p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)] sm:p-7 lg:p-8">
          <IncidentForm />
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <section className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--ink)] p-5 text-white shadow-[var(--shadow-soft)] sm:p-6">
            <p className="text-xs font-bold tracking-[0.12em] text-white/45 uppercase">On submission</p>
            <ol className="mt-5 space-y-5">
              <li className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-xs font-bold text-[var(--coral-light)]">01</span>
                <div>
                  <p className="text-sm font-semibold">Stored securely</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">Supabase creates the reference, owner, and timestamps.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-xs font-bold text-[var(--coral-light)]">02</span>
                <div>
                  <p className="text-sm font-semibold">Added as New</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">Status cannot be changed by this form submission.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/8 text-xs font-bold text-[var(--coral-light)]">03</span>
                <div>
                  <p className="text-sm font-semibold">Published live</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">Authorized dispatcher queues receive the new snapshot.</p>
                </div>
              </li>
            </ol>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-emerald-600/15 bg-emerald-50 p-5 text-emerald-950 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-emerald-700">
                <ShieldCheck className="size-4" strokeWidth={1.9} />
              </span>
              <div>
                <p className="text-sm font-semibold">Dispatcher protected</p>
                <p className="mt-1 text-xs leading-5 text-emerald-800/75">The Server Action and Postgres RLS independently verify your role.</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 border-t border-emerald-900/8 pt-4 text-xs font-semibold text-emerald-800">
              <DatabaseZap className="size-4" strokeWidth={1.9} />
              Database constraints enabled
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

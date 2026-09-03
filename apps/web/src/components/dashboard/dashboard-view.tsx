import Link from "next/link";
import { ArrowRight, CircleCheck, RadioTower, ShieldCheck } from "lucide-react";

import { IncidentQueue } from "@/components/dashboard/incident-queue";
import {
  OfficerAvailability,
  type OfficerAvailabilityItem,
} from "@/components/dashboard/officer-availability";
import { formatIncidentNumber, type IncidentQueueItem } from "@/lib/incidents";

type DashboardViewProps = {
  createdIncidentNumber: number | null;
  dataError: boolean;
  incidents: IncidentQueueItem[];
  officerDataError: boolean;
  officers: OfficerAvailabilityItem[];
};

/** Presents the dispatcher snapshot while Supabase remains the source of truth. */
export function DashboardView({
  createdIncidentNumber,
  dataError,
  incidents,
  officerDataError,
  officers,
}: DashboardViewProps) {
  return (
    <div className="mx-auto w-full max-w-[1440px] p-5 sm:p-8 lg:p-10">
      {createdIncidentNumber ? (
        <div role="status" className="mb-5 flex items-start gap-3 rounded-[var(--radius-lg)] border border-emerald-600/15 bg-emerald-50 px-4 py-3 text-emerald-950">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-700" strokeWidth={1.9} />
          <div>
            <p className="text-sm font-semibold">Incident {formatIncidentNumber(createdIncidentNumber)} logged</p>
            <p className="mt-0.5 text-xs leading-5 text-emerald-800/75">The record is secure and is now part of the live dispatcher snapshot.</p>
          </div>
        </div>
      ) : null}

      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--ink)] px-6 py-8 text-white shadow-[var(--shadow-soft)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-[var(--coral)]/18 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[var(--coral-light)] uppercase">
              <ShieldCheck className="size-4" strokeWidth={1.9} />
              Dispatcher operations
            </span>
            <h1 className="mt-4 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Incidents, as they happen.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/55 sm:text-base">
              Log caller reports into a protected Supabase record and watch the authorized queue update without refreshing the page.
            </p>
          </div>
          <Link
            href="/dashboard/incidents/new"
            className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[var(--coral)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--coral-light)]"
          >
            Log a new incident
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.9} />
          </Link>
        </div>
      </section>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.6fr)]">
        <IncidentQueue dataError={dataError} initialIncidents={incidents} />
        <OfficerAvailability dataError={officerDataError} initialOfficers={officers} />
      </div>

      <section className="mt-5 rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="font-serif text-xl">System connections</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <CircleCheck className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-semibold">Supabase Auth + RLS</p>
              <p className="mt-1 text-xs font-medium text-emerald-700">Protected</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">Verified dispatcher claims and database policies protect incident access.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:border-l sm:border-[var(--ink)]/8 sm:pl-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
              <RadioTower className="size-5" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-semibold">Incident Realtime</p>
              <p className="mt-1 text-xs font-medium text-emerald-700">Connected</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">Authorized inserts and future status changes stream into the queue.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

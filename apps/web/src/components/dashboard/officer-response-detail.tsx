"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Check, Clock3, FileCheck2, MapPin, RadioTower, ShieldCheck, Siren, UserRound } from "lucide-react";

import { formatIncidentNumber, INCIDENT_PRIORITY_LABELS, INCIDENT_STATUS_LABELS } from "@/lib/incidents";
import { createClient } from "@/lib/supabase/client";
import type { IncidentPriority, IncidentReportRow, IncidentRow, OfficerDutyRow, ProfileRow } from "@/types/database";

export type OfficerResponseSnapshot = {
  duty: Pick<OfficerDutyRow, "changed_at" | "is_on_duty" | "officer_id"> | null;
  incident: IncidentRow | null;
  officer: Pick<ProfileRow, "badge_number" | "display_name" | "id">;
  report: IncidentReportRow | null;
};

type OfficerResponseDetailProps = {
  dataError: boolean;
  initialSnapshot: OfficerResponseSnapshot;
};

const priorityClasses: Record<IncidentPriority, string> = {
  low: "bg-sky-50 text-sky-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
  critical: "bg-red-100 text-red-900",
};

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

const pipeline = [
  { key: "claimed", label: "Claimed", timeKey: "claimed_at" },
  { key: "en_route", label: "En route", timeKey: "en_route_at" },
  { key: "on_scene", label: "On scene", timeKey: "on_scene_at" },
  { key: "resolved", label: "Resolved · report filed", timeKey: "resolved_at" },
] as const;

const statusIndex = { new: -1, dispatched: -1, claimed: 0, en_route: 1, on_scene: 2, resolved: 3 } as const;

export function OfficerResponseDetail({ dataError, initialSnapshot }: OfficerResponseDetailProps) {
  const officerId = initialSnapshot.officer.id;
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const [hasDataError, setHasDataError] = useState(dataError);
  const [snapshot, setSnapshot] = useState(initialSnapshot);

  const reconcileSnapshot = useCallback(async () => {
    const supabase = createClient();
    const [profileResult, dutyResult, incidentResult] = await Promise.all([
      supabase.from("profiles").select("id, display_name, badge_number").eq("id", officerId).single(),
      supabase.from("officer_duty").select("officer_id, is_on_duty, changed_at").eq("officer_id", officerId).maybeSingle(),
      supabase.from("incidents").select("*").eq("claimed_by", officerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    if (profileResult.error || dutyResult.error || incidentResult.error) {
      setHasDataError(true);
      return;
    }

    let report: IncidentReportRow | null = null;
    if (incidentResult.data) {
      const reportResult = await supabase.from("incident_reports").select("*").eq("incident_id", incidentResult.data.id).maybeSingle();
      if (reportResult.error) {
        setHasDataError(true);
        return;
      }
      report = reportResult.data;
    }

    setSnapshot({ duty: dutyResult.data, incident: incidentResult.data, officer: profileResult.data, report });
    setHasDataError(false);
  }, [officerId]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    const channels: Array<ReturnType<typeof supabase.channel>> = [];
    const joined = new Set<string>();

    function track(topic: string, status: string) {
      if (status === "SUBSCRIBED") {
        joined.add(topic);
        if (joined.size === 3) setConnection("live");
        void reconcileSnapshot();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        joined.delete(topic);
        setConnection("offline");
      }
    }

    void supabase.realtime.setAuth().then(() => {
      if (!isMounted) return;
      channels.push(
        supabase.channel("minicad:officer-duty", { config: { private: true } })
          .on("broadcast", { event: "officer-duty-changed" }, () => void reconcileSnapshot())
          .subscribe((status) => track("duty", status)),
        supabase.channel("minicad:incidents", { config: { private: true } })
          .on("broadcast", { event: "incident-changed" }, () => void reconcileSnapshot())
          .subscribe((status) => track("incidents", status)),
        supabase.channel("minicad:reports", { config: { private: true } })
          .on("broadcast", { event: "report-filed" }, () => void reconcileSnapshot())
          .subscribe((status) => track("reports", status)),
      );
    }).catch(() => setConnection("offline"));

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void reconcileSnapshot();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      channels.forEach((channel) => void supabase.removeChannel(channel));
    };
  }, [reconcileSnapshot]);

  const incident = snapshot.incident;
  const activeIndex = incident ? statusIndex[incident.status] : -1;
  const initials = useMemo(() => snapshot.officer.display_name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [snapshot.officer.display_name]);

  return (
    <div className="mx-auto w-full max-w-[1200px] p-5 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/officers" className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--ink)]/8 bg-white px-4 text-xs font-bold text-[var(--ink-muted)] hover:text-[var(--ink)]"><ArrowLeft className="size-3.5" />Back to officers</Link>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${connection === "live" ? "border-emerald-600/15 bg-emerald-50 text-emerald-700" : "border-amber-600/15 bg-amber-50 text-amber-700"}`}><RadioTower className="size-3.5" />{connection === "live" ? "Live response" : connection === "offline" ? "Reconnecting" : "Connecting"}</span>
      </div>

      <section className="relative mt-5 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ink)] p-6 text-white shadow-[var(--shadow-soft)] sm:p-8">
        <div className="pointer-events-none absolute -top-20 right-0 size-64 rounded-full bg-[var(--coral)]/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[var(--coral)] text-lg font-bold">{initials}</span>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold tracking-[0.12em] text-[var(--coral-light)] uppercase">Officer response</p><h1 className="mt-2 truncate font-serif text-3xl sm:text-4xl">{snapshot.officer.display_name}</h1><p className="mt-2 flex items-center gap-2 text-xs text-white/58"><BadgeCheck className="size-3.5" />{snapshot.officer.badge_number ? `Badge ${snapshot.officer.badge_number}` : "Badge not recorded"}</p></div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${incident && incident.status !== "resolved" ? "bg-[var(--coral)]/18 text-[var(--coral-light)]" : snapshot.duty?.is_on_duty ? "bg-emerald-400/12 text-emerald-200" : "bg-white/8 text-white/65"}`}>{incident && incident.status !== "resolved" ? <Siren className="size-3.5" /> : <ShieldCheck className="size-3.5" />}{incident && incident.status !== "resolved" ? "Responding · availability locked" : snapshot.duty?.is_on_duty ? "Available" : "Off duty"}</span>
        </div>
      </section>

      {hasDataError ? <div role="alert" className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">The live response could not load completely. Confirm the response migration is applied.</div> : null}

      {!incident ? (
        <section className="mt-5 grid min-h-72 place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--ink)]/12 bg-white/45 px-6 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-[var(--ink-muted)]"><UserRound className="size-5" /></span><p className="mt-4 text-sm font-semibold">No response assigned</p><p className="mt-1 text-xs text-[var(--ink-muted)]">A claimed incident will open a live response record here.</p></div></section>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.75fr)]">
          <section className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold tracking-[0.08em] text-[var(--coral)]">{formatIncidentNumber(incident.incident_number)}</span><span className="rounded-full bg-white px-2.5 py-1 text-[0.6875rem] font-bold text-[var(--ink-soft)]">{INCIDENT_STATUS_LABELS[incident.status]}</span><span className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${priorityClasses[incident.priority]}`}>{INCIDENT_PRIORITY_LABELS[incident.priority]}</span></div>
            <h2 className="mt-4 font-serif text-3xl">{incident.incident_type}</h2>
            <p className="mt-3 flex items-start gap-2 text-sm text-[var(--ink-muted)]"><MapPin className="mt-0.5 size-4 shrink-0 text-[var(--coral)]" />{incident.location}</p>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">{incident.description}</p>
            <div className="mt-5 border-t border-[var(--ink)]/8 pt-5"><p className="text-xs font-bold tracking-[0.08em] text-[var(--ink-muted)] uppercase">Caller</p><p className="mt-2 text-sm font-semibold">{incident.caller_name}</p><p className="mt-1 text-xs text-[var(--ink-muted)]">{incident.caller_phone}</p></div>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <p className="text-xs font-bold tracking-[0.1em] text-[var(--coral)] uppercase">Live pipeline</p><h2 className="mt-2 font-serif text-2xl">Response status</h2>
            <ol className="mt-6">
              {pipeline.map((step, index) => {
                const reached = activeIndex >= index;
                const current = activeIndex === index;
                const timestamp = incident[step.timeKey];
                return <li key={step.key} className="flex min-h-17 gap-3"><div className="flex flex-col items-center"><span className={`grid size-8 place-items-center rounded-full border ${reached ? "border-[var(--coral)] bg-[var(--coral)] text-white" : "border-[var(--ink)]/12 bg-[var(--cream)] text-[var(--ink-muted)]"}`}>{reached ? <Check className="size-3.5" strokeWidth={2.5} /> : <span className="size-1.5 rounded-full bg-current" />}</span>{index < pipeline.length - 1 ? <span className={`w-px flex-1 ${activeIndex > index ? "bg-[var(--coral)]" : "bg-[var(--ink)]/10"}`} /> : null}</div><div className="min-w-0 flex-1 pt-1"><p className={`text-sm ${current ? "font-bold text-[var(--ink)]" : reached ? "font-semibold text-[var(--ink-soft)]" : "text-[var(--ink-muted)]"}`}>{step.label}</p><p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-[var(--ink-muted)]"><Clock3 className="size-3" />{timestamp ? dateFormatter.format(new Date(timestamp)) : "Pending"}</p></div></li>;
              })}
            </ol>
          </section>
        </div>
      )}

      {snapshot.report ? (
        <section className="mt-5 rounded-[var(--radius-xl)] border border-emerald-700/10 bg-emerald-50/55 p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-emerald-700 text-white"><FileCheck2 className="size-4.5" /></span><div><p className="text-xs font-bold tracking-[0.08em] text-emerald-700 uppercase">Report filed</p><time className="text-xs text-[var(--ink-muted)]" dateTime={snapshot.report.resolved_at}>{dateFormatter.format(new Date(snapshot.report.resolved_at))}</time></div></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl bg-white/80 p-4"><p className="text-xs font-bold tracking-[0.08em] text-[var(--ink-muted)] uppercase">Response details</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-soft)]">{snapshot.report.actions_taken}</p></div><div className="rounded-2xl bg-white/80 p-4"><p className="text-xs font-bold tracking-[0.08em] text-emerald-700 uppercase">Outcome</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-soft)]">{snapshot.report.outcome}</p></div></div>
        </section>
      ) : null}
    </div>
  );
}

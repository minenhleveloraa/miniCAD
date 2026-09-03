"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, BadgeCheck, CheckCircle2, Clock3, FileCheck2, MapPin, RadioTower } from "lucide-react";

import { formatIncidentNumber, INCIDENT_PRIORITY_LABELS } from "@/lib/incidents";
import { createClient } from "@/lib/supabase/client";
import type { IncidentPriority, IncidentReportRow } from "@/types/database";

export type ReportArchiveItem = {
  actionsTaken: string;
  createdAt: string;
  id: string;
  incidentId: string;
  incidentNumber: number;
  incidentType: string;
  location: string;
  officerBadge: string | null;
  officerName: string;
  outcome: string;
  priority: IncidentPriority;
  resolvedAt: string;
};

type ReportArchiveProps = {
  dataError: boolean;
  initialReports: ReportArchiveItem[];
};

type IncidentSnapshot = {
  id: string;
  incident_number: number;
  incident_type: string;
  location: string;
  priority: IncidentPriority;
};

type ProfileSnapshot = { badge_number: string | null; display_name: string; id: string };

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

export function buildReportArchive(
  reports: IncidentReportRow[],
  incidents: IncidentSnapshot[],
  profiles: ProfileSnapshot[],
) {
  const incidentById = new Map(incidents.map((incident) => [incident.id, incident]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  return reports.flatMap<ReportArchiveItem>((report) => {
    const incident = incidentById.get(report.incident_id);
    const officer = profileById.get(report.officer_id);
    if (!incident) return [];

    return [{
      actionsTaken: report.actions_taken,
      createdAt: report.created_at,
      id: report.id,
      incidentId: report.incident_id,
      incidentNumber: incident.incident_number,
      incidentType: incident.incident_type,
      location: incident.location,
      officerBadge: officer?.badge_number ?? null,
      officerName: officer?.display_name ?? "Officer",
      outcome: report.outcome,
      priority: incident.priority,
      resolvedAt: report.resolved_at,
    }];
  });
}

export function ReportsArchive({ dataError, initialReports }: ReportArchiveProps) {
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const [hasDataError, setHasDataError] = useState(dataError);
  const [reports, setReports] = useState(initialReports);

  const reconcileReports = useCallback(async () => {
    const supabase = createClient();
    const [reportResult, incidentResult, profileResult] = await Promise.all([
      supabase.from("incident_reports").select("*").order("resolved_at", { ascending: false }).limit(100),
      supabase.from("incidents").select("id, incident_number, incident_type, location, priority").eq("status", "resolved").order("resolved_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, display_name, badge_number").eq("role", "officer"),
    ]);

    if (reportResult.error || incidentResult.error || profileResult.error) {
      setHasDataError(true);
      return;
    }

    setReports(buildReportArchive(reportResult.data, incidentResult.data, profileResult.data));
    setHasDataError(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let reportChannel: ReturnType<typeof supabase.channel> | null = null;
    let incidentChannel: ReturnType<typeof supabase.channel> | null = null;
    const joined = new Set<string>();

    function track(topic: string, status: string) {
      if (status === "SUBSCRIBED") {
        joined.add(topic);
        if (joined.size === 2) setConnection("live");
        void reconcileReports();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        joined.delete(topic);
        setConnection("offline");
      }
    }

    void supabase.realtime.setAuth().then(() => {
      if (!isMounted) return;
      reportChannel = supabase.channel("minicad:reports", { config: { private: true } })
        .on("broadcast", { event: "report-filed" }, () => void reconcileReports())
        .subscribe((status) => track("reports", status));
      incidentChannel = supabase.channel("minicad:incidents", { config: { private: true } })
        .on("broadcast", { event: "incident-changed" }, () => void reconcileReports())
        .subscribe((status) => track("incidents", status));
    }).catch(() => setConnection("offline"));

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void reconcileReports();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reportChannel) void supabase.removeChannel(reportChannel);
      if (incidentChannel) void supabase.removeChannel(incidentChannel);
    };
  }, [reconcileReports]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return reports.filter((report) => new Date(report.resolvedAt).toDateString() === today).length;
  }, [reports]);

  return (
    <div className="mx-auto w-full max-w-[1440px] p-5 sm:p-8 lg:p-10">
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ink)] px-6 py-8 text-white shadow-[var(--shadow-soft)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-28 right-0 size-80 rounded-full bg-[var(--coral)]/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[var(--coral-light)] uppercase"><Archive className="size-4" />Incident archive</span>
            <h1 className="mt-4 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Filed reports, ready for review.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/58 sm:text-base">A resolved response moves here automatically with the officer&apos;s details, outcome, and authoritative database timestamp.</p>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${connection === "live" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-white/12 bg-white/7 text-white/65"}`}>
            <RadioTower className="size-3.5" />{connection === "live" ? "Live archive" : connection === "offline" ? "Reconnecting" : "Connecting"}
          </span>
        </div>
      </section>

      <section aria-label="Report totals" className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700"><FileCheck2 className="size-4.5" /></span><strong className="font-serif text-3xl font-normal">{reports.length}</strong></div><p className="mt-4 text-xs font-bold tracking-[0.08em] text-[var(--ink-muted)] uppercase">Filed reports</p></div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)]"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-full bg-[var(--coral)]/9 text-[var(--coral)]"><Clock3 className="size-4.5" /></span><strong className="font-serif text-3xl font-normal">{todayCount}</strong></div><p className="mt-4 text-xs font-bold tracking-[0.08em] text-[var(--ink-muted)] uppercase">Resolved today</p></div>
      </section>

      {hasDataError ? <div role="alert" className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">The report archive could not load. Confirm the latest Supabase migration is applied.</div> : null}

      <section className="mt-5 space-y-4">
        {reports.length === 0 && !hasDataError ? (
          <div className="grid min-h-72 place-items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--ink)]/12 bg-white/45 px-6 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-[var(--ink-muted)]"><Archive className="size-5" /></span><p className="mt-4 text-sm font-semibold">No reports filed yet</p><p className="mt-1 text-xs text-[var(--ink-muted)]">Completed officer responses will appear here automatically.</p></div></div>
        ) : reports.map((report) => (
          <article key={report.id} className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <div className="flex flex-col gap-4 border-b border-[var(--ink)]/8 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold tracking-[0.08em] text-[var(--coral)]">{formatIncidentNumber(report.incidentNumber)}</span><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[0.6875rem] font-bold text-emerald-700"><CheckCircle2 className="size-3" />Report filed</span><span className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${priorityClasses[report.priority]}`}>{INCIDENT_PRIORITY_LABELS[report.priority]}</span></div><h2 className="mt-3 font-serif text-2xl">{report.incidentType}</h2><p className="mt-2 flex items-center gap-2 text-xs text-[var(--ink-muted)]"><MapPin className="size-3.5 text-[var(--coral)]" />{report.location}</p></div>
              <div className="rounded-2xl bg-white px-4 py-3 text-xs"><p className="font-bold text-[var(--ink)]">{report.officerName}</p><p className="mt-1 flex items-center gap-1.5 text-[var(--ink-muted)]"><BadgeCheck className="size-3" />{report.officerBadge ? `Badge ${report.officerBadge}` : "Officer badge not recorded"}</p><time className="mt-2 block text-[var(--ink-muted)]" dateTime={report.resolvedAt}>Resolved {dateFormatter.format(new Date(report.resolvedAt))}</time></div>
            </div>
            <div className="grid gap-4 pt-5 lg:grid-cols-2"><div className="rounded-2xl bg-white/75 p-4"><p className="text-xs font-bold tracking-[0.08em] text-[var(--ink-muted)] uppercase">Response details</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-soft)]">{report.actionsTaken}</p></div><div className="rounded-2xl bg-emerald-50/65 p-4"><p className="text-xs font-bold tracking-[0.08em] text-emerald-700 uppercase">Outcome</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink-soft)]">{report.outcome}</p></div></div>
          </article>
        ))}
      </section>
    </div>
  );
}

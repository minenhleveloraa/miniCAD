"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  MapPin,
  RadioTower,
  ShieldCheck,
  Siren,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { formatIncidentNumber, INCIDENT_PRIORITY_LABELS } from "@/lib/incidents";
import { createClient } from "@/lib/supabase/client";
import type { IncidentPriority, IncidentStatus, OfficerDutyRow } from "@/types/database";

export type OfficerAssignment = {
  claimedAt: string;
  id: string;
  incidentNumber: number;
  incidentType: string;
  location: string;
  priority: IncidentPriority;
  status: IncidentStatus;
};

export type OfficerRosterItem = {
  activeIncident: OfficerAssignment | null;
  badgeNumber: string | null;
  changedAt: string;
  displayName: string;
  id: string;
  isOnDuty: boolean;
};

type OfficerRosterProps = {
  dataError: boolean;
  initialOfficers: OfficerRosterItem[];
};

type RosterFilter = "all" | "available" | "responding";
type ConnectionState = "connecting" | "live" | "offline";

type ProfileSnapshot = { badge_number: string | null; display_name: string; id: string };
type DutySnapshot = Pick<OfficerDutyRow, "changed_at" | "is_on_duty" | "officer_id">;
type AssignmentSnapshot = {
  claimed_at: string | null;
  claimed_by: string | null;
  id: string;
  incident_number: number;
  incident_type: string;
  location: string;
  priority: IncidentPriority;
  status: IncidentStatus;
};

const timeFormatter = new Intl.DateTimeFormat("en-ZA", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Johannesburg",
});

const priorityClasses: Record<IncidentPriority, string> = {
  low: "bg-sky-50 text-sky-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
  critical: "bg-red-100 text-red-900",
};

function buildRoster(
  profiles: ProfileSnapshot[],
  duties: DutySnapshot[],
  assignments: AssignmentSnapshot[],
): OfficerRosterItem[] {
  const dutyByOfficer = new Map(duties.map((duty) => [duty.officer_id, duty]));
  const assignmentByOfficer = new Map<string, OfficerAssignment>();

  for (const incident of assignments) {
    if (!incident.claimed_by || !incident.claimed_at || assignmentByOfficer.has(incident.claimed_by)) continue;

    assignmentByOfficer.set(incident.claimed_by, {
      claimedAt: incident.claimed_at,
      id: incident.id,
      incidentNumber: incident.incident_number,
      incidentType: incident.incident_type,
      location: incident.location,
      priority: incident.priority,
      status: incident.status,
    });
  }

  return profiles.map((profile) => {
    const duty = dutyByOfficer.get(profile.id);

    return {
      activeIncident: assignmentByOfficer.get(profile.id) ?? null,
      badgeNumber: profile.badge_number,
      changedAt: duty?.changed_at ?? new Date(0).toISOString(),
      displayName: profile.display_name,
      id: profile.id,
      isOnDuty: duty?.is_on_duty ?? false,
    };
  });
}

export function OfficerRoster({ dataError, initialOfficers }: OfficerRosterProps) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [filter, setFilter] = useState<RosterFilter>("all");
  const [hasDataError, setHasDataError] = useState(dataError);
  const [officers, setOfficers] = useState(initialOfficers);

  const reconcileRoster = useCallback(async () => {
    const supabase = createClient();
    const [profileResult, dutyResult, incidentResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, badge_number")
        .eq("role", "officer")
        .order("display_name", { ascending: true }),
      supabase.from("officer_duty").select("officer_id, is_on_duty, changed_at"),
      supabase
        .from("incidents")
        .select("id, incident_number, incident_type, location, priority, status, claimed_by, claimed_at")
        .in("status", ["claimed", "en_route", "on_scene"])
        .order("claimed_at", { ascending: false }),
    ]);

    if (profileResult.error || dutyResult.error || incidentResult.error) {
      setHasDataError(true);
      return;
    }

    setOfficers(buildRoster(profileResult.data, dutyResult.data, incidentResult.data));
    setHasDataError(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let dutyChannel: ReturnType<typeof supabase.channel> | null = null;
    let incidentChannel: ReturnType<typeof supabase.channel> | null = null;
    const joinedTopics = new Set<string>();

    function trackChannel(topic: string, status: string) {
      if (status === "SUBSCRIBED") {
        joinedTopics.add(topic);
        if (joinedTopics.size === 2) setConnection("live");
        void reconcileRoster();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        joinedTopics.delete(topic);
        setConnection("offline");
      }
    }

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!isMounted) return;

        dutyChannel = supabase
          .channel("minicad:officer-duty", { config: { private: true } })
          .on("broadcast", { event: "officer-duty-changed" }, (message) => {
            const duty = message.payload as Partial<OfficerDutyRow>;
            if (
              typeof duty.officer_id === "string" &&
              typeof duty.is_on_duty === "boolean" &&
              typeof duty.changed_at === "string"
            ) {
              setOfficers((current) =>
                current.map((officer) =>
                  officer.id === duty.officer_id
                    ? { ...officer, changedAt: duty.changed_at as string, isOnDuty: duty.is_on_duty as boolean }
                    : officer,
                ),
              );
            }
            void reconcileRoster();
          })
          .subscribe((status) => trackChannel("duty", status));

        incidentChannel = supabase
          .channel("minicad:incidents", { config: { private: true } })
          .on("broadcast", { event: "incident-changed" }, () => {
            void reconcileRoster();
          })
          .subscribe((status) => trackChannel("incidents", status));
      })
      .catch(() => {
        if (isMounted) setConnection("offline");
      });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void reconcileRoster();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (dutyChannel) void supabase.removeChannel(dutyChannel);
      if (incidentChannel) void supabase.removeChannel(incidentChannel);
    };
  }, [reconcileRoster]);

  const counts = useMemo(() => {
    let available = 0;
    let responding = 0;

    for (const officer of officers) {
      if (officer.activeIncident) responding += 1;
      else if (officer.isOnDuty) available += 1;
    }

    return { available, offDuty: officers.length - available - responding, responding, total: officers.length };
  }, [officers]);

  const visibleOfficers = useMemo(
    () =>
      officers.filter((officer) => {
        if (filter === "available") return officer.isOnDuty && !officer.activeIncident;
        if (filter === "responding") return Boolean(officer.activeIncident);
        return true;
      }),
    [filter, officers],
  );

  const connectionLabel = connection === "live" ? "Live roster" : connection === "offline" ? "Reconnecting" : "Connecting";

  return (
    <div className="mx-auto w-full max-w-[1440px] p-5 sm:p-8 lg:p-10">
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--ink)] px-6 py-8 text-white shadow-[var(--shadow-soft)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -top-28 right-0 size-80 rounded-full bg-[var(--coral)]/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-[var(--coral-light)] uppercase">
              <UsersRound className="size-4" strokeWidth={1.9} />
              Unit command
            </span>
            <h1 className="mt-4 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Officers, live and accountable.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/58 sm:text-base">
              Availability comes from each officer&apos;s mobile control. Claims appear against that officer as soon as Supabase accepts them.
            </p>
          </div>
          <span
            aria-live="polite"
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${
              connection === "live"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                : "border-white/12 bg-white/7 text-white/65"
            }`}
          >
            <RadioTower className="size-3.5" strokeWidth={2} />
            {connectionLabel}
          </span>
        </div>
      </section>

      <section aria-label="Officer totals" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: UsersRound, label: "Provisioned", tone: "text-[var(--ink)]", value: counts.total },
          { icon: UserRoundCheck, label: "Available", tone: "text-emerald-700", value: counts.available },
          { icon: Siren, label: "Responding", tone: "text-[var(--coral)]", value: counts.responding },
          { icon: ShieldCheck, label: "Off duty", tone: "text-[var(--ink-muted)]", value: counts.offDuty },
        ].map(({ icon: Icon, label, tone, value }) => (
          <div key={label} className="rounded-[var(--radius-lg)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-4">
              <span className={`grid size-10 place-items-center rounded-full bg-white ${tone}`}>
                <Icon className="size-4.5" strokeWidth={1.9} />
              </span>
              <strong className="font-serif text-3xl font-normal text-[var(--ink)]">{value}</strong>
            </div>
            <p className="mt-4 text-xs font-bold tracking-[0.08em] text-[var(--ink-muted)] uppercase">{label}</p>
          </div>
        ))}
      </section>

      <section className="mt-5 rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-[var(--ink)]">Officer roster</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">Use the view control to focus the active dispatch pool.</p>
          </div>
          <div aria-label="Roster view" className="inline-flex w-fit rounded-2xl border border-[var(--ink)]/8 bg-white p-1">
            {(["all", "available", "responding"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={filter === option}
                onClick={() => setFilter(option)}
                className={`h-9 rounded-xl px-3 text-xs font-bold capitalize transition-colors ${
                  filter === option ? "bg-[var(--ink)] text-white" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {hasDataError ? (
          <div role="alert" className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            The live roster could not load. Confirm that the officer and incident migrations are applied.
          </div>
        ) : visibleOfficers.length === 0 ? (
          <div className="mt-5 grid min-h-64 place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--ink)]/12 bg-white/45 px-6 py-12 text-center">
            <div>
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-[var(--ink-muted)]">
                <UsersRound className="size-5" strokeWidth={1.8} />
              </span>
              <p className="mt-4 text-sm font-semibold text-[var(--ink-soft)]">No officers in this view</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">The list changes as officers update availability or claim work.</p>
            </div>
          </div>
        ) : (
          <ul className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {visibleOfficers.map((officer) => {
              const initials = officer.displayName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const status = officer.activeIncident ? "Responding" : officer.isOnDuty ? "Available" : "Off duty";
              const statusClass = officer.activeIncident
                ? "bg-[var(--coral)]/10 text-[var(--coral)]"
                : officer.isOnDuty
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-[var(--ink)]/5 text-[var(--ink-muted)]";

              return (
                <li key={officer.id} className="rounded-[var(--radius-lg)] border border-[var(--ink)]/8 bg-white/75 p-4">
                  <div className="flex items-start gap-3">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-full text-xs font-bold ${officer.isOnDuty || officer.activeIncident ? "bg-[var(--ink)] text-white" : "bg-[var(--ink)]/6 text-[var(--ink-muted)]"}`}>
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--ink)]">{officer.displayName}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-[var(--ink-muted)]">
                        <BadgeCheck className="size-3" strokeWidth={2} />
                        {officer.badgeNumber ? `Badge ${officer.badgeNumber}` : "Badge not recorded"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${statusClass}`}>{status}</span>
                  </div>

                  {officer.activeIncident ? (
                    <div className="mt-4 rounded-2xl border border-[var(--coral)]/12 bg-[var(--coral)]/[0.055] p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold tracking-[0.07em] text-[var(--coral)]">
                          {formatIncidentNumber(officer.activeIncident.incidentNumber)}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[0.625rem] font-bold ${priorityClasses[officer.activeIncident.priority]}`}>
                          {INCIDENT_PRIORITY_LABELS[officer.activeIncident.priority]}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-[var(--ink)]">{officer.activeIncident.incidentType}</p>
                      <p className="mt-2 flex items-center gap-2 text-[0.6875rem] text-[var(--ink-muted)]">
                        <MapPin className="size-3 shrink-0 text-[var(--coral)]" strokeWidth={2} />
                        <span className="truncate">{officer.activeIncident.location}</span>
                      </p>
                      <Link
                        href={`/dashboard/officers/${officer.id}`}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--coral)] hover:underline"
                      >
                        Open live response
                        <ArrowUpRight className="size-3.5" strokeWidth={2} />
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[var(--ink)]/[0.035] px-3.5 py-3 text-xs text-[var(--ink-muted)]">
                      {officer.isOnDuty ? (
                        <UserRoundCheck className="size-4 text-emerald-700" strokeWidth={1.9} />
                      ) : (
                        <Clock3 className="size-4" strokeWidth={1.9} />
                      )}
                      {officer.isOnDuty
                        ? "Ready to claim a dispatched incident"
                        : `Duty changed ${timeFormatter.format(new Date(officer.changedAt))}`}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

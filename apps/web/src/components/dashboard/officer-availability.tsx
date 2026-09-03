"use client";

import { useEffect, useMemo, useState } from "react";
import { RadioTower, ShieldCheck, UserRoundCheck, UsersRound } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { OfficerDutyRow } from "@/types/database";

export type OfficerAvailabilityItem = {
  badgeNumber: string | null;
  changedAt: string;
  displayName: string;
  id: string;
  isOnDuty: boolean;
};

type OfficerAvailabilityProps = {
  dataError: boolean;
  initialOfficers: OfficerAvailabilityItem[];
};

type ConnectionState = "connecting" | "live" | "offline";

const timeFormatter = new Intl.DateTimeFormat("en-ZA", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Johannesburg",
});

/** Mirrors mobile duty changes on the dispatcher screen without a refresh. */
export function OfficerAvailability({ dataError, initialOfficers }: OfficerAvailabilityProps) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [hasDataError, setHasDataError] = useState(dataError);
  const [officers, setOfficers] = useState(initialOfficers);
  const availableCount = useMemo(() => officers.filter((officer) => officer.isOnDuty).length, [officers]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function reconcileOfficerSnapshot() {
      const [profileResult, dutyResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, badge_number")
          .eq("role", "officer")
          .order("display_name", { ascending: true }),
        supabase.from("officer_duty").select("officer_id, is_on_duty, changed_at"),
      ]);

      if (!isMounted) return;
      if (profileResult.error || dutyResult.error) {
        setHasDataError(true);
        setConnection("offline");
        return;
      }

      const dutyByOfficer = new Map((dutyResult.data ?? []).map((duty) => [duty.officer_id, duty]));
      setOfficers(
        (profileResult.data ?? []).map((profile) => {
          const duty = dutyByOfficer.get(profile.id);
          return {
            badgeNumber: profile.badge_number,
            changedAt: duty?.changed_at ?? new Date(0).toISOString(),
            displayName: profile.display_name,
            id: profile.id,
            isOnDuty: duty?.is_on_duty ?? false,
          };
        }),
      );
      setHasDataError(false);
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!isMounted) return;

        channel = supabase
          .channel("minicad:officer-duty", { config: { private: true } })
          .on("broadcast", { event: "officer-duty-changed" }, (message) => {
            const duty = message.payload as Partial<OfficerDutyRow>;
            if (
              typeof duty.officer_id !== "string" ||
              typeof duty.is_on_duty !== "boolean" ||
              typeof duty.changed_at !== "string"
            ) {
              return;
            }

            setOfficers((current) =>
              current.map((officer) =>
                officer.id === duty.officer_id
                  ? {
                      ...officer,
                      changedAt: duty.changed_at as string,
                      isOnDuty: duty.is_on_duty as boolean,
                    }
                  : officer,
              ),
            );

            // The broadcast updates the visible row immediately. The snapshot
            // also discovers newly provisioned officers and remains canonical.
            void reconcileOfficerSnapshot();
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setConnection("live");
              void reconcileOfficerSnapshot();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              setConnection("offline");
            }
          });
      })
      .catch(() => {
        if (isMounted) setConnection("offline");
      });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void reconcileOfficerSnapshot();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const connectionLabel = connection === "live" ? "Live" : connection === "offline" ? "Reconnecting" : "Connecting";

  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-[var(--ink)]">Officer availability</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
            {availableCount} of {officers.length} {officers.length === 1 ? "officer" : "officers"} on duty
          </p>
        </div>
        <span
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.08em] uppercase ${
            connection === "live"
              ? "border-emerald-600/15 bg-emerald-50 text-emerald-700"
              : "border-[var(--ink)]/10 bg-white text-[var(--ink-muted)]"
          }`}
        >
          <RadioTower className="size-3" strokeWidth={2} />
          {connectionLabel}
        </span>
      </div>

      {hasDataError ? (
        <div role="alert" className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-xs font-medium leading-5 text-amber-800">
          Officer duty data is unavailable. Apply the officer-duty migration in Supabase.
        </div>
      ) : officers.length === 0 ? (
        <div className="mt-5 grid min-h-52 place-items-center rounded-[var(--radius-lg)] border border-dashed border-[var(--ink)]/12 bg-white/45 px-6 py-10 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--ink)]/9 bg-white text-[var(--ink-muted)]">
              <UsersRound className="size-5" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-sm font-semibold text-[var(--ink-soft)]">No officers provisioned</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--ink-muted)]">
              Seed an Auth user with the officer role to add them to this live roster.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-5 space-y-2.5">
          {officers.map((officer) => {
            const initials = officer.displayName
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <li key={officer.id} className="flex items-center gap-3 rounded-2xl border border-[var(--ink)]/7 bg-white/70 p-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-bold ${officer.isOnDuty ? "bg-[var(--ink)] text-white" : "bg-[var(--ink)]/6 text-[var(--ink-muted)]"}`}>
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">{officer.displayName}</p>
                  <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--ink-muted)]">
                    {officer.badgeNumber ? `Badge ${officer.badgeNumber} · ` : ""}
                    Updated {timeFormatter.format(new Date(officer.changedAt))}
                  </p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${officer.isOnDuty ? "bg-emerald-50 text-emerald-700" : "bg-[var(--ink)]/5 text-[var(--ink-muted)]"}`}>
                  {officer.isOnDuty ? <UserRoundCheck className="size-3" strokeWidth={2} /> : <ShieldCheck className="size-3" strokeWidth={2} />}
                  {officer.isOnDuty ? "Available" : "Off duty"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

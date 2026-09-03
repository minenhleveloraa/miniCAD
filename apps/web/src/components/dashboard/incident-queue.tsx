"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Plus, RadioTower, Send, Siren } from "lucide-react";

import {
  formatIncidentNumber,
  INCIDENT_PRIORITY_LABELS,
  INCIDENT_STATUS_LABELS,
  type IncidentQueueItem,
} from "@/lib/incidents";
import { createClient } from "@/lib/supabase/client";
import type { IncidentRow } from "@/types/database";

type ConnectionState = "connecting" | "live" | "offline";

type IncidentQueueProps = {
  dataError: boolean;
  initialIncidents: IncidentQueueItem[];
};

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Johannesburg",
});

const priorityClasses = {
  low: "border-sky-600/15 bg-sky-50 text-sky-700",
  medium: "border-amber-600/15 bg-amber-50 text-amber-700",
  high: "border-red-600/15 bg-red-50 text-red-700",
  critical: "border-red-900/15 bg-red-100 text-red-900",
};

function toQueueItem(row: IncidentRow): IncidentQueueItem {
  return {
    caller_name: row.caller_name,
    caller_phone: row.caller_phone,
    claimed_at: row.claimed_at,
    claimed_by: row.claimed_by,
    created_at: row.created_at,
    description: row.description,
    dispatched_at: row.dispatched_at,
    id: row.id,
    incident_number: row.incident_number,
    incident_type: row.incident_type,
    location: row.location,
    priority: row.priority,
    status: row.status,
  };
}

export function IncidentQueue({ dataError, initialIncidents }: IncidentQueueProps) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [hasDataError, setHasDataError] = useState(dataError);
  const [incidents, setIncidents] = useState(initialIncidents);

  const reconcileIncidentSnapshot = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("incidents")
      .select(
        "id, incident_number, caller_name, caller_phone, location, incident_type, priority, description, status, claimed_by, claimed_at, dispatched_at, created_at",
      )
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setHasDataError(true);
      return;
    }

    setIncidents(data);
    setHasDataError(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.realtime
      .setAuth()
      .then(() => {
        if (!isMounted) return;

        channel = supabase
          .channel("minicad:incidents", { config: { private: true } })
          .on("broadcast", { event: "incident-changed" }, () => {
            void reconcileIncidentSnapshot();
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setConnection("live");
              void reconcileIncidentSnapshot();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              setConnection("offline");
            }
          });
      })
      .catch(() => {
        if (isMounted) setConnection("offline");
      });

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void reconcileIncidentSnapshot();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [reconcileIncidentSnapshot]);

  async function dispatchIncident(incidentId: string) {
    if (dispatchingId) return;

    const supabase = createClient();
    setDispatchingId(incidentId);
    setFeedback(null);
    const { data, error } = await supabase.rpc("dispatch_incident", { p_incident_id: incidentId });

    if (error) {
      if (error.message.includes("NO_AVAILABLE_OFFICERS")) {
        setFeedback({
          tone: "error",
          text: "No officers are available. Wait for an officer to go on duty before dispatching.",
        });
      } else if (error.message.includes("INCIDENT_NOT_DISPATCHABLE")) {
        setFeedback({ tone: "error", text: "This incident has already moved out of the New state." });
        await reconcileIncidentSnapshot();
      } else {
        setFeedback({
          tone: "error",
          text: "Dispatch failed. Confirm the latest Supabase migration is applied, then try again.",
        });
      }
    } else {
      const dispatched = toQueueItem(data);
      setIncidents((current) =>
        current.map((incident) => (incident.id === dispatched.id ? dispatched : incident)),
      );
      const { error: pushError } = await supabase.functions.invoke("send-dispatch-notification", {
        body: { incidentId: dispatched.id },
      });
      setFeedback({
        tone: "success",
        text: pushError
          ? `${formatIncidentNumber(dispatched.incident_number)} is live in every officer queue. Push delivery is not configured yet.`
          : `${formatIncidentNumber(dispatched.incident_number)} is live and push alerts were sent to available officers.`,
      });
    }

    setDispatchingId(null);
  }

  const connectionLabel = connection === "live" ? "Live" : connection === "offline" ? "Reconnecting" : "Connecting";

  return (
    <section className="rounded-[var(--radius-xl)] border border-[var(--ink)]/8 bg-[var(--cream-light)] shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 border-b border-[var(--ink)]/8 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif text-xl sm:text-2xl">Incident queue</h2>
            <span
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.08em] uppercase ${
                connection === "live"
                  ? "border-emerald-600/15 bg-emerald-50 text-emerald-700"
                  : connection === "offline"
                    ? "border-amber-600/15 bg-amber-50 text-amber-700"
                    : "border-[var(--ink)]/10 bg-white text-[var(--ink-muted)]"
              }`}
            >
              <span className={`size-1.5 rounded-full ${connection === "live" ? "bg-emerald-500" : "bg-current opacity-60"}`} />
              {connectionLabel}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
            {incidents.length} {incidents.length === 1 ? "incident" : "incidents"} in the current snapshot
          </p>
        </div>
        <Link
          href="/dashboard/incidents/new"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--coral)] px-4 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition hover:-translate-y-0.5 hover:bg-[var(--coral-light)]"
        >
          <Plus className="size-4" strokeWidth={2} />
          Log incident
        </Link>
      </div>

      {feedback ? (
        <div
          role="status"
          className={`m-5 rounded-2xl border px-4 py-3 text-sm font-medium sm:m-6 ${
            feedback.tone === "success"
              ? "border-emerald-600/15 bg-emerald-50 text-emerald-800"
              : "border-red-600/15 bg-red-50 text-red-800"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      {hasDataError ? (
        <div role="alert" className="m-5 rounded-2xl border border-amber-500/20 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 sm:m-6">
          The incident snapshot could not be loaded. Confirm that the Supabase migration is applied.
        </div>
      ) : incidents.length === 0 ? (
        <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--ink)]/9 bg-white text-[var(--ink-muted)]">
              <Siren className="size-5" strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-sm font-semibold text-[var(--ink-soft)]">No incidents logged</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-[var(--ink-muted)]">
              New caller reports will appear here immediately after they are saved.
            </p>
          </div>
        </div>
      ) : (
        <ol className="divide-y divide-[var(--ink)]/7">
          {incidents.map((incident) => (
            <li key={incident.id} className="p-5 transition-colors hover:bg-white/55 sm:p-6">
              <article className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(14rem,0.75fr)_minmax(10rem,auto)] xl:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tracking-[0.08em] text-[var(--coral)]">
                      {formatIncidentNumber(incident.incident_number)}
                    </span>
                    <span className="rounded-full border border-[var(--ink)]/9 bg-white px-2.5 py-1 text-[0.6875rem] font-bold text-[var(--ink-soft)]">
                      {INCIDENT_STATUS_LABELS[incident.status]}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[0.6875rem] font-bold ${priorityClasses[incident.priority]}`}>
                      {INCIDENT_PRIORITY_LABELS[incident.priority]}
                    </span>
                  </div>
                  <h3 className="mt-3 truncate text-base font-bold tracking-[-0.01em] text-[var(--ink)]">
                    {incident.incident_type}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--ink-muted)]">
                    {incident.description}
                  </p>
                </div>

                <div className="space-y-2 text-xs text-[var(--ink-muted)]">
                  <p className="flex items-center gap-2">
                    <MapPin className="size-3.5 shrink-0 text-[var(--coral)]" strokeWidth={1.9} />
                    <span className="truncate" title={incident.location}>{incident.location}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-[var(--coral)]" strokeWidth={1.9} />
                    <span className="truncate">{incident.caller_name} · {incident.caller_phone}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2 xl:items-end">
                  <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink-muted)]">
                    <RadioTower className="size-3.5 text-[var(--coral)]" strokeWidth={1.9} />
                    <time dateTime={incident.created_at}>{dateFormatter.format(new Date(incident.created_at))}</time>
                  </div>
                  {incident.status === "new" ? (
                    <button
                      type="button"
                      disabled={Boolean(dispatchingId)}
                      onClick={() => void dispatchIncident(incident.id)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-3.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--ink-soft)] disabled:cursor-wait disabled:opacity-55 disabled:hover:translate-y-0"
                    >
                      <Send className="size-3.5" strokeWidth={2} />
                      {dispatchingId === incident.id ? "Dispatching…" : "Dispatch to officers"}
                    </button>
                  ) : incident.status === "dispatched" ? (
                    <span className="text-xs font-semibold text-amber-700">Awaiting first claim</span>
                  ) : incident.claimed_by ? (
                    <span className="text-xs font-semibold text-emerald-700">Officer assigned</span>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

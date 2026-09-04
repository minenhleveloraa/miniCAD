import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

import { supabase } from "@/lib/supabase";
import type { IncidentRow, IncidentStatus, OfficerDutyRow, ProfileRow } from "@/types/database";

type ConnectionState = "connecting" | "live" | "offline";
type ReportConfirmation = {
  incidentId: string;
  submittedAt: number;
};
export type ClaimIncidentResult =
  | "claimed"
  | "already-claimed"
  | "already-assigned"
  | "not-available"
  | "error";
export type ResponseMutationResult = "success" | "invalid-transition" | "invalid-report" | "error";

type OfficerWorkspaceContextValue = {
  activeIncident: IncidentRow | null;
  advanceIncidentStatus: (
    incidentId: string,
    nextStatus: "en_route" | "on_scene",
  ) => Promise<ResponseMutationResult>;
  claimIncident: (incidentId: string) => Promise<ClaimIncidentResult>;
  claimingIncidentId: string | null;
  clearReportConfirmation: () => void;
  connection: ConnectionState;
  duty: OfficerDutyRow | null;
  dutyUpdating: boolean;
  errorMessage: string | null;
  incidents: IncidentRow[];
  initialLoading: boolean;
  profile: ProfileRow | null;
  reportConfirmation: ReportConfirmation | null;
  reportSubmitting: boolean;
  responseUpdatingId: string | null;
  setDuty: (isOnDuty: boolean) => Promise<void>;
  submitIncidentReport: (
    incidentId: string,
    actionsTaken: string,
    outcome: string,
  ) => Promise<ResponseMutationResult>;
};

const OfficerWorkspaceContext = createContext<OfficerWorkspaceContextValue | null>(null);

const ACTIVE_STATUSES: IncidentStatus[] = ["dispatched", "claimed", "en_route", "on_scene"];

function newestFirst(left: IncidentRow, right: IncidentRow) {
  return Date.parse(right.created_at) - Date.parse(left.created_at);
}

/**
 * Holds one canonical snapshot plus one Realtime channel for the authenticated
 * officer. Foreground recovery re-fetches the snapshot; it never polls.
 */
export function OfficerWorkspaceProvider({ children, officerId }: PropsWithChildren<{ officerId: string }>) {
  const [claimingIncidentId, setClaimingIncidentId] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionState>(() => (supabase ? "connecting" : "offline"));
  const [duty, setDutyState] = useState<OfficerDutyRow | null>(null);
  const [dutyUpdating, setDutyUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    supabase ? null : "Supabase is not configured for this build.",
  );
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(() => Boolean(supabase));
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [reportConfirmation, setReportConfirmation] = useState<ReportConfirmation | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [responseUpdatingId, setResponseUpdatingId] = useState<string | null>(null);
  const activeIncident = useMemo(
    () =>
      incidents.find(
        (incident) =>
          incident.claimed_by === officerId &&
          (["claimed", "en_route", "on_scene"] as IncidentStatus[]).includes(incident.status),
      ) ?? null,
    [incidents, officerId],
  );
  const clearReportConfirmation = useCallback(() => setReportConfirmation(null), []);

  const loadSnapshot = useCallback(async () => {
    const client = supabase;
    if (!client) {
      setErrorMessage("Supabase is not configured for this build.");
      setInitialLoading(false);
      return;
    }

    const [incidentResult, dutyResult, profileResult] = await Promise.all([
      client
        .from("incidents")
        .select("*")
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(50),
      client.from("officer_duty").select("*").eq("officer_id", officerId).maybeSingle(),
      client.from("profiles").select("*").eq("id", officerId).maybeSingle(),
    ]);

    if (incidentResult.data) setIncidents(incidentResult.data);
    if (dutyResult.data) setDutyState(dutyResult.data);
    if (profileResult.data) setProfile(profileResult.data);

    const snapshotError = incidentResult.error ?? dutyResult.error ?? profileResult.error;
    setErrorMessage(
      snapshotError
        ? "The live workspace could not load completely. Confirm that the latest Supabase migrations are applied."
        : null,
    );
    setInitialLoading(false);
  }, [officerId]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      return;
    }

    let isMounted = true;
    const initialSnapshotTimer = setTimeout(() => void loadSnapshot(), 0);

    function applyDutyChange(payload: RealtimePostgresChangesPayload<OfficerDutyRow>) {
      if (payload.eventType === "DELETE") {
        setDutyState(null);
        return;
      }

      if (payload.new.officer_id === officerId) {
        setDutyState(payload.new);
      }
    }

    const dutyChannel = client
      .channel(`officer-duty:${officerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "officer_duty", filter: `officer_id=eq.${officerId}` },
        (payload) => applyDutyChange(payload as RealtimePostgresChangesPayload<OfficerDutyRow>),
      )
      .subscribe();

    let incidentChannel: ReturnType<typeof client.channel> | null = null;

    // The database broadcasts only an incident id. We then re-read the
    // officer-authorized snapshot under RLS, which removes another officer's
    // winning claim without exposing caller data through a shared payload.
    void client.realtime
      .setAuth()
      .then(() => {
        if (!isMounted) return;

        incidentChannel = client
          .channel("minicad:incidents", { config: { private: true } })
          .on("broadcast", { event: "incident-changed" }, () => {
            void loadSnapshot();
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              setConnection("live");
              // Reconcile after subscribing so no event can be missed between
              // the first fetch and the WebSocket becoming ready.
              void loadSnapshot();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              setConnection("offline");
            }
          });
      })
      .catch(() => {
        if (isMounted) setConnection("offline");
      });

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void loadSnapshot();
    });

    return () => {
      isMounted = false;
      clearTimeout(initialSnapshotTimer);
      appStateSubscription.remove();
      void client.removeChannel(dutyChannel);
      if (incidentChannel) void client.removeChannel(incidentChannel);
    };
  }, [loadSnapshot, officerId]);

  const claimIncident = useCallback(
    async (incidentId: string): Promise<ClaimIncidentResult> => {
      const client = supabase;
      if (!client) return "error";
      if (!duty?.is_on_duty) return "not-available";
      if (claimingIncidentId) return "error";

      setClaimingIncidentId(incidentId);
      const { data, error } = await client.rpc("claim_incident", { p_incident_id: incidentId });

      if (error) {
        // Always reconcile after a rejected claim: another officer may have
        // won while this request was travelling to the database.
        await loadSnapshot();
        setClaimingIncidentId(null);

        if (error.message.includes("INCIDENT_ALREADY_CLAIMED")) return "already-claimed";
        if (error.message.includes("OFFICER_NOT_AVAILABLE")) return "not-available";
        if (error.message.includes("OFFICER_ALREADY_ASSIGNED")) return "already-assigned";
        return "error";
      }

      setIncidents((current) =>
        [data, ...current.filter((incident) => incident.id !== data.id)].sort(newestFirst),
      );
      setClaimingIncidentId(null);
      return "claimed";
    },
    [claimingIncidentId, duty?.is_on_duty, loadSnapshot],
  );

  const advanceIncidentStatus = useCallback(
    async (
      incidentId: string,
      nextStatus: "en_route" | "on_scene",
    ): Promise<ResponseMutationResult> => {
      const client = supabase;
      if (!client || responseUpdatingId) return "error";

      setResponseUpdatingId(incidentId);
      const { data, error } = await client.rpc("advance_incident_status", {
        p_incident_id: incidentId,
        p_next_status: nextStatus,
      });

      if (error) {
        await loadSnapshot();
        setResponseUpdatingId(null);
        return error.message.includes("INVALID_INCIDENT_TRANSITION") ? "invalid-transition" : "error";
      }

      setIncidents((current) =>
        [data, ...current.filter((incident) => incident.id !== data.id)].sort(newestFirst),
      );
      setResponseUpdatingId(null);
      return "success";
    },
    [loadSnapshot, responseUpdatingId],
  );

  const submitIncidentReport = useCallback(
    async (
      incidentId: string,
      actionsTaken: string,
      outcome: string,
    ): Promise<ResponseMutationResult> => {
      const client = supabase;
      if (!client || reportSubmitting) return "error";

      setReportSubmitting(true);
      const { error } = await client.rpc("submit_incident_report", {
        p_actions_taken: actionsTaken,
        p_incident_id: incidentId,
        p_outcome: outcome,
      });

      if (error) {
        await loadSnapshot();
        setReportSubmitting(false);

        if (error.message.includes("INVALID_REPORT_DETAILS")) return "invalid-report";
        if (
          error.message.includes("INCIDENT_NOT_READY_FOR_REPORT") ||
          error.message.includes("REPORT_ALREADY_SUBMITTED")
        ) {
          return "invalid-transition";
        }
        return "error";
      }

      // Resolved incidents leave the active officer snapshot immediately. The
      // database broadcast reconciles every other connected client.
      setReportConfirmation({ incidentId, submittedAt: Date.now() });
      setIncidents((current) => current.filter((incident) => incident.id !== incidentId));
      setReportSubmitting(false);
      return "success";
    },
    [loadSnapshot, reportSubmitting],
  );

  const value = useMemo<OfficerWorkspaceContextValue>(
    () => ({
      activeIncident,
      advanceIncidentStatus,
      claimIncident,
      claimingIncidentId,
      clearReportConfirmation,
      connection,
      duty,
      dutyUpdating,
      errorMessage,
      incidents,
      initialLoading,
      profile,
      reportConfirmation,
      reportSubmitting,
      responseUpdatingId,
      async setDuty(isOnDuty) {
        const client = supabase;
        if (!client || dutyUpdating) return;

        if (!isOnDuty && activeIncident) {
          setErrorMessage("Availability is locked until the assigned incident is resolved with a report.");
          return;
        }

        const previousDuty = duty;
        setDutyUpdating(true);
        setErrorMessage(null);
        setDutyState({ officer_id: officerId, is_on_duty: isOnDuty, changed_at: new Date().toISOString() });

        const { data, error } = await client.rpc("set_officer_duty", { p_is_on_duty: isOnDuty });

        if (error) {
          setDutyState(previousDuty);
          setErrorMessage(
            error.message.includes("OFFICER_HAS_ACTIVE_INCIDENT")
              ? "Availability is locked until the assigned incident is resolved with a report."
              : "Availability was not changed. Confirm the duty migration is applied, then try again.",
          );
        } else {
          setDutyState(data);
        }

        setDutyUpdating(false);
      },
      submitIncidentReport,
    }),
    [
      activeIncident,
      advanceIncidentStatus,
      claimIncident,
      claimingIncidentId,
      clearReportConfirmation,
      connection,
      duty,
      dutyUpdating,
      errorMessage,
      incidents,
      initialLoading,
      officerId,
      profile,
      reportConfirmation,
      reportSubmitting,
      responseUpdatingId,
      submitIncidentReport,
    ],
  );

  return <OfficerWorkspaceContext.Provider value={value}>{children}</OfficerWorkspaceContext.Provider>;
}

export function useOfficerWorkspace() {
  const context = useContext(OfficerWorkspaceContext);

  if (!context) {
    throw new Error("useOfficerWorkspace must be used inside OfficerWorkspaceProvider.");
  }

  return context;
}

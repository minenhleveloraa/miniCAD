import type { IncidentPriority, IncidentRow, IncidentStatus } from "@/types/database";

export type IncidentQueueItem = Pick<
  IncidentRow,
  | "caller_name"
  | "caller_phone"
  | "claimed_at"
  | "claimed_by"
  | "created_at"
  | "description"
  | "dispatched_at"
  | "id"
  | "incident_number"
  | "incident_type"
  | "location"
  | "priority"
  | "status"
>;

export const INCIDENT_PRIORITIES: readonly IncidentPriority[] = [
  "low",
  "medium",
  "high",
  "critical",
];

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  new: "New",
  dispatched: "Dispatched",
  claimed: "Claimed",
  en_route: "En route",
  on_scene: "On scene",
  resolved: "Resolved",
};

export const INCIDENT_PRIORITY_LABELS: Record<IncidentPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function formatIncidentNumber(incidentNumber: number) {
  return `MC-${String(incidentNumber).padStart(6, "0")}`;
}

import type { Metadata } from "next";

import {
  OfficerRoster,
  type OfficerRosterItem,
} from "@/components/dashboard/officer-roster";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Officer roster",
  description: "Live MiniCAD officer availability and assignment roster.",
};

export default async function OfficersPage() {
  const supabase = await createClient();
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

  const dutyByOfficer = new Map((dutyResult.data ?? []).map((duty) => [duty.officer_id, duty]));
  const assignmentByOfficer = new Map<string, NonNullable<typeof incidentResult.data>[number]>();
  for (const incident of incidentResult.data ?? []) {
    if (incident.claimed_by && incident.claimed_at && !assignmentByOfficer.has(incident.claimed_by)) {
      assignmentByOfficer.set(incident.claimed_by, incident);
    }
  }
  const officers: OfficerRosterItem[] = (profileResult.data ?? []).map((profile) => {
    const duty = dutyByOfficer.get(profile.id);
    const incident = assignmentByOfficer.get(profile.id);

    return {
      activeIncident: incident
        ? {
            claimedAt: incident.claimed_at as string,
            id: incident.id,
            incidentNumber: incident.incident_number,
            incidentType: incident.incident_type,
            location: incident.location,
            priority: incident.priority,
            status: incident.status,
          }
        : null,
      badgeNumber: profile.badge_number,
      changedAt: duty?.changed_at ?? new Date(0).toISOString(),
      displayName: profile.display_name,
      id: profile.id,
      isOnDuty: duty?.is_on_duty ?? false,
    };
  });

  return (
    <OfficerRoster
      dataError={Boolean(profileResult.error || dutyResult.error || incidentResult.error)}
      initialOfficers={officers}
    />
  );
}

import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import type { OfficerAvailabilityItem } from "@/components/dashboard/officer-availability";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Operations dashboard",
  description: "The secure MiniCAD dispatcher workspace.",
};

type DashboardPageProps = {
  searchParams: Promise<{ created?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const [{ created }, incidentResult, profileResult, dutyResult] = await Promise.all([
    searchParams,
    supabase
      .from("incidents")
      .select(
        "id, incident_number, caller_name, caller_phone, location, incident_type, priority, description, status, claimed_by, claimed_at, dispatched_at, created_at",
      )
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("profiles")
      .select("id, display_name, badge_number")
      .eq("role", "officer")
      .order("display_name", { ascending: true }),
    supabase.from("officer_duty").select("officer_id, is_on_duty, changed_at"),
  ]);
  const createdIncidentNumber = created && /^\d+$/.test(created) ? Number(created) : null;
  const dutyByOfficer = new Map((dutyResult.data ?? []).map((duty) => [duty.officer_id, duty]));
  const responseByOfficer = new Map<string, OfficerAvailabilityItem["activeResponse"]>();

  for (const incident of incidentResult.data ?? []) {
    if (
      incident.claimed_by &&
      ["claimed", "en_route", "on_scene"].includes(incident.status) &&
      !responseByOfficer.has(incident.claimed_by)
    ) {
      responseByOfficer.set(incident.claimed_by, {
        incidentNumber: incident.incident_number,
        status: incident.status,
      });
    }
  }

  const officers: OfficerAvailabilityItem[] = (profileResult.data ?? []).map((profile) => {
    const duty = dutyByOfficer.get(profile.id);

    return {
      activeResponse: responseByOfficer.get(profile.id) ?? null,
      badgeNumber: profile.badge_number,
      changedAt: duty?.changed_at ?? new Date(0).toISOString(),
      displayName: profile.display_name,
      id: profile.id,
      isOnDuty: duty?.is_on_duty ?? false,
    };
  });

  return (
    <DashboardView
      createdIncidentNumber={createdIncidentNumber}
      dataError={Boolean(incidentResult.error)}
      incidents={incidentResult.data ?? []}
      officerDataError={Boolean(profileResult.error || dutyResult.error || incidentResult.error)}
      officers={officers}
    />
  );
}

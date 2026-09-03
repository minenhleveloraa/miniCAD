import type { Metadata } from "next";

import { ReportsArchive, type ReportArchiveItem } from "@/components/dashboard/reports-archive";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Incident reports",
  description: "Resolved MiniCAD incidents and filed officer reports.",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const [reportResult, incidentResult, profileResult] = await Promise.all([
    supabase.from("incident_reports").select("*").order("resolved_at", { ascending: false }).limit(100),
    supabase.from("incidents").select("id, incident_number, incident_type, location, priority").eq("status", "resolved").order("resolved_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("id, display_name, badge_number").eq("role", "officer"),
  ]);

  const dataError = Boolean(reportResult.error || incidentResult.error || profileResult.error);
  const incidentById = new Map((incidentResult.data ?? []).map((incident) => [incident.id, incident]));
  const profileById = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
  const reports: ReportArchiveItem[] = dataError
    ? []
    : (reportResult.data ?? []).flatMap((report) => {
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

  return <ReportsArchive dataError={dataError} initialReports={reports} />;
}

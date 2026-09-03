import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OfficerResponseDetail, type OfficerResponseSnapshot } from "@/components/dashboard/officer-response-detail";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Officer response",
  description: "Live MiniCAD officer incident response status.",
};

export default async function OfficerResponsePage({ params }: { params: Promise<{ officerId: string }> }) {
  const { officerId } = await params;
  const supabase = await createClient();
  const [profileResult, dutyResult, incidentResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name, badge_number").eq("id", officerId).eq("role", "officer").maybeSingle(),
    supabase.from("officer_duty").select("officer_id, is_on_duty, changed_at").eq("officer_id", officerId).maybeSingle(),
    supabase.from("incidents").select("*").eq("claimed_by", officerId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!profileResult.data) notFound();

  const reportResult = incidentResult.data
    ? await supabase.from("incident_reports").select("*").eq("incident_id", incidentResult.data.id).maybeSingle()
    : { data: null, error: null };

  const initialSnapshot: OfficerResponseSnapshot = {
    duty: dutyResult.data,
    incident: incidentResult.data,
    officer: profileResult.data,
    report: reportResult.data,
  };

  return <OfficerResponseDetail dataError={Boolean(profileResult.error || dutyResult.error || incidentResult.error || reportResult.error)} initialSnapshot={initialSnapshot} />;
}

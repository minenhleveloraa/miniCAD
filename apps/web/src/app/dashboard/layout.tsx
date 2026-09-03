import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getAppRole, getClaimString } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Route protection is repeated here because layouts are an authorization boundary.
  if (error || !claims) {
    redirect("/login");
  }

  if (getAppRole(claims) !== "dispatcher") {
    redirect("/login?notice=dispatcher-only");
  }

  return (
    <DashboardShell email={getClaimString(claims, "email") ?? "Authenticated dispatcher"}>
      {children}
    </DashboardShell>
  );
}

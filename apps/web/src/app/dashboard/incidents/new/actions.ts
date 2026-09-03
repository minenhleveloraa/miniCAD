"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppRole, getClaimString } from "@/lib/auth/roles";
import { INCIDENT_PRIORITIES } from "@/lib/incidents";
import { createClient } from "@/lib/supabase/server";
import type { IncidentPriority } from "@/types/database";

export type IncidentFormValues = {
  caller_name: string;
  caller_phone: string;
  description: string;
  incident_type: string;
  location: string;
  priority: string;
};

export type IncidentFormState = {
  fieldErrors?: Partial<Record<keyof IncidentFormValues, string>>;
  message?: string;
};

function readText(formData: FormData, field: keyof IncidentFormValues) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function validateIncident(formData: FormData) {
  const values: IncidentFormValues = {
    caller_name: readText(formData, "caller_name"),
    caller_phone: readText(formData, "caller_phone"),
    description: readText(formData, "description"),
    incident_type: readText(formData, "incident_type"),
    location: readText(formData, "location"),
    priority: readText(formData, "priority"),
  };
  const fieldErrors: IncidentFormState["fieldErrors"] = {};

  if (values.caller_name.length < 2 || values.caller_name.length > 120) {
    fieldErrors.caller_name = "Enter the caller's name (2–120 characters).";
  }

  if (
    values.caller_phone.length < 7 ||
    values.caller_phone.length > 32 ||
    !/^[0-9+().\-\s]+$/.test(values.caller_phone)
  ) {
    fieldErrors.caller_phone = "Enter a valid phone number.";
  }

  if (values.location.length < 3 || values.location.length > 500) {
    fieldErrors.location = "Enter the incident location or address.";
  }

  if (values.incident_type.length < 2 || values.incident_type.length > 80) {
    fieldErrors.incident_type = "Enter an incident type (2–80 characters).";
  }

  if (!INCIDENT_PRIORITIES.includes(values.priority as IncidentPriority)) {
    fieldErrors.priority = "Select a valid priority.";
  }

  if (values.description.length < 5 || values.description.length > 1000) {
    fieldErrors.description = "Add a short description (5–1,000 characters).";
  }

  return {
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
    values,
  };
}

export async function createIncident(
  _previousState: IncidentFormState,
  formData: FormData,
): Promise<IncidentFormState> {
  const submission = validateIncident(formData);

  // Server-side validation is required even though the form also uses HTML constraints.
  if (!submission.isValid) {
    return { fieldErrors: submission.fieldErrors };
  }

  const supabase = await createClient();
  const { data: claimData, error: claimError } = await supabase.auth.getClaims();
  const claims = claimData?.claims;
  const dispatcherId = getClaimString(claims, "sub");

  // A Server Action is a public mutation endpoint, so it performs its own role check.
  if (claimError || !dispatcherId || getAppRole(claims) !== "dispatcher") {
    return { message: "Your dispatcher session is no longer authorized. Please sign in again." };
  }

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      caller_name: submission.values.caller_name,
      caller_phone: submission.values.caller_phone,
      created_by: dispatcherId,
      description: submission.values.description,
      incident_type: submission.values.incident_type,
      location: submission.values.location,
      priority: submission.values.priority as IncidentPriority,
    })
    .select("incident_number")
    .single();

  if (error || !data) {
    console.error("Incident insert failed", { code: error?.code ?? "unknown" });

    if (error?.code === "PGRST205" || error?.code === "42P01") {
      return { message: "Incident storage is not ready yet. Apply the Supabase migration and retry." };
    }

    return { message: "The incident could not be saved. Check your connection and try again." };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard?created=${data.incident_number}`);
}

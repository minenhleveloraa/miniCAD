import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Origin": "*",
};

const expoPushUrl = "https://exp.host/--/api/v2/push/send";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: "SERVER_CONFIGURATION_ERROR" }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await callerClient.auth.getUser();

  if (userError || !userData.user) return json({ error: "AUTHENTICATION_REQUIRED" }, 401);
  if (userData.user.app_metadata?.role !== "dispatcher") {
    return json({ error: "DISPATCHER_ROLE_REQUIRED" }, 403);
  }

  let incidentId: string | undefined;
  try {
    const body = await request.json();
    incidentId = typeof body?.incidentId === "string" ? body.incidentId : undefined;
  } catch {
    return json({ error: "INVALID_REQUEST_BODY" }, 400);
  }

  if (!incidentId) return json({ error: "INCIDENT_ID_REQUIRED" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: incident, error: incidentError } = await admin
    .from("incidents")
    .select("id, incident_number, incident_type, location, priority, status")
    .eq("id", incidentId)
    .eq("status", "dispatched")
    .maybeSingle();

  if (incidentError) return json({ error: "INCIDENT_LOOKUP_FAILED" }, 500);
  if (!incident) return json({ error: "INCIDENT_NOT_DISPATCHED" }, 409);

  const [dutyResult, assignmentResult] = await Promise.all([
    admin.from("officer_duty").select("officer_id").eq("is_on_duty", true),
    admin.from("incidents").select("claimed_by").in("status", ["claimed", "en_route", "on_scene"]),
  ]);

  if (dutyResult.error || assignmentResult.error) return json({ error: "OFFICER_LOOKUP_FAILED" }, 500);

  const busyOfficerIds = new Set(
    (assignmentResult.data ?? []).flatMap((incident) => incident.claimed_by ? [incident.claimed_by] : []),
  );
  const officerIds = (dutyResult.data ?? [])
    .map((duty) => duty.officer_id)
    .filter((officerId) => !busyOfficerIds.has(officerId));
  if (officerIds.length === 0) return json({ delivered: 0, reason: "NO_AVAILABLE_OFFICERS" });

  const { data: tokens, error: tokenError } = await admin
    .from("officer_push_tokens")
    .select("expo_push_token")
    .in("officer_id", officerIds);

  if (tokenError) return json({ error: "TOKEN_LOOKUP_FAILED" }, 500);
  if (!tokens?.length) return json({ delivered: 0, reason: "NO_REGISTERED_DEVICES" });

  const messages = tokens.map(({ expo_push_token }) => ({
    to: expo_push_token,
    title: `New ${incident.priority} priority dispatch`,
    body: `${incident.incident_type} · ${incident.location}`,
    data: { incidentId: incident.id, type: "incident-dispatched" },
    sound: "default",
    priority: "high",
    channelId: "dispatch-alerts",
    badge: 1,
  }));

  const expoHeaders: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoAccessToken) expoHeaders.Authorization = `Bearer ${expoAccessToken}`;

  const invalidTokens: string[] = [];
  let accepted = 0;

  // Expo accepts at most 100 messages in one request.
  for (let start = 0; start < messages.length; start += 100) {
    const messageChunk = messages.slice(start, start + 100);
    const response = await fetch(expoPushUrl, {
      body: JSON.stringify(messageChunk),
      headers: expoHeaders,
      method: "POST",
    });

    if (!response.ok) return json({ error: "EXPO_PUSH_REQUEST_FAILED" }, 502);

    const result = await response.json();
    const tickets = Array.isArray(result?.data) ? result.data : [];

    tickets.forEach((ticket: { details?: { error?: string }; status?: string }, index: number) => {
      if (ticket.status === "ok") accepted += 1;
      if (ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(messageChunk[index].to);
      }
    });
  }

  if (invalidTokens.length > 0) {
    await admin.from("officer_push_tokens").delete().in("expo_push_token", invalidTokens);
  }

  return json({ accepted, attempted: messages.length, removedInvalidTokens: invalidTokens.length });
});

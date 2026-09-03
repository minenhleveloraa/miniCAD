import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const email = process.env.SEED_USER_EMAIL;
const password = process.env.SEED_USER_PASSWORD;
const role = process.env.SEED_USER_ROLE ?? "officer";

if (!supabaseUrl || !supabaseKey || !email || !password) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_USER_EMAIL, and SEED_USER_PASSWORD before seeding.",
  );
}

if (role !== "officer" && role !== "dispatcher") {
  throw new Error("SEED_USER_ROLE must be either officer or dispatcher.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role },
});

if (error) throw error;

console.log(`Created ${role}: ${data.user.email}`);

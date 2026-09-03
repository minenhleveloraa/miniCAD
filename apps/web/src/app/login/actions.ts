"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAppRole } from "@/lib/auth/roles";

export type LoginFormState = {
  fieldErrors?: {
    email?: string;
    password?: string;
  };
  message?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  const fieldErrors: LoginFormState["fieldErrors"] = {};

  if (!email || email.length > 320 || !emailPattern.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password || password.length > 1024) {
    fieldErrors.password = "Enter your assigned password.";
  }

  return {
    email,
    password,
    fieldErrors,
    isValid: Object.keys(fieldErrors).length === 0,
  };
}

export async function signIn(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const credentials = validateCredentials(formData);

  // Validate before calling Supabase so malformed submissions never reach Auth.
  if (!credentials.isValid) {
    return { fieldErrors: credentials.fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      // Keep this response generic so the form does not reveal which accounts exist.
      return { message: "The email or password is incorrect." };
    }

    // The website is dispatcher-only. Officer credentials belong in the mobile app.
    if (getAppRole({ app_metadata: data.user.app_metadata }) !== "dispatcher") {
      await supabase.auth.signOut({ scope: "local" });
      return { message: "This account is not assigned to the dispatcher workspace." };
    }
  } catch {
    return {
      message: "We could not reach the secure sign-in service. Please try again.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

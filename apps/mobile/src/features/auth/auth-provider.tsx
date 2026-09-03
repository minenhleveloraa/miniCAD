import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { isOfficerRole } from "@/lib/auth/roles";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  isLoading: boolean;
  session: Session | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Owns the persisted Supabase session for every route in the officer app. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    let isMounted = true;

    function acceptOfficerSession(nextSession: Session | null) {
      if (!isMounted) return;

      if (nextSession && !isOfficerRole(nextSession.user.app_metadata)) {
        setSession(null);
        setIsLoading(false);
        // Sign out after the auth callback returns; nested Supabase calls inside
        // onAuthStateChange can otherwise contend with the auth client lock.
        setTimeout(() => void client?.auth.signOut({ scope: "local" }), 0);
        return;
      }

      setSession(nextSession);
      setIsLoading(false);
    }

    void client.auth.getSession().then(({ data }) => acceptOfficerSession(data.session));

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      acceptOfficerSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      async signOut() {
        if (!supabase) return;

        // Explicit sign-out also removes the officer from the on-duty pool.
        // Authentication and availability remain separate during sign-in.
        if (session) {
          const { error } = await supabase.rpc("set_officer_duty", { p_is_on_duty: false });
          if (error) throw error;
        }

        await supabase.auth.signOut();
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}

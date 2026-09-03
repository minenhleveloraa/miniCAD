import { Redirect } from "expo-router";

import { AuthLoadingScreen } from "@/components/auth-loading-screen";
import { useAuth } from "@/features/auth/auth-provider";

export default function IndexRoute() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return <Redirect href={session ? "/overview" : "/login"} />;
}

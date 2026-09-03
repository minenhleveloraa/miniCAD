import { Redirect } from "expo-router";

import { AuthLoadingScreen } from "@/components/auth-loading-screen";
import { useAuth } from "@/features/auth/auth-provider";
import { LoginScreen } from "@/screens/login";

export default function LoginRoute() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (session) {
    return <Redirect href="/overview" />;
  }

  return <LoginScreen />;
}

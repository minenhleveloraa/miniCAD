import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, type PropsWithChildren } from "react";
import { Platform, Vibration } from "react-native";

import { useAuth } from "@/features/auth/auth-provider";
import { supabase } from "@/lib/supabase";

const DISPATCH_CHANNEL_ID = "dispatch-alerts";
const VIBRATION_PATTERN = [0, 250, 120, 250];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function incidentIdFromNotification(response: Notifications.NotificationResponse | null) {
  const incidentId = response?.notification.request.content.data?.incidentId;
  return typeof incidentId === "string" ? incidentId : null;
}

/**
 * Registers the signed-in officer's Expo push token and handles dispatch taps.
 * Expo Go is intentionally skipped because SDK 57 requires a development or
 * production build for remote push notifications.
 */
export function NotificationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const officerId = session?.user.id;
    const client = supabase;

    if (!officerId || !client || Platform.OS === "web") return;

    let isMounted = true;
    const notificationClient = client;

    async function registerPushToken() {
      if (!Device.isDevice || Constants.appOwnership === "expo") return;

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(DISPATCH_CHANNEL_ID, {
          description: "Urgent MiniCAD incident dispatches",
          enableVibrate: true,
          importance: Notifications.AndroidImportance.MAX,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          name: "Emergency dispatches",
          showBadge: true,
          sound: "default",
          vibrationPattern: VIBRATION_PATTERN,
        });
      }

      const currentPermissions = await Notifications.getPermissionsAsync();
      const finalPermissions =
        currentPermissions.status === "granted"
          ? currentPermissions
          : await Notifications.requestPermissionsAsync();

      if (!isMounted || finalPermissions.status !== "granted") return;

      const projectId =
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) return;

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      if (!isMounted) return;

      await notificationClient.rpc("register_officer_push_token", {
        p_expo_push_token: token.data,
        p_platform: Platform.OS === "ios" ? "ios" : "android",
      });
    }

    // Token registration is a progressive enhancement: network, permission,
    // or build-credential failures must never prevent the officer from working.
    void registerPushToken().catch(() => undefined);

    const tokenSubscription = Notifications.addPushTokenListener(() => {
      void registerPushToken().catch(() => undefined);
    });

    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      if (notification.request.content.data?.type === "incident-dispatched") {
        Vibration.vibrate(VIBRATION_PATTERN);
      }
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const incidentId = incidentIdFromNotification(response);
      if (incidentId) router.push("/incidents");
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted) return;
      const incidentId = incidentIdFromNotification(response);
      if (incidentId) {
        Notifications.clearLastNotificationResponse();
        router.push("/incidents");
      }
    });

    return () => {
      isMounted = false;
      tokenSubscription.remove();
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [router, session?.user.id]);

  return children;
}

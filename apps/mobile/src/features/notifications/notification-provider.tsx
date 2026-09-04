import Constants from "expo-constants";
import * as Device from "expo-device";
import { useRouter } from "expo-router";
import { useEffect, type PropsWithChildren } from "react";
import { Platform, Vibration } from "react-native";
import type { NotificationResponse } from "expo-notifications";

import { useAuth } from "@/features/auth/auth-provider";
import { supabase } from "@/lib/supabase";

const DISPATCH_CHANNEL_ID = "dispatch-alerts";
const VIBRATION_PATTERN = [0, 250, 120, 250];

function incidentIdFromNotification(response: NotificationResponse | null) {
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

    // Importing expo-notifications itself throws in Expo Go on Android SDK 53+.
    // The guard must therefore run before the package is loaded, not merely
    // before push-token registration begins.
    if (
      !officerId ||
      !client ||
      Platform.OS === "web" ||
      Constants.appOwnership === "expo"
    ) {
      return;
    }

    let isMounted = true;
    const notificationClient = client;
    const subscriptions: { remove: () => void }[] = [];

    async function configureNotifications() {
      // Dynamic loading keeps Expo Go on the Realtime-only path while a
      // development/APK build receives the full native notification module.
      const Notifications = await import("expo-notifications");
      if (!isMounted) return;

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      async function registerPushToken() {
        if (!Device.isDevice) return;

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

      await registerPushToken().catch(() => undefined);
      if (!isMounted) return;

      subscriptions.push(Notifications.addPushTokenListener(() => {
        void registerPushToken().catch(() => undefined);
      }));

      subscriptions.push(Notifications.addNotificationReceivedListener((notification) => {
        if (notification.request.content.data?.type === "incident-dispatched") {
          Vibration.vibrate(VIBRATION_PATTERN);
        }
      }));

      subscriptions.push(Notifications.addNotificationResponseReceivedListener((response) => {
        const incidentId = incidentIdFromNotification(response);
        if (incidentId) router.push("/incidents");
      }));

      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!isMounted) return;
        const incidentId = incidentIdFromNotification(response);
        if (incidentId) {
          Notifications.clearLastNotificationResponse();
          router.push("/incidents");
        }
      });
    }

    // Token registration is a progressive enhancement: network, permission,
    // or build-credential failures must never prevent the officer from working.
    void configureNotifications().catch(() => undefined);

    return () => {
      isMounted = false;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [router, session?.user.id]);

  return children;
}

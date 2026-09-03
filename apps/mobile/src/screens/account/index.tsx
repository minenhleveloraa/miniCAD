import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/auth-provider";
import { useOfficerWorkspace } from "@/features/workspace/officer-workspace-provider";
import { colors, fonts, radius, shadows, spacing, typography } from "@/theme";

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const { activeIncident, duty, profile } = useOfficerWorkspace();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const displayName = profile?.display_name ?? session?.user.email?.split("@")[0] ?? "Officer";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await signOut();
    } catch {
      setSignOutError("Sign-out could not be completed. Check your connection and try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + 124,
        backgroundColor: colors.canvas,
      }}
    >
      <View>
        <Text style={{ color: colors.accent, ...typography.eyebrow }}>SECURE PROFILE</Text>
        <Text style={{ marginTop: spacing.sm, color: colors.ink, fontFamily: fonts.serif, fontSize: 36, lineHeight: 40 }}>
          Officer account
        </Text>
      </View>

      <View
        style={{
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.xl,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceStrong,
          boxShadow: shadows.card,
        }}
      >
        <View
          style={{
            width: 82,
            height: 82,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.ink,
          }}
        >
          <Text style={{ color: colors.onDark, fontFamily: fonts.serif, fontSize: 30 }}>{initials}</Text>
        </View>
        <View style={{ alignItems: "center", gap: 3 }}>
          <Text style={{ color: colors.ink, fontFamily: fonts.sansBold, fontSize: 20 }}>{displayName}</Text>
          <Text style={{ color: colors.inkMuted, ...typography.body }}>{session?.user.email}</Text>
          {profile?.badge_number ? (
            <Text style={{ color: colors.accent, ...typography.caption }}>Badge {profile.badge_number}</Text>
          ) : null}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: radius.full,
            backgroundColor: duty?.is_on_duty ? colors.successSurface : colors.canvas,
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: radius.full,
              backgroundColor: duty?.is_on_duty ? colors.success : colors.inkMuted,
            }}
          />
          <Text style={{ color: duty?.is_on_duty ? colors.success : colors.inkMuted, ...typography.caption }}>
            {duty?.is_on_duty ? "Available for dispatch" : "Off duty"}
          </Text>
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceStrong,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: radius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.successSurface,
            }}
          >
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, ...typography.label }}>Protected session</Text>
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>Stored securely on this device</Text>
          </View>
        </View>
      </View>

      {signOutError ? <Text style={{ color: colors.danger, ...typography.caption }}>{signOutError}</Text> : null}

      {activeIncident ? (
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            borderCurve: "continuous",
            backgroundColor: "rgba(232,99,74,0.10)",
          }}
        >
          <MaterialCommunityIcons name="lock-outline" size={20} color={colors.accent} />
          <Text style={{ flex: 1, color: colors.inkSoft, ...typography.caption }}>
            Finish and report the assigned incident before signing out.
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut || Boolean(activeIncident)}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => ({
          minHeight: 56,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surfaceStrong,
          opacity: isSigningOut || activeIncident ? 0.5 : pressed ? 0.75 : 1,
        })}
      >
        {isSigningOut ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <MaterialCommunityIcons name="logout" size={20} color={colors.ink} />
        )}
        <Text style={{ color: colors.ink, ...typography.label }}>
          {isSigningOut ? "Signing out" : activeIncident ? "Sign-out locked while responding" : "Sign out securely"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvailabilitySwitch } from "@/components/availability-switch";
import { IncidentCard } from "@/components/incident-card";
import { LiveStatusPill } from "@/components/live-status-pill";
import { useAuth } from "@/features/auth/auth-provider";
import { useOfficerWorkspace } from "@/features/workspace/officer-workspace-provider";
import { colors, fonts, radius, shadows, spacing, typography } from "@/theme";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { activeIncident, connection, duty, dutyUpdating, errorMessage, incidents, initialLoading, profile, setDuty } =
    useOfficerWorkspace();
  const isOnDuty = duty?.is_on_duty ?? false;
  const displayName = profile?.display_name ?? session?.user.email?.split("@")[0] ?? "Officer";
  const firstName = displayName.split(" ")[0];
  const assignedCount = incidents.filter((incident) => incident.claimed_by === session?.user.id).length;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: spacing.lg,
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + 124,
        backgroundColor: colors.canvas,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent,
            }}
          >
            <Text style={{ color: colors.onDark, fontFamily: fonts.sansBold, fontSize: 18 }}>M</Text>
          </View>
          <View>
            <Text style={{ color: colors.ink, fontFamily: fonts.sansBold, fontSize: 17 }}>MiniCAD</Text>
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>OFFICER RESPONSE</Text>
          </View>
        </View>

        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceStrong,
          }}
        >
          <MaterialCommunityIcons name="shield-check-outline" size={21} color={colors.ink} />
        </View>
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.inkMuted, ...typography.label }}>{getGreeting()}, {firstName}.</Text>
        <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 36, lineHeight: 40, letterSpacing: -0.8 }}>
          Response overview
        </Text>
      </View>

      <View
        style={{
          overflow: "hidden",
          gap: spacing.lg,
          padding: spacing.lg,
          borderRadius: radius.xl,
          borderCurve: "continuous",
          backgroundColor: colors.ink,
          boxShadow: shadows.card,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 190,
            height: 190,
            right: -70,
            top: -95,
            borderRadius: radius.full,
            backgroundColor: "rgba(232,99,74,0.22)",
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Text style={{ color: colors.accentLight, ...typography.eyebrow }}>DUTY STATUS</Text>
            <Text style={{ color: colors.onDark, fontFamily: fonts.serif, fontSize: 29, lineHeight: 33 }}>
              {activeIncident
                ? "You’re assigned and responding."
                : isOnDuty
                  ? "You’re available for dispatch."
                  : "You’re currently off duty."}
            </Text>
          </View>
          <LiveStatusPill connection={connection} onDark />
        </View>

        <Text style={{ color: colors.onDarkMuted, ...typography.body }}>
          {activeIncident
            ? "Availability stays locked until you submit the final incident report."
            : "Signing in does not make you available. Change this only when you are ready to receive work."}
        </Text>

        <AvailabilitySwitch
          disabled={dutyUpdating || initialLoading || Boolean(activeIncident)}
          isOn={isOnDuty}
          loading={dutyUpdating || initialLoading}
          locked={Boolean(activeIncident)}
          onChange={(nextValue) => void setDuty(nextValue)}
        />
      </View>

      {errorMessage ? (
        <View
          accessibilityLiveRegion="polite"
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.dangerSurface,
          }}
        >
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={{ flex: 1, color: colors.danger, ...typography.caption }}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View
          style={{
            flex: 1,
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceStrong,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>OPEN</Text>
            <MaterialCommunityIcons name="access-point" size={18} color={colors.accent} />
          </View>
          <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 34 }}>{incidents.length}</Text>
          <Text style={{ color: colors.inkSoft, ...typography.caption }}>Live dispatches</Text>
        </View>

        <View
          style={{
            flex: 1,
            gap: spacing.sm,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: "rgba(232,99,74,0.10)",
            borderWidth: 1,
            borderColor: "rgba(232,99,74,0.13)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>ASSIGNED</Text>
            <MaterialCommunityIcons name="shield-account-outline" size={18} color={colors.accent} />
          </View>
          <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 34 }}>{assignedCount}</Text>
          <Text style={{ color: colors.inkSoft, ...typography.caption }}>In your response</Text>
        </View>
      </View>

      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md }}>
          <View>
            <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 24 }}>Active incidents</Text>
            <Text style={{ marginTop: 3, color: colors.inkMuted, ...typography.caption }}>
              Authorized updates appear here automatically.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/incidents")}
            style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}
          >
            <Text style={{ color: colors.accent, ...typography.label }}>View all</Text>
          </Pressable>
        </View>

        {initialLoading ? (
          <View style={{ minHeight: 150, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : incidents.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              gap: spacing.sm,
              paddingVertical: spacing.xl,
              paddingHorizontal: spacing.lg,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.border,
              backgroundColor: "rgba(255,255,255,0.52)",
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.full,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surfaceStrong,
              }}
            >
              <MaterialCommunityIcons name="check-circle-outline" size={24} color={colors.success} />
            </View>
            <Text style={{ color: colors.ink, ...typography.label }}>No dispatched incidents</Text>
            <Text style={{ textAlign: "center", color: colors.inkMuted, ...typography.caption }}>
              Incidents will appear the moment a dispatcher logs them.
            </Text>
          </View>
        ) : (
          incidents.slice(0, 3).map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onOpen={
                incident.claimed_by === session?.user.id && ["claimed", "en_route", "on_scene"].includes(incident.status)
                  ? () => router.push({ pathname: "/incidents/[id]", params: { id: incident.id } })
                  : undefined
              }
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

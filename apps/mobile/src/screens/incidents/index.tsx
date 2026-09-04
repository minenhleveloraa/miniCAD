import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IncidentCard } from "@/components/incident-card";
import { LiveStatusPill } from "@/components/live-status-pill";
import { useOfficerWorkspace } from "@/features/workspace/officer-workspace-provider";
import { colors, fonts, radius, spacing, typography } from "@/theme";

export function IncidentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    claimIncident,
    claimingIncidentId,
    connection,
    duty,
    incidents,
    initialLoading,
    reportConfirmation,
  } = useOfficerWorkspace();
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const hasActiveAssignment = useMemo(
    () => incidents.some((incident) => ["claimed", "en_route", "on_scene"].includes(incident.status)),
    [incidents],
  );
  const isAvailable = duty?.is_on_duty ?? false;

  useFocusEffect(
    useCallback(() => {
      if (!reportConfirmation) return;

      // Reporting first returns this nested stack to its list. Only after the
      // list is focused do we switch tabs, leaving Incidents clean for reuse.
      const frame = requestAnimationFrame(() => router.navigate("/overview"));
      return () => cancelAnimationFrame(frame);
    }, [reportConfirmation, router]),
  );

  const handleClaim = useCallback(
    async (incidentId: string) => {
      setFeedback(null);
      const result = await claimIncident(incidentId);

      if (result === "claimed") {
        setFeedback({ tone: "success", text: "Incident secured. It is now assigned to you." });
        router.push({ pathname: "/incidents/[id]", params: { id: incidentId } });
      } else if (result === "already-claimed") {
        setFeedback({
          tone: "error",
          text: "Another officer claimed this incident first. Your queue is now up to date.",
        });
      } else if (result === "already-assigned") {
        setFeedback({ tone: "error", text: "Finish your current response before claiming another incident." });
      } else if (result === "not-available") {
        setFeedback({ tone: "error", text: "Set yourself to Available on the overview before claiming." });
      } else {
        setFeedback({
          tone: "error",
          text: "The incident could not be claimed. Check the live connection and try again.",
        });
      }
    },
    [claimIncident, router],
  );

  const claimDisabledLabel = !isAvailable ? "Go available to claim" : "Finish current incident";

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={incidents}
      keyExtractor={(incident) => incident.id}
      renderItem={({ item }) => (
        <IncidentCard
          canClaim={isAvailable && !hasActiveAssignment}
          claimDisabledLabel={claimDisabledLabel}
          incident={item}
          isClaiming={claimingIncidentId === item.id}
          onClaim={() => void handleClaim(item.id)}
          onOpen={
            item.claimed_by && ["claimed", "en_route", "on_scene"].includes(item.status)
              ? () => router.push({ pathname: "/incidents/[id]", params: { id: item.id } })
              : undefined
          }
        />
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingBottom: insets.bottom + 124,
        backgroundColor: colors.canvas,
      }}
      ListHeaderComponent={
        <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.accent, ...typography.eyebrow }}>RESPONSE QUEUE</Text>
              <Text
                style={{
                  marginTop: spacing.sm,
                  color: colors.ink,
                  fontFamily: fonts.serif,
                  fontSize: 36,
                  lineHeight: 40,
                }}
              >
                Active incidents
              </Text>
              <Text style={{ marginTop: spacing.sm, color: colors.inkMuted, ...typography.body }}>
                Dispatched calls arrive here automatically and are ordered newest first.
              </Text>
            </View>
            <LiveStatusPill connection={connection} />
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingVertical: 12,
              borderRadius: radius.md,
              borderCurve: "continuous",
              backgroundColor: isAvailable ? colors.successSurface : "rgba(232,99,74,0.10)",
            }}
          >
            <MaterialCommunityIcons
              name={isAvailable ? "shield-check-outline" : "information-outline"}
              size={19}
              color={isAvailable ? colors.success : colors.accent}
            />
            <Text
              style={{
                flex: 1,
                color: isAvailable ? colors.success : colors.inkSoft,
                ...typography.caption,
              }}
            >
              {isAvailable
                ? hasActiveAssignment
                  ? "You already own a response. Other calls remain visible, but cannot be claimed yet."
                  : "You are available. The first valid claim recorded by Supabase wins."
                : "You can inspect dispatched calls while off duty. Go Available on Overview to claim one."}
            </Text>
          </View>

          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radius.md,
                borderCurve: "continuous",
                backgroundColor: feedback.tone === "success" ? colors.successSurface : colors.dangerSurface,
              }}
            >
              <MaterialCommunityIcons
                name={feedback.tone === "success" ? "check-circle-outline" : "alert-circle-outline"}
                size={20}
                color={feedback.tone === "success" ? colors.success : colors.danger}
              />
              <Text
                style={{
                  flex: 1,
                  color: feedback.tone === "success" ? colors.success : colors.danger,
                  ...typography.caption,
                }}
              >
                {feedback.text}
              </Text>
              <Pressable
                accessibilityLabel="Dismiss message"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => setFeedback(null)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={feedback.tone === "success" ? colors.success : colors.danger}
                />
              </Pressable>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        initialLoading ? (
          <View style={{ minHeight: 240, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>BUILDING LIVE SNAPSHOT</Text>
          </View>
        ) : (
          <View
            style={{
              minHeight: 260,
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              padding: spacing.xl,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.border,
              borderRadius: radius.xl,
              borderCurve: "continuous",
              backgroundColor: "rgba(255,255,255,0.52)",
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: radius.full,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surfaceStrong,
              }}
            >
              <MaterialCommunityIcons name="radio-tower" size={27} color={colors.accent} />
            </View>
            <Text style={{ color: colors.ink, fontFamily: fonts.sansBold, fontSize: 16 }}>
              No dispatched incidents
            </Text>
            <Text style={{ textAlign: "center", color: colors.inkMuted, ...typography.body }}>
              A dispatcher broadcast will appear here without refreshing this screen.
            </Text>
          </View>
        )
      }
    />
  );
}

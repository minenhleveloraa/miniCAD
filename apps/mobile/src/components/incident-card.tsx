import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors, fonts, radius, shadows, spacing, typography } from "@/theme";
import type { IncidentPriority, IncidentRow, IncidentStatus } from "@/types/database";

const priorityStyle: Record<IncidentPriority, { background: string; color: string; label: string }> = {
  low: { background: "#EFF8FF", color: "#175CD3", label: "Low" },
  medium: { background: "#FFFAEB", color: "#B54708", label: "Medium" },
  high: { background: "#FFF1F0", color: "#D92D20", label: "High" },
  critical: { background: "#FEE4E2", color: "#912018", label: "Critical" },
};

const statusLabel: Record<IncidentStatus, string> = {
  new: "New",
  dispatched: "Dispatched",
  claimed: "Claimed",
  en_route: "En route",
  on_scene: "On scene",
  resolved: "Resolved",
};

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
});

export function formatIncidentNumber(incidentNumber: number) {
  return `MC-${String(incidentNumber).padStart(6, "0")}`;
}

type IncidentCardProps = {
  canClaim?: boolean;
  claimDisabledLabel?: string;
  incident: IncidentRow;
  isClaiming?: boolean;
  onClaim?: () => void;
  onOpen?: () => void;
};

export function IncidentCard({
  canClaim = false,
  claimDisabledLabel = "Go available to claim",
  incident,
  isClaiming = false,
  onClaim,
  onOpen,
}: IncidentCardProps) {
  const priority = priorityStyle[incident.priority];
  const isOpen = incident.status === "dispatched";

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border,
        borderLeftWidth: 5,
        borderLeftColor: priority.color,
        backgroundColor: colors.surfaceStrong,
        boxShadow: shadows.card,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(232,99,74,0.11)",
            }}
          >
            <MaterialCommunityIcons name="alarm-light-outline" size={19} color={colors.accent} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={{ color: colors.accent, ...typography.caption }}>
              {formatIncidentNumber(incident.incident_number)}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.ink, fontFamily: fonts.sansBold, fontSize: 17 }}>
              {incident.incident_type}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: priority.background }}>
          <Text style={{ color: priority.color, ...typography.caption }}>{priority.label}</Text>
        </View>
      </View>

      <Text numberOfLines={2} style={{ color: colors.inkMuted, ...typography.body }}>
        {incident.description}
      </Text>

      <View style={{ gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.accent} />
          <Text numberOfLines={1} style={{ flex: 1, color: colors.inkSoft, ...typography.caption }}>
            {incident.location}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={colors.inkMuted} />
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>
              {dateFormatter.format(new Date(incident.created_at))}
            </Text>
          </View>
          <Text style={{ color: colors.inkSoft, ...typography.caption }}>{statusLabel[incident.status]}</Text>
        </View>
      </View>

      {isOpen && onClaim ? (
        <Pressable
          accessibilityHint={
            canClaim
              ? "Assigns this incident to you if no other officer has claimed it first"
              : "Set yourself available from the overview screen before claiming"
          }
          accessibilityLabel={`Claim ${formatIncidentNumber(incident.incident_number)}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canClaim || isClaiming, busy: isClaiming }}
          disabled={!canClaim || isClaiming}
          onPress={onClaim}
          style={({ pressed }) => ({
            minHeight: 50,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.sm,
            borderRadius: radius.md,
            borderCurve: "continuous",
            backgroundColor: canClaim ? colors.ink : "rgba(26,26,46,0.07)",
            opacity: pressed ? 0.84 : 1,
          })}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color={colors.onDark} />
          ) : (
            <MaterialCommunityIcons
              name={canClaim ? "shield-check-outline" : "lock-outline"}
              size={18}
              color={canClaim ? colors.onDark : colors.inkMuted}
            />
          )}
          <Text
            style={{
              color: canClaim ? colors.onDark : colors.inkMuted,
              fontFamily: fonts.sansBold,
              fontSize: 14,
            }}
          >
            {isClaiming ? "Securing incident…" : canClaim ? "Claim incident" : claimDisabledLabel}
          </Text>
        </Pressable>
      ) : !isOpen ? (
        <Pressable
          accessibilityLabel={`Open response for ${formatIncidentNumber(incident.incident_number)}`}
          accessibilityRole="button"
          disabled={!onOpen}
          onPress={onOpen}
          style={{
            minHeight: 46,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing.sm,
            borderRadius: radius.md,
            borderCurve: "continuous",
            backgroundColor: colors.successSurface,
          }}
        >
          <MaterialCommunityIcons name="check-decagram-outline" size={18} color={colors.success} />
          <Text style={{ color: colors.success, fontFamily: fonts.sansBold, fontSize: 14 }}>
            Open response
          </Text>
          <MaterialCommunityIcons name="arrow-right" size={18} color={colors.success} />
        </Pressable>
      ) : null}
    </View>
  );
}

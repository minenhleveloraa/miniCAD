import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Text, View } from "react-native";

import { colors, radius, typography } from "@/theme";

type LiveStatusPillProps = {
  connection: "connecting" | "live" | "offline";
  onDark?: boolean;
};

export function LiveStatusPill({ connection, onDark = false }: LiveStatusPillProps) {
  const isLive = connection === "live";
  const label = isLive ? "Live" : connection === "offline" ? "Reconnecting" : "Connecting";

  return (
    <View
      accessibilityLabel={`Realtime status: ${label}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: radius.full,
        backgroundColor: onDark ? "rgba(255,255,255,0.09)" : colors.surfaceStrong,
        borderWidth: onDark ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      <MaterialCommunityIcons
        name={isLive ? "access-point" : "access-point-off"}
        size={14}
        color={isLive ? (onDark ? "#74DEA8" : colors.success) : onDark ? colors.onDarkMuted : colors.inkMuted}
      />
      <Text
        style={{
          color: isLive ? (onDark ? "#BDF5D5" : colors.success) : onDark ? colors.onDarkMuted : colors.inkMuted,
          ...typography.caption,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

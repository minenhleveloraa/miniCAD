import { ActivityIndicator, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

export function AuthLoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.md,
        backgroundColor: colors.ink,
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accent,
        }}
      >
        <Text style={{ color: colors.onDark, ...typography.heading }}>M</Text>
      </View>
      <ActivityIndicator color={colors.accentLight} />
      <Text style={{ color: colors.onDarkMuted, ...typography.caption }}>RESTORING SECURE SESSION</Text>
    </View>
  );
}

import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, shadows, spacing, typography } from "@/theme";

/** Branded confirmation shown after a final report replaces the active route. */
export function ReportSuccessToast() {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      entering={FadeInDown.duration(260).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.duration(220).reduceMotion(ReduceMotion.System)}
      pointerEvents="none"
      style={{
        position: "absolute",
        zIndex: 20,
        top: insets.top + spacing.sm,
        left: spacing.md,
        right: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderCurve: "continuous",
        backgroundColor: colors.ink,
        boxShadow: shadows.card,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.full,
          backgroundColor: colors.success,
        }}
      >
        <MaterialCommunityIcons name="check-bold" size={22} color={colors.onDark} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: colors.onDark, fontFamily: fonts.sansBold, fontSize: 15 }}>
          Report filed successfully
        </Text>
        <Text style={{ marginTop: 2, color: colors.onDarkMuted, ...typography.caption }}>
          Incident resolved. You are ready for the next response.
        </Text>
      </View>
      <MaterialCommunityIcons name="file-check-outline" size={22} color={colors.accentLight} />
    </Animated.View>
  );
}

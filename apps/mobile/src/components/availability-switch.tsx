import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors, fonts, radius, spacing } from "@/theme";

type AvailabilitySwitchProps = {
  disabled: boolean;
  isOn: boolean;
  loading?: boolean;
  onChange: (nextValue: boolean) => void;
};

/** Accessible, Expo-Go-safe switch styled to match the MiniCAD visual system. */
export function AvailabilitySwitch({
  disabled,
  isOn,
  loading = false,
  onChange,
}: AvailabilitySwitchProps) {
  return (
    <Pressable
      accessibilityLabel="Officer availability"
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn, disabled }}
      disabled={disabled}
      onPress={() => onChange(!isOn)}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingLeft: spacing.lg,
        paddingRight: 10,
        borderRadius: radius.full,
        backgroundColor: isOn ? colors.accent : "rgba(255,255,255,0.09)",
        opacity: disabled ? 0.68 : pressed ? 0.84 : 1,
      })}
    >
      <Text style={{ color: colors.onDark, fontFamily: fonts.sansBold, fontSize: 15 }}>
        {isOn ? "Available" : "Off duty"}
      </Text>
      <View
        style={{
          width: 68,
          height: 40,
          borderRadius: radius.full,
          justifyContent: "center",
          padding: 4,
          backgroundColor: "rgba(255,255,255,0.24)",
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.full,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: isOn ? "flex-end" : "flex-start",
            backgroundColor: colors.surfaceStrong,
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={isOn ? colors.accent : colors.inkMuted} />
          ) : (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: radius.full,
                backgroundColor: isOn ? colors.accent : colors.inkMuted,
              }}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

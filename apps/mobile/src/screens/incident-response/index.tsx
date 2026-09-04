import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { formatIncidentNumber } from "@/components/incident-card";
import { useOfficerWorkspace } from "@/features/workspace/officer-workspace-provider";
import { colors, fonts, radius, shadows, spacing, typography } from "@/theme";
import type { IncidentPriority, IncidentStatus } from "@/types/database";

type IncidentResponseScreenProps = {
  incidentId: string;
};

const priorityStyle: Record<IncidentPriority, { background: string; color: string; label: string }> = {
  low: { background: "#EFF8FF", color: "#175CD3", label: "Low priority" },
  medium: { background: "#FFFAEB", color: "#B54708", label: "Medium priority" },
  high: { background: "#FFF1F0", color: "#D92D20", label: "High priority" },
  critical: { background: "#FEE4E2", color: "#912018", label: "Critical priority" },
};

const responseSteps: { icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"]; label: string; status: IncidentStatus }[] = [
  { icon: "shield-check-outline", label: "Claimed", status: "claimed" },
  { icon: "car-emergency", label: "En route", status: "en_route" },
  { icon: "map-marker-check-outline", label: "On scene", status: "on_scene" },
  { icon: "file-check-outline", label: "Resolved · report filed", status: "resolved" },
];

const statusIndex: Record<IncidentStatus, number> = {
  new: -1,
  dispatched: -1,
  claimed: 0,
  en_route: 1,
  on_scene: 2,
  resolved: 3,
};

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  dateStyle: "medium",
  timeStyle: "short",
});

function ReportField({
  label,
  maxLength,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  maxLength: number;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <Text style={{ color: colors.ink, ...typography.label }}>{label}</Text>
        <Text style={{ color: colors.inkMuted, ...typography.caption }}>{value.length}/{maxLength}</Text>
      </View>
      <TextInput
        accessibilityLabel={label}
        maxLength={maxLength}
        multiline
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(107,107,128,0.72)"
        textAlignVertical="top"
        value={value}
        style={{
          minHeight: 126,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceStrong,
          color: colors.ink,
          fontFamily: fonts.sansRegular,
          fontSize: 15,
          lineHeight: 23,
        }}
      />
    </View>
  );
}

export function IncidentResponseScreen({ incidentId }: IncidentResponseScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    advanceIncidentStatus,
    incidents,
    initialLoading,
    reportSubmitting,
    responseUpdatingId,
    submitIncidentReport,
  } = useOfficerWorkspace();
  const [actionsTaken, setActionsTaken] = useState("");
  const [outcome, setOutcome] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const incident = useMemo(() => incidents.find((item) => item.id === incidentId), [incidentId, incidents]);

  function returnToOverview() {
    // A single dismiss action removes the completed response from the nested
    // Incident stack while returning to Overview. Dispatching two navigation
    // updates here can race the screen unmount in React Native.
    router.dismissTo("/overview");
  }

  if (!incident) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl, backgroundColor: colors.canvas }}>
        {initialLoading ? (
          <>
            <ActivityIndicator color={colors.accent} />
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>LOADING RESPONSE</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="check-circle-outline" size={42} color={colors.success} />
            <Text style={{ textAlign: "center", color: colors.ink, fontFamily: fonts.serif, fontSize: 28 }}>
              This response is no longer active.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={returnToOverview}
              style={{ paddingHorizontal: spacing.lg, paddingVertical: 13, borderRadius: radius.full, backgroundColor: colors.ink }}
            >
              <Text style={{ color: colors.onDark, ...typography.label }}>Return to overview</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  const priority = priorityStyle[incident.priority];
  const currentStep = statusIndex[incident.status];
  const isUpdating = responseUpdatingId === incident.id;
  const canSubmit = actionsTaken.trim().length >= 10 && outcome.trim().length >= 3;
  const responseIncident = incident;

  async function handleAdvance() {
    const nextStatus = responseIncident.status === "claimed" ? "en_route" : "on_scene";
    setFeedback(null);
    const result = await advanceIncidentStatus(responseIncident.id, nextStatus);
    if (result !== "success") {
      setFeedback(
        result === "invalid-transition"
          ? "This response changed elsewhere. The current live status has been restored."
          : "The status could not be updated. Check the live connection and try again.",
      );
    }
  }

  async function handleSubmitReport() {
    setFeedback(null);
    const result = await submitIncidentReport(responseIncident.id, actionsTaken.trim(), outcome.trim());
    if (result === "success") {
      Alert.alert("Report submitted", "The incident is resolved and you are available for a new response.", [
        { text: "Done", onPress: returnToOverview },
      ]);
      return;
    }

    setFeedback(
      result === "invalid-report"
        ? "Add at least 10 characters of response detail and a clear outcome."
        : result === "invalid-transition"
          ? "This incident is no longer ready for a report. The live status has been restored."
          : "The report could not be submitted. Check the live connection and try again.",
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          gap: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <Pressable
            accessibilityLabel="Back to incidents"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.back()}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong }}
          >
            <MaterialCommunityIcons name="arrow-left" size={21} color={colors.ink} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.accent, ...typography.eyebrow }}>ACTIVE RESPONSE</Text>
            <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 29 }}>My incident</Text>
          </View>
          <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: colors.ink }}>
            <MaterialCommunityIcons name="shield-account-outline" size={21} color={colors.onDark} />
          </View>
        </View>

        <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, boxShadow: shadows.card }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <Text style={{ color: colors.accent, ...typography.eyebrow }}>{formatIncidentNumber(incident.incident_number)}</Text>
            <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: priority.background }}>
              <Text style={{ color: priority.color, ...typography.caption }}>{priority.label}</Text>
            </View>
          </View>
          <Text style={{ color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 32 }}>{incident.incident_type}</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
            <MaterialCommunityIcons name="map-marker-outline" size={19} color={colors.accent} />
            <Text style={{ flex: 1, color: colors.inkSoft, ...typography.body }}>{incident.location}</Text>
          </View>
          <Text style={{ color: colors.inkMuted, ...typography.body }}>{incident.description}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>Dispatched {incident.dispatched_at ? dateFormatter.format(new Date(incident.dispatched_at)) : "—"}</Text>
            <Text style={{ color: colors.inkMuted, ...typography.caption }}>Claimed {incident.claimed_at ? dateFormatter.format(new Date(incident.claimed_at)) : "—"}</Text>
          </View>
        </View>

        <View style={{ gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.ink }}>
          <View>
            <Text style={{ color: colors.accentLight, ...typography.eyebrow }}>RESPONSE PIPELINE</Text>
            <Text style={{ marginTop: spacing.xs, color: colors.onDark, fontFamily: fonts.serif, fontSize: 25 }}>Update status</Text>
          </View>
          <View>
            {responseSteps.map((step, index) => {
              const reached = currentStep >= index;
              const active = currentStep === index;
              return (
                <View key={step.status} style={{ minHeight: 58, flexDirection: "row", gap: spacing.md }}>
                  <View style={{ alignItems: "center" }}>
                    <View style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.full, backgroundColor: reached ? colors.accent : "rgba(255,255,255,0.10)", borderWidth: active ? 3 : 0, borderColor: "rgba(255,255,255,0.28)" }}>
                      <MaterialCommunityIcons name={step.icon} size={17} color={reached ? colors.onDark : colors.onDarkMuted} />
                    </View>
                    {index < responseSteps.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: currentStep > index ? colors.accent : "rgba(255,255,255,0.12)" }} /> : null}
                  </View>
                  <View style={{ flex: 1, paddingTop: 6 }}>
                    <Text style={{ color: reached ? colors.onDark : colors.onDarkMuted, fontFamily: active ? fonts.sansBold : fonts.sansMedium, fontSize: 15 }}>{step.label}</Text>
                    {active && step.status !== "resolved" ? <Text style={{ marginTop: 3, color: colors.accentLight, ...typography.caption }}>Current status</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>

          {incident.status === "claimed" || incident.status === "en_route" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: isUpdating, disabled: isUpdating }}
              disabled={isUpdating}
              onPress={() => void handleAdvance()}
              style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: colors.accent, opacity: pressed || isUpdating ? 0.78 : 1 })}
            >
              {isUpdating ? <ActivityIndicator color={colors.onDark} /> : <MaterialCommunityIcons name={incident.status === "claimed" ? "car-emergency" : "map-marker-check-outline"} size={20} color={colors.onDark} />}
              <Text style={{ color: colors.onDark, fontFamily: fonts.sansBold, fontSize: 15 }}>
                {isUpdating ? "Updating…" : incident.status === "claimed" ? "Mark en route" : "Mark on scene"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {incident.status === "on_scene" ? (
          <View style={{ gap: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong }}>
            <View>
              <Text style={{ color: colors.accent, ...typography.eyebrow }}>FINAL REPORT</Text>
              <Text style={{ marginTop: spacing.xs, color: colors.ink, fontFamily: fonts.serif, fontSize: 27 }}>Close the incident</Text>
              <Text style={{ marginTop: spacing.sm, color: colors.inkMuted, ...typography.body }}>
                Record what you did and the final outcome. Submission resolves the incident and unlocks availability.
              </Text>
            </View>
            <ReportField label="Response details" maxLength={2000} value={actionsTaken} onChangeText={setActionsTaken} placeholder="Describe arrival, assessment, actions taken, and any relevant handover…" />
            <ReportField label="Outcome" maxLength={1000} value={outcome} onChangeText={setOutcome} placeholder="Summarise the outcome and how the incident was concluded…" />
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: "rgba(26,26,46,0.04)" }}>
              <MaterialCommunityIcons name="clock-check-outline" size={19} color={colors.accent} />
              <Text style={{ flex: 1, color: colors.inkMuted, ...typography.caption }}>Resolution time is recorded automatically when this report is accepted.</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: reportSubmitting, disabled: !canSubmit || reportSubmitting }}
              disabled={!canSubmit || reportSubmitting}
              onPress={() => void handleSubmitReport()}
              style={({ pressed }) => ({ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderRadius: radius.md, backgroundColor: canSubmit ? colors.accent : "rgba(26,26,46,0.08)", opacity: pressed || reportSubmitting ? 0.78 : 1 })}
            >
              {reportSubmitting ? <ActivityIndicator color={colors.onDark} /> : <MaterialCommunityIcons name="file-check-outline" size={20} color={canSubmit ? colors.onDark : colors.inkMuted} />}
              <Text style={{ color: canSubmit ? colors.onDark : colors.inkMuted, fontFamily: fonts.sansBold, fontSize: 15 }}>{reportSubmitting ? "Submitting report…" : "Submit final report"}</Text>
            </Pressable>
          </View>
        ) : null}

        {feedback ? (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.dangerSurface }}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={{ flex: 1, color: colors.danger, ...typography.caption }}>{feedback}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

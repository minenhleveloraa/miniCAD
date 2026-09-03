import { useRef, useState, useTransition } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isOfficerRole } from "@/lib/auth/roles";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { colors, fonts, radius, shadows, spacing, typography } from "@/theme";

type Feedback = {
  message: string;
  tone: "danger" | "success";
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const email = useRef("");
  const password = useRef("");
  const scrollView = useRef<ScrollView>(null);
  const passwordInput = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();
  const horizontalPadding = width < 380 ? spacing.md : spacing.lg;

  function handleSignIn() {
    Keyboard.dismiss();
    const normalizedEmail = email.current.trim().toLowerCase();

    if (!emailPattern.test(normalizedEmail) || !password.current) {
      setFeedback({
        tone: "danger",
        message: "Enter your assigned email address and password.",
      });
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setFeedback({
        tone: "danger",
        message: "Supabase is not configured. Add the two EXPO_PUBLIC variables and restart Expo.",
      });
      return;
    }

    const client = supabase;
    setFeedback(null);
    startTransition(async () => {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: normalizedEmail,
          password: password.current,
        });

        if (error) {
          setFeedback({ tone: "danger", message: "The email or password is incorrect." });
          return;
        }

        // The officer app never accepts dispatcher credentials, even when Auth succeeds.
        if (!isOfficerRole(data.user.app_metadata)) {
          await client.auth.signOut({ scope: "local" });
          setFeedback({
            tone: "danger",
            message: "This account is not assigned to the officer application.",
          });
          return;
        }

        password.current = "";
        passwordInput.current?.clear();
        setFeedback({ tone: "success", message: "Officer session verified." });
      } catch {
        setFeedback({
          tone: "danger",
          message: "The secure sign-in service could not be reached. Check your connection and try again.",
        });
      }
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <ScrollView
        ref={scrollView}
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          backgroundColor: colors.canvas,
          paddingBottom: insets.bottom + spacing.lg,
        }}
      >
      <View
        style={{
          minHeight: 330,
          overflow: "hidden",
          backgroundColor: colors.ink,
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: horizontalPadding,
          paddingBottom: spacing.xxl + spacing.xl,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 260,
            height: 260,
            borderRadius: radius.full,
            top: -90,
            right: -80,
            backgroundColor: "rgba(232, 99, 74, 0.18)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 190,
            height: 190,
            borderRadius: radius.full,
            bottom: -110,
            left: -70,
            backgroundColor: "rgba(245, 166, 35, 0.10)",
          }}
        />

        <View style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.md,
                  borderCurve: "continuous",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.accent,
                }}
              >
                <Text selectable style={{ color: colors.onDark, fontFamily: fonts.sansBold, fontSize: 17 }}>M</Text>
              </View>
              <Text
                selectable
                style={{ color: colors.onDark, fontFamily: fonts.sansBold, fontSize: 18, letterSpacing: -0.3 }}
              >
                MiniCAD
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: radius.full,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.accentLight }} />
              <Text selectable style={{ color: colors.onDarkMuted, ...typography.caption }}>SECURE</Text>
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <Text selectable style={{ color: colors.accentLight, ...typography.eyebrow }}>
              OFFICER ACCESS
            </Text>
            <Text selectable style={{ color: colors.onDark, ...typography.title }}>
              Ready when it matters.
            </Text>
            <Text selectable style={{ maxWidth: 360, color: colors.onDarkMuted, ...typography.body }}>
              Sign in to receive dispatches and keep the response team in sync.
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          width: "100%",
          maxWidth: 480,
          alignSelf: "center",
          paddingHorizontal: horizontalPadding,
          marginTop: -spacing.xl,
        }}
      >
        <View
          style={{
            gap: spacing.lg,
            padding: width < 380 ? spacing.lg : spacing.xl,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            boxShadow: shadows.card,
          }}
        >
          <View style={{ gap: spacing.sm }}>
            <Text selectable style={{ color: colors.ink, ...typography.heading }}>Welcome back.</Text>
            <Text selectable style={{ color: colors.inkMuted, ...typography.body }}>
              Use the credentials assigned by your administrator.
            </Text>
          </View>

          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Text selectable style={{ color: colors.inkSoft, ...typography.label }}>Email address</Text>
              {/* React Native's input avoids an Android layout crash in Expo UI's
                  matchContents host while retaining the same visual treatment. */}
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!isPending}
                inputMode="email"
                maxLength={320}
                onChangeText={(value) => {
                  email.current = value;
                }}
                onFocus={() => scrollView.current?.scrollTo({ y: 260, animated: true })}
                onSubmitEditing={() => passwordInput.current?.focus()}
                placeholder="officer@minicad.co.za"
                placeholderTextColor={colors.inkMuted}
                returnKeyType="next"
                selectionColor={colors.accent}
                testID="officer-email"
                underlineColorAndroid="transparent"
                style={{
                  width: "100%",
                  height: 56,
                  paddingHorizontal: spacing.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  backgroundColor: colors.surfaceStrong,
                  color: colors.ink,
                  fontFamily: fonts.sansRegular,
                  fontSize: 16,
                }}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text selectable style={{ color: colors.inkSoft, ...typography.label }}>Password</Text>
              <View>
                <TextInput
                  ref={passwordInput}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  autoCorrect={false}
                  editable={!isPending}
                  maxLength={1024}
                  onChangeText={(value) => {
                    password.current = value;
                  }}
                  onFocus={() => scrollView.current?.scrollToEnd({ animated: true })}
                  onSubmitEditing={handleSignIn}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.inkMuted}
                  returnKeyType="go"
                  secureTextEntry={!showPassword}
                  selectionColor={colors.accent}
                  testID="officer-password"
                  underlineColorAndroid="transparent"
                  style={{
                    width: "100%",
                    height: 56,
                    paddingLeft: spacing.md,
                    paddingRight: 78,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    backgroundColor: colors.surfaceStrong,
                    color: colors.ink,
                    fontFamily: fonts.sansRegular,
                    fontSize: 16,
                  }}
                />
                <Pressable
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                  accessibilityRole="button"
                  disabled={isPending}
                  hitSlop={8}
                  onPress={() => setShowPassword((visible) => !visible)}
                  style={({ pressed }) => ({
                    position: "absolute",
                    right: 14,
                    top: 0,
                    height: 56,
                    justifyContent: "center",
                    opacity: pressed ? 0.55 : 1,
                  })}
                >
                  <Text style={{ color: colors.accent, ...typography.label }}>{showPassword ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderCurve: "continuous",
                backgroundColor: feedback.tone === "success" ? colors.successSurface : colors.dangerSurface,
              }}
            >
              <Text
                selectable
                style={{
                  color: feedback.tone === "success" ? colors.success : colors.danger,
                  ...typography.label,
                }}
              >
                {feedback.message}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            disabled={isPending}
            onPress={handleSignIn}
            style={({ pressed }) => ({
              minHeight: 56,
              borderRadius: radius.md,
              borderCurve: "continuous",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: spacing.sm,
              backgroundColor: colors.accent,
              opacity: isPending ? 0.68 : pressed ? 0.82 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
              boxShadow: shadows.button,
            })}
          >
            {isPending ? <ActivityIndicator color={colors.onDark} /> : null}
            <Text style={{ color: colors.onDark, fontFamily: fonts.sansBold, fontSize: 16 }}>
              {isPending ? "Signing in securely" : "Sign in as officer"}
            </Text>
          </Pressable>

          <Text selectable style={{ textAlign: "center", color: colors.inkMuted, ...typography.caption }}>
            No public signup. Accounts are provisioned in Supabase Auth.
          </Text>
        </View>

        <Text
          selectable
          style={{
            paddingTop: spacing.lg,
            textAlign: "center",
            color: colors.inkMuted,
            ...typography.caption,
          }}
        >
          MiniCAD · Protected mobile access
        </Text>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "../components/ui/PrimaryButton";
import { Screen } from "../components/ui/Screen";
import { Colors, Radius, Spacing } from "../constants/theme";
import { useAuth } from "../context/auth-context";
import { getErrorMessage } from "../lib/api";

/** Pre-filled only when `__DEV__` is true (not in production builds). Matches `backend/prisma/seed.js`. */
const SAMPLE_REGIMENTAL = "AP2025SDAF0490515";
const SAMPLE_PASSWORD = "Sree@1234";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);

  const [regimentalNumber, setRegimentalNumber] = useState(
    __DEV__ ? SAMPLE_REGIMENTAL : ""
  );
  const [password, setPassword] = useState(__DEV__ ? SAMPLE_PASSWORD : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const reg = regimentalNumber.trim();
    if (!reg || !password) {
      setError("Enter your regimental number and password.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    try {
      await login(reg, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/dashboard");
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(e, "Login failed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll contentStyle={styles.screenPad}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Ionicons name="shield-checkmark" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.badge}>NCC · AIR WING</Text>
          <Text style={styles.title}>Exam Portal</Text>
          <Text style={styles.subtitle}>
            Sign in with your regimental number to access materials and exams.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Regimental number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. NCC/2024/001"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            value={regimentalNumber}
            onChangeText={setRegimentalNumber}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            ref={passwordRef}
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Sign in"
            onPress={onSubmit}
            loading={submitting}
            style={styles.submit}
          />

          <Text style={styles.hint}>
            Use credentials issued by your unit. Contact staff if you need access.
          </Text>
          {__DEV__ ? (
            <Text style={styles.devHint}>
              Dev: sample cadet is pre-filled. Run{" "}
              <Text style={styles.devMono}>npm run db:seed</Text> in{" "}
              <Text style={styles.devMono}>backend/</Text> once so this account exists.
            </Text>
          ) : null}

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>New cadet?</Text>
            <Pressable onPress={() => router.push("/signup")} hitSlop={8}>
              <Text style={styles.footerLink}>Create account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenPad: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
  },
  hero: {
    marginBottom: Spacing.xl,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: Spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textMuted,
    maxWidth: 320,
  },
  form: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
  },
  error: {
    color: Colors.danger,
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  submit: {
    marginTop: Spacing.md,
  },
  hint: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: Spacing.lg,
    lineHeight: 18,
  },
  devHint: {
    fontSize: 12,
    color: Colors.primary,
    textAlign: "center",
    marginTop: Spacing.sm,
    lineHeight: 17,
    paddingHorizontal: Spacing.sm,
  },
  devMono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 11,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.lg,
    gap: 6,
  },
  footerMuted: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
  },
});

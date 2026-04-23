import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { api, getErrorMessage } from "../lib/api";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const e = email.trim();
    if (!e) {
      setError("Enter your email address.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/auth/password/forgot", { email: e });
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(err, "Request failed"));
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
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Ionicons name="mail-outline" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.badge}>ACCOUNT</Text>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter the email on your cadet profile. If an account exists, you will receive a reset link.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={onSubmit}
            returnKeyType="send"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label={done ? "Email sent" : "Send reset link"}
            onPress={onSubmit}
            loading={submitting}
            disabled={done}
            style={styles.submit}
          />

          {done ? (
            <Text style={styles.hint}>
              Check your inbox (and spam). Open the link on this device to set a new password.
            </Text>
          ) : null}

          <View style={styles.footerRow}>
            <Text style={styles.footerMuted}>Have a token?</Text>
            <Pressable onPress={() => router.push("/reset-password")} hitSlop={8}>
              <Text style={styles.footerLink}>Enter it here</Text>
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
    paddingTop: Spacing.lg,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.md,
  },
  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
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
    maxWidth: 340,
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
    marginTop: Spacing.md,
    lineHeight: 18,
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

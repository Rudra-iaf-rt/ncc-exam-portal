import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState, useEffect } from "react";
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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();

  const tokenFromLink = useMemo(() => {
    const t = params?.token;
    if (typeof t === "string") return t;
    if (Array.isArray(t) && typeof t[0] === "string") return t[0];
    return "";
  }, [params]);

  const [token, setToken] = useState(tokenFromLink);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isValidating, setIsValidating] = useState(!!tokenFromLink);
  const [validUser, setValidUser] = useState<{ name: string; regimentalNumber: string | null; email: string | null } | null>(null);

  useEffect(() => {
    async function validateToken() {
      if (!tokenFromLink) return;
      setIsValidating(true);
      setError(null);
      try {
        const res = await api.post("/api/auth/password/verify-token", { token: tokenFromLink });
        setValidUser(res.data?.user || null);
      } catch (err) {
        setError(getErrorMessage(err, "This reset link is invalid or has expired."));
      } finally {
        setIsValidating(false);
      }
    }
    validateToken();
  }, [tokenFromLink]);

  async function onSubmit() {
    setError(null);
    const t = token.trim();
    if (!t || newPassword.length < 6) {
      setError("Enter the reset token and a new password (min. 6 characters).");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/auth/password/reset", {
        token: t,
        newPassword,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/login");
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(err, "Reset failed"));
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
            <Ionicons name="key-outline" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.badge}>ACCOUNT</Text>
          <Text style={styles.title}>New password</Text>
          <Text style={styles.subtitle}>
            Paste the token from your email, then choose a new password. Sign in afterward with your
            regimental number.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Reset token</Text>
          <TextInput
            style={[styles.input, (isValidating || validUser) && styles.inputDisabled]}
            placeholder="Paste token"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={token}
            onChangeText={setToken}
            editable={!isValidating && !validUser}
          />

          {isValidating && (
            <Text style={styles.validatingText}>Validating token...</Text>
          )}

          {validUser && (
            <View style={styles.userCard}>
              <Text style={styles.userCardTitle}>Resetting password for:</Text>
              <Text style={styles.userCardName}>{validUser.name}</Text>
              {validUser.regimentalNumber ? <Text style={styles.userCardSub}>{validUser.regimentalNumber}</Text> : null}
              {validUser.email ? <Text style={styles.userCardSub}>{validUser.email}</Text> : null}
            </View>
          )}

          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
            editable={!isValidating}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton 
            label="Update password" 
            onPress={onSubmit} 
            loading={submitting} 
            style={styles.submit}
            disabled={isValidating || !!error}
          />
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
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.surfaceHover,
  },
  validatingText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  userCard: {
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginVertical: Spacing.xs,
  },
  userCardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  userCardSub: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/portal/field';
import { PageHeader } from '@/components/portal/page-header';
import { PrimaryButton } from '@/components/portal/primary-button';
import { PortalColors, Spacing } from '@/constants/portal';
import { api, getErrorMessage } from '@/lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  const tokenFromLink = useMemo(() => {
    const t = params?.token;
    return typeof t === 'string' ? t : '';
  }, [params]);

  const [token, setToken] = useState(tokenFromLink);
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!token.trim() || newPassword.length < 6) {
      setError('Enter a valid token and a password (min. 6 characters).');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password/reset', {
        token: token.trim(),
        newPassword,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(auth)/login');
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(err, 'Reset failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>

          <PageHeader
            badge="Account"
            title="Set new password"
            subtitle="Paste the reset token from your email, then choose a new password."
            tone="light"
            style={styles.header}
          />

          <Field
            label="Reset token"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Field
            label="New password (min. 6 characters)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Update password" onPress={onSubmit} loading={submitting} />

          <Text style={styles.note}>
            After updating your password, sign in again using your regimental number and new password.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: PortalColors.navy },
  scroll: { padding: Spacing.lg, paddingTop: Spacing.xl },
  back: {
    color: PortalColors.accentMuted,
    fontSize: 15,
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  header: { marginBottom: Spacing.xl },
  error: { color: '#fca5a5', marginBottom: Spacing.md, fontSize: 14 },
  note: { color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: Spacing.lg },
});


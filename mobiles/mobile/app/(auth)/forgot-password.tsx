import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const e = email.trim();
    if (!e) {
      setError('Enter your email address.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/password/forgot', { email: e });
      setDone(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(err, 'Request failed'));
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
            title="Reset password"
            subtitle="Enter your email. If an account exists, we’ll send a reset link."
            tone="light"
            style={styles.header}
          />

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Send reset link" onPress={onSubmit} loading={submitting} />

          {done ? (
            <View style={styles.notice}>
              <ActivityIndicator color={PortalColors.accentMuted} />
              <Text style={styles.noticeText}>
                Check your email for a reset link. You can close this screen.
              </Text>
            </View>
          ) : null}

          <Pressable onPress={() => router.push('/(auth)/reset-password')} style={styles.linkWrap}>
            <Text style={styles.link}>I already have a reset token</Text>
          </Pressable>
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
  notice: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeText: { color: '#cbd5e1', flex: 1, fontSize: 13, lineHeight: 18 },
  linkWrap: { marginTop: Spacing.lg, alignItems: 'center' },
  link: { color: PortalColors.accentMuted, fontSize: 15, fontWeight: '500' },
});


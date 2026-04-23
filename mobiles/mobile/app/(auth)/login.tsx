import * as Haptics from 'expo-haptics';
import { Redirect, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/portal/field';
import { PageHeader } from '@/components/portal/page-header';
import { PrimaryButton } from '@/components/portal/primary-button';
import { PortalColors, Spacing } from '@/constants/portal';
import { useAuth } from '@/context/auth-context';
import { getErrorMessage } from '@/lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const passwordRef = useRef<TextInput>(null);
  const { user, loading: authLoading, login } = useAuth();

  const [regimentalNumber, setRegimentalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    const reg = regimentalNumber.trim();
    if (!reg || !password) {
      setError('Enter your regimental number and password.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setSubmitting(true);
    try {
      await login(reg, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(student)');
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(e, 'Login failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <View style={[styles.flex, styles.centered]}>
        <ActivityIndicator color={PortalColors.accentMuted} size="large" />
      </View>
    );
  }
  if (user) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <PageHeader
            badge="Air Wing"
            title="Sign in"
            subtitle="Regimental number and password"
            tone="light"
            style={styles.header}
          />

          <Field
            label="Regimental number"
            value={regimentalNumber}
            onChangeText={setRegimentalNumber}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />

          <Field
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Sign in" onPress={onSubmit} loading={submitting} />

          <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.linkWrap}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/(auth)/register')} style={styles.linkWrap}>
            <Text style={styles.link}>New cadet? Create an account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PortalColors.navy,
  },
  safe: {
    flex: 1,
    backgroundColor: PortalColors.navy,
  },
  scroll: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  error: {
    color: '#fca5a5',
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  linkWrap: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  link: {
    color: PortalColors.accentMuted,
    fontSize: 15,
    fontWeight: '500',
  },
});

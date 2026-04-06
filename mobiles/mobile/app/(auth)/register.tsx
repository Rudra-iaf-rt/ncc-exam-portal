import { Redirect, useRouter } from 'expo-router';
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
import { PrimaryButton } from '@/components/portal/primary-button';
import { PortalColors, Spacing } from '@/constants/portal';
import { useAuth } from '@/context/auth-context';
import { getErrorMessage } from '@/lib/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { user, loading: authLoading, registerStudent } = useAuth();

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
  const [name, setName] = useState('');
  const [regimentalNumber, setRegimentalNumber] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await registerStudent({
        name: name.trim(),
        regimentalNumber: regimentalNumber.trim(),
        college: college.trim(),
        password,
      });
      router.replace('/(student)');
    } catch (e) {
      setError(getErrorMessage(e, 'Registration failed'));
    } finally {
      setLoading(false);
    }
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
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Back to sign in</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.badge}>ENROLMENT</Text>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>For cadets — use your official regimental number</Text>
          </View>

          <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field
            label="Regimental number"
            value={regimentalNumber}
            onChangeText={setRegimentalNumber}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Field label="College / unit" value={college} onChangeText={setCollege} />
          <Field
            label="Password (min. 6 characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton title="Register" onPress={onSubmit} loading={loading} />

          <Text style={styles.legal}>
            By registering you confirm that your details are accurate and authorised by your unit.
          </Text>
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
    paddingTop: Spacing.md,
  },
  back: {
    color: PortalColors.accentMuted,
    fontSize: 15,
    marginBottom: Spacing.lg,
    fontWeight: '500',
  },
  header: {
    marginBottom: Spacing.lg,
  },
  badge: {
    color: PortalColors.accentMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  error: {
    color: '#fca5a5',
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  legal: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
});

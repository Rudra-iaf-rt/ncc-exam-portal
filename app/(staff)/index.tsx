import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/portal/primary-button';
import { PortalColors, Spacing } from '@/constants/portal';
import { useAuth } from '@/context/auth-context';

export default function StaffHomeScreen() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PortalColors.navy }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR')) {
    return <Redirect href="/(auth)/login" />;
  }

  async function signOut() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <Text style={styles.badge}>STAFF</Text>
        <Text style={styles.title}>Command dashboard</Text>
        <Text style={styles.sub}>
          Signed in as {user?.name} ({user?.role}). Full grading and exam authoring are optimised for
          the web console; this app focuses on cadet workflows.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue}>{user?.email ?? '—'}</Text>
        </View>
        <PrimaryButton title="Sign out" onPress={signOut} variant="outline" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PortalColors.navy,
  },
  inner: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
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
    marginBottom: Spacing.md,
  },
  sub: {
    color: '#94a3b8',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  card: {
    backgroundColor: PortalColors.navyLight,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  cardLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardValue: {
    color: '#e2e8f0',
    fontSize: 16,
  },
});

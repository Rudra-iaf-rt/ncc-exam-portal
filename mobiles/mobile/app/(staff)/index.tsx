import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/portal/card';
import { PageHeader } from '@/components/portal/page-header';
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
        <PageHeader
          badge="Command Centre"
          title="Staff Dashboard"
          subtitle={`Signed in as ${user?.name} (${user?.role}). Navigation tabs below mirror key operations while full authoring stays on web.`}
        />
        <Card style={styles.card}>
          <Text style={styles.cardLabel}>Email</Text>
          <Text style={styles.cardValue}>{user?.email ?? 'Not available'}</Text>
        </Card>
        <PrimaryButton title="Sign out" onPress={signOut} variant="outline" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PortalColors.stone,
  },
  inner: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardLabel: {
    color: PortalColors.muted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardValue: {
    color: PortalColors.navy,
    fontSize: 16,
    fontWeight: '600',
  },
});

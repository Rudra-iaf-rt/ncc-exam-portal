import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/portal/card';
import { PageHeader } from '@/components/portal/page-header';
import { SectionHeader } from '@/components/portal/section-header';
import { PortalColors, Spacing } from '@/constants/portal';
import { useAuth } from '@/context/auth-context';
import { api, type ExamListItem, type StudentResultItem } from '@/lib/api';

export default function StudentDashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  async function signOut() {
    await logout();
    router.replace('/(auth)/login');
  }
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [latest, setLatest] = useState<StudentResultItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [examsRes, resultsRes] = await Promise.all([
      api.get<{ exams: ExamListItem[] }>('/exams'),
      api.get<{ results: StudentResultItem[] }>('/results/student'),
    ]);
    setExams(examsRes.data.exams);
    const r = resultsRes.data.results;
    setLatest(r.length ? r[0] : null);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.topRow}>
          <View>
            <PageHeader badge="Cadet Portal" title={user?.name ?? 'Cadet'} />
            <Text style={styles.meta}>
              {user?.regimentalNumber ?? '—'} · {user?.college ?? ''}
            </Text>
          </View>
          <Pressable onPress={signOut} style={styles.signOut} hitSlop={8}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <Card style={styles.hero}>
          <Text style={styles.heroLabel}>Quick status</Text>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroValue}>{exams.length}</Text>
              <Text style={styles.heroCaption}>Exams listed</Text>
            </View>
            <View style={styles.heroDivider} />
            <View>
              <Text style={styles.heroValue}>{latest ? `${latest.score}%` : '—'}</Text>
              <Text style={styles.heroCaption}>Latest score</Text>
            </View>
          </View>
        </Card>

        <SectionHeader title="Shortcuts" />
        <View style={styles.grid}>
          <Pressable
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={() => router.push('/(student)/materials')}>
            <Text style={styles.tileTitle}>Materials</Text>
            <Text style={styles.tileSub}>Syllabus & notices</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={() => router.push('/(student)/exam')}>
            <Text style={styles.tileTitle}>Exams</Text>
            <Text style={styles.tileSub}>Start or resume</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={() => router.push('/(student)/results')}>
            <Text style={styles.tileTitle}>Results</Text>
            <Text style={styles.tileSub}>View scores</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: PortalColors.stone,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  meta: {
    color: PortalColors.slate,
    fontSize: 13,
    marginTop: 4,
  },
  signOut: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  signOutText: {
    color: PortalColors.navy,
    fontWeight: '600',
    fontSize: 14,
  },
  hero: {
    marginBottom: Spacing.lg,
  },
  heroLabel: {
    color: PortalColors.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: Spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: PortalColors.border,
    marginHorizontal: Spacing.lg,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '700',
    color: PortalColors.navy,
  },
  heroCaption: {
    fontSize: 13,
    color: PortalColors.muted,
    marginTop: 2,
  },
  grid: {
    gap: Spacing.sm,
  },
  tile: {
    backgroundColor: PortalColors.cardLight,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: PortalColors.border,
  },
  tilePressed: {
    opacity: 0.92,
  },
  tileTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PortalColors.navy,
  },
  tileSub: {
    fontSize: 13,
    color: PortalColors.muted,
    marginTop: 4,
  },
});

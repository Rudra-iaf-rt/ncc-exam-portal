import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/portal/card';
import { PageHeader } from '@/components/portal/page-header';
import { PortalColors, Spacing } from '@/constants/portal';
import { api, type StudentResultItem } from '@/lib/api';

export default function ResultsScreen() {
  const [results, setResults] = useState<StudentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get<{ results: StudentResultItem[] }>('/results/student');
    setResults(data.results);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <PageHeader
          badge="Performance"
          title="Results"
          subtitle="Official scores for completed exams."
        />

        {loading ? (
          <ActivityIndicator style={styles.loader} color={PortalColors.accent} />
        ) : results.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No results yet. Complete an exam to see your score here.</Text>
          </Card>
        ) : (
          results.map((r) => (
            <Card key={r.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <Text style={styles.examName} numberOfLines={2}>
                  {r.examTitle}
                </Text>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{r.score}%</Text>
                </View>
              </View>
              <Text style={styles.sub}>Exam #{r.examId}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PortalColors.stone },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  loader: { marginVertical: Spacing.xl },
  empty: {
    color: PortalColors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  rowCard: {
    marginBottom: Spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  examName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: PortalColors.navy,
  },
  pill: {
    backgroundColor: 'rgba(59, 109, 17, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 15,
    color: PortalColors.success,
  },
  sub: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: PortalColors.muted,
  },
});

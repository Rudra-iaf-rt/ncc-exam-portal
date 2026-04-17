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
import { PortalColors, Spacing } from '@/constants/portal';
import { api, type StudentResultItem } from '@/lib/api';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ResultsScreen() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#0f172a' : '#f8fafc';
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
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={[styles.headline, { color: scheme === 'dark' ? '#f1f5f9' : PortalColors.navy }]}>
          Results
        </Text>
        <Text style={styles.lead}>Official scores for completed exams.</Text>

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
  safe: { flex: 1 },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  lead: {
    fontSize: 15,
    color: PortalColors.muted,
    marginBottom: Spacing.lg,
    lineHeight: 22,
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
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontWeight: '800',
    fontSize: 15,
    color: PortalColors.accent,
  },
  sub: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: PortalColors.muted,
  },
});

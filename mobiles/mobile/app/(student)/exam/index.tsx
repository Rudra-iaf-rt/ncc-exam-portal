import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { PortalColors, Spacing } from '@/constants/portal';
import { api, type ExamListItem } from '@/lib/api';

export default function ExamListScreen() {
  const router = useRouter();
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get<{ exams: ExamListItem[] }>('/exams');
    setExams(data.exams.filter((e) => e.published));
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
          badge="Assessment"
          title="Exams"
          subtitle="Select an exam to begin. You get one attempt per paper."
        />

        {loading ? (
          <ActivityIndicator style={styles.loader} color={PortalColors.accent} />
        ) : exams.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No exams published yet.</Text>
          </Card>
        ) : (
          exams.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => router.push(`/(student)/exam/${e.id}`)}
              style={({ pressed }) => [pressed && styles.cardPressed]}>
              <Card style={styles.examCard}>
                <Text style={styles.examTitle}>{e.title}</Text>
                <Text style={styles.examMeta}>
                  {e.questionCount} questions · {e.duration} min
                </Text>
                <Text style={styles.cta}>Open exam →</Text>
              </Card>
            </Pressable>
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
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  examCard: {
    marginBottom: Spacing.md,
  },
  cardPressed: {
    opacity: 0.92,
  },
  examTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PortalColors.navy,
  },
  examMeta: {
    fontSize: 14,
    color: PortalColors.muted,
    marginTop: 6,
  },
  cta: {
    marginTop: Spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: PortalColors.navy,
  },
});

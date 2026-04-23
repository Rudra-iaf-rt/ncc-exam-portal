import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/portal/card';
import { PageHeader } from '@/components/portal/page-header';
import { PortalColors, Spacing } from '@/constants/portal';
import { api, type ExamListItem } from '@/lib/api';

export default function StaffExamsScreen() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get<{ exams: ExamListItem[] }>('/exams');
    setExams(data.exams);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PortalColors.gold} />}>
        <PageHeader
          badge="Operational"
          title="Exam Registry"
          subtitle="Published assessments for cadets."
        />

        {loading ? (
          <ActivityIndicator color={PortalColors.gold} style={{ marginTop: 32 }} />
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} style={styles.card}>
              <Text style={styles.examTitle}>{exam.title}</Text>
              <Text style={styles.meta}>
                {exam.questionCount} questions · {exam.duration} minutes
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PortalColors.stone },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xl },
  card: { marginBottom: 12 },
  examTitle: { color: PortalColors.navy, fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 6, color: PortalColors.muted, fontSize: 13 },
});


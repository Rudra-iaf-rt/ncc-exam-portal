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
          subtitle="Drafts and published assessments."
        />

        {loading ? (
          <ActivityIndicator color={PortalColors.gold} style={{ marginTop: 32 }} />
        ) : (
          exams.map((exam) => (
            <Card key={exam.id} style={styles.card}>
              <View style={styles.titleRow}>
                <Text style={styles.examTitle}>{exam.title}</Text>
                <View style={[styles.statusPill, exam.published ? styles.statusPublished : styles.statusDraft]}>
                  <Text style={styles.statusText}>{exam.published ? 'Published' : 'Draft'}</Text>
                </View>
              </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  examTitle: { color: PortalColors.navy, fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 6, color: PortalColors.muted, fontSize: 13 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  statusDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: PortalColors.navy,
  },
});


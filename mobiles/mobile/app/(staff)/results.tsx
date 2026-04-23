import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/portal/card';
import { PageHeader } from '@/components/portal/page-header';
import { PortalColors, Spacing } from '@/constants/portal';
import { api, type StudentResultItem } from '@/lib/api';

export default function StaffResultsScreen() {
  const [results, setResults] = useState<StudentResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get<{ results: StudentResultItem[] }>('/results/admin');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PortalColors.gold} />}>
        <PageHeader
          badge="Personnel"
          title="Results Board"
          subtitle="Latest attempts submitted by cadets."
        />

        {loading ? (
          <ActivityIndicator color={PortalColors.gold} style={{ marginTop: 32 }} />
        ) : results.length === 0 ? (
          <Card>
            <Text style={styles.empty}>No result entries yet.</Text>
          </Card>
        ) : (
          results.map((r) => (
            <Card key={r.id} style={styles.card}>
              <Text style={styles.examTitle}>{r.examTitle}</Text>
              <Text style={styles.meta}>
                {r.studentName} · {r.score}%
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
  empty: { color: PortalColors.muted, textAlign: 'center', paddingVertical: 12 },
});


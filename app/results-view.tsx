import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BackHeader } from "../components/ui/BackHeader";
import { Card } from "../components/ui/Card";
import { Screen } from "../components/ui/Screen";
import { Colors, Spacing } from "../constants/theme";
import { useAuth } from "../context/auth-context";
import { api, getErrorMessage } from "../lib/api";

type ResultRow = {
  id: number;
  score: number;
  examId: number;
  examTitle: string | null;
};

export default function ResultsViewScreen() {
  const { token, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ results: ResultRow[] }>("/api/results/student");
      setRows(data.results);
    } catch (e) {
      setError(getErrorMessage(e, "Could not load results"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!authLoading && !token) {
    return <Redirect href="/login" />;
  }

  return (
    <Screen>
      <View style={styles.pad}>
        <BackHeader title="My results" />
        <Text style={styles.lead}>
          Scores from completed exams. Percentages are based on correct answers.
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
        ) : error ? (
          <Text style={styles.err}>{error}</Text>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load();
                }}
                tintColor={Colors.primary}
              />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>No results yet. Complete an exam to see scores here.</Text>
            }
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.iconBox}>
                    <Ionicons name="ribbon" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.examTitle} numberOfLines={2}>
                      {item.examTitle ?? `Exam #${item.examId}`}
                    </Text>
                    <Text style={styles.meta}>Exam ID · {item.examId}</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreText}>{item.score}%</Text>
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  lead: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  loader: { marginTop: 48 },
  err: { color: Colors.danger, marginTop: Spacing.md },
  list: { paddingBottom: 40, gap: Spacing.sm },
  card: { marginBottom: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1 },
  examTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scoreBox: {
    minWidth: 56,
    alignItems: "flex-end",
  },
  scoreText: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.primary,
  },
  empty: {
    textAlign: "center",
    color: Colors.textMuted,
    marginTop: 32,
    fontSize: 15,
    lineHeight: 22,
  },
});

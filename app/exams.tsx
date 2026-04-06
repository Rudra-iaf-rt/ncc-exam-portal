import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useRouter } from "expo-router";
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

type ExamItem = {
  id: number;
  title: string;
  duration: number;
  questionCount: number;
};

export default function ExamsScreen() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<{ exams: ExamItem[] }>("/api/exams");
      setExams(data.exams);
    } catch (e) {
      setError(getErrorMessage(e, "Could not load exams"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    void load();
  }

  if (!authLoading && !token) {
    return <Redirect href="/login" />;
  }

  return (
    <Screen>
      <View style={styles.pad}>
        <BackHeader title="Exams" />
        <Text style={styles.lead}>
          Select an exam to begin. You will have a timed attempt for each test.
        </Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
        ) : error ? (
          <Text style={styles.err}>{error}</Text>
        ) : (
          <FlatList
            data={exams}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>No exams available yet. Check back later.</Text>
            }
            renderItem={({ item }) => (
              <Card
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/exam/${item.id}`);
                }}
                style={styles.card}
              >
                <View style={styles.cardInner}>
                  <View style={styles.iconBox}>
                    <Ionicons name="timer-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMeta}>
                      {item.duration} min · {item.questionCount} questions
                    </Text>
                  </View>
                  <Ionicons name="play-circle" size={28} color={Colors.primary} />
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
  loader: {
    marginTop: 48,
  },
  err: {
    color: Colors.danger,
    marginTop: Spacing.md,
  },
  list: {
    paddingBottom: 40,
    gap: Spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  cardInner: {
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
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  cardMeta: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  empty: {
    textAlign: "center",
    color: Colors.textMuted,
    marginTop: 32,
    fontSize: 15,
  },
});

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { Colors, Radius, Spacing } from "../../constants/theme";
import { useAuth } from "../../context/auth-context";
import { api, getErrorMessage } from "../../lib/api";

type Question = {
  id: number;
  question: string;
  options: string[];
};

type ExamPayload = {
  id: number;
  title: string;
  duration: number;
  questions: Question[];
};

function formatClock(totalSeconds: number) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamScreen() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const examId = Number(params.id);

  const [exam, setExam] = useState<ExamPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const submitFnRef = useRef<() => Promise<void>>(async () => {});

  const submit = useCallback(async () => {
    if (submittedRef.current || !exam) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const body = {
        examId: exam.id,
        answers: exam.questions.map((q) => ({
          questionId: q.id,
          selectedAnswer: answers[q.id] ?? "",
        })),
      };
      const { data } = await api.post<{ score: number; correct: number; total: number }>(
        "/api/exams/submit",
        body
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/result",
        params: {
          score: String(data.score),
          correct: String(data.correct),
          total: String(data.total),
          examTitle: exam.title,
        },
      });
    } catch (e) {
      submittedRef.current = false;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoadError(getErrorMessage(e, "Submit failed"));
    } finally {
      setSubmitting(false);
    }
  }, [exam, answers, router]);

  submitFnRef.current = submit;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(examId)) {
        setLoadError("Invalid exam");
        return;
      }
      try {
        await api.post("/api/attempt/start", { examId });
        const { data } = await api.get<ExamPayload>(`/api/exams/${examId}`);
        if (cancelled) return;
        setExam(data);
      } catch (e) {
        if (!cancelled) setLoadError(getErrorMessage(e, "Could not load exam"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  useEffect(() => {
    if (!exam) return;
    let alive = true;
    submittedRef.current = false;
    const total = Math.max(1, exam.duration * 60);
    setSecondsLeft(total);
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          if (alive) {
            queueMicrotask(() => void submitFnRef.current());
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [exam]);

  if (!authLoading && !token) {
    return <Redirect href="/login" />;
  }

  if (loadError && !exam) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centerPad}>
          <Text style={styles.errTitle}>Unable to open exam</Text>
          <Text style={styles.errText}>{loadError}</Text>
          <PrimaryButton label="Go back" onPress={() => router.back()} style={styles.errBtn} />
        </View>
      </SafeAreaView>
    );
  }

  if (!exam) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.centerOnly}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Preparing your attempt…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const lowTime = secondsLeft > 0 && secondsLeft <= 60;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="close" size={26} color={Colors.textMuted} />
        </Pressable>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exam.title}
          </Text>
        </View>
        <View
          style={[
            styles.timerChip,
            lowTime && styles.timerWarn,
            secondsLeft === 0 && styles.timerDone,
          ]}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={lowTime ? Colors.danger : Colors.primary}
          />
          <Text
            style={[
              styles.timerText,
              lowTime && { color: Colors.danger },
            ]}
          >
            {formatClock(secondsLeft)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.instructions}>
          Select the best option for each question. Your attempt submits automatically when the
          timer reaches zero.
        </Text>

        {exam.questions.map((q, index) => (
          <View key={q.id} style={styles.qBlock}>
            <Text style={styles.qIndex}>
              Question {index + 1} of {exam.questions.length}
            </Text>
            <Text style={styles.qText}>{q.question}</Text>
            <View style={styles.options}>
              {q.options.map((opt) => {
                const selected = answers[q.id] === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setAnswers((prev) => ({ ...prev, [q.id]: opt }));
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <View
                      style={[styles.radioOuter, selected && styles.radioOuterSelected]}
                    >
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={styles.optionLabel}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {loadError ? <Text style={styles.inlineErr}>{loadError}</Text> : null}

        <PrimaryButton
          label={submitting ? "Submitting…" : "Submit exam"}
          loading={submitting}
          onPress={() => void submit()}
          style={styles.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerOnly: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: 15,
  },
  centerPad: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "center",
  },
  errTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
  },
  errText: {
    color: Colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  errBtn: {
    alignSelf: "flex-start",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  headerMid: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
  },
  timerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.timerBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  timerWarn: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  timerDone: {
    opacity: 0.6,
  },
  timerText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  instructions: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  qBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qIndex: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  qText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionPressed: {
    opacity: 0.9,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  inlineErr: {
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
});

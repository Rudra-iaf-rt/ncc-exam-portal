import { useNavigation, usePreventRemove } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/portal/primary-button';
import { PortalColors, Radius, Spacing, getShadow } from '@/constants/portal';
import { getErrorMessage } from '@/lib/api';
import {
  fetchExamById,
  startExamAttempt,
  submitExam,
  type ExamDetail,
  type SubmitExamResponse,
} from '@/lib/examApi';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ExamCompletePayload = SubmitExamResponse & { examId: number; examTitle: string };

export type ExamScreenProps = {
  examId: number;
  onComplete: (result: ExamCompletePayload) => void;
  onFatalError: (message: string) => void;
};

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function ExamScreen({ examId, onComplete, onFatalError }: ExamScreenProps) {
  const navigation = useNavigation();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const bg = dark ? '#0f172a' : '#f8fafc';

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamDetail | null>(null);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  /** When false, user can leave (after submit or programmatic navigation). */
  const [guardNavigation, setGuardNavigation] = useState(true);

  const submittedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const runSubmitRef = useRef<(reason: 'user' | 'timer' | 'cheat') => Promise<void>>(async () => {});

  const runSubmit = useCallback(
    async (reason: 'user' | 'timer' | 'cheat') => {
      if (submittedRef.current || !exam) return;
      submittedRef.current = true;
      setGuardNavigation(false);
      setSubmitting(true);

      const payload = Object.entries(answers).map(([qid, selectedAnswer]) => ({
        questionId: Number(qid),
        selectedAnswer,
      }));

      try {
        const data = await submitExam(examId, payload);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete({ ...data, examId, examTitle: exam.title });
      } catch (e) {
        submittedRef.current = false;
        setGuardNavigation(true);
        setSubmitting(false);
        const msg = getErrorMessage(e, 'Submit failed');
        if (reason === 'user') {
          Alert.alert('Submit failed', msg);
        } else {
          onFatalError(msg);
        }
      }
    },
    [answers, exam, examId, onComplete, onFatalError]
  );

  runSubmitRef.current = runSubmit;

  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
      headerBackVisible: false,
    });
  }, [navigation]);

  usePreventRemove(guardNavigation, () => {
    Alert.alert(
      'Cannot go back during exam',
      'You cannot leave until you submit or the timer ends.',
      [{ text: 'OK', style: 'cancel' }]
    );
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!guardNavigation) return false;
      Alert.alert(
        'Cannot go back during exam',
        'Use Submit when you are finished, or wait for the timer to end.',
        [{ text: 'OK', style: 'default' }]
      );
      return true;
    });
    return () => sub.remove();
  }, [guardNavigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const [detail] = await Promise.all([fetchExamById(examId), startExamAttempt(examId)]);
        if (cancelled) return;
        setExam(detail);
        setTimeLeft(Math.max(1, detail.duration * 60));
        setAnswers({});
      } catch (e) {
        if (!cancelled) {
          setLoadError(getErrorMessage(e, 'Failed to load exam'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  useEffect(() => {
    if (loading || !exam || submittedRef.current) return;

    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          queueMicrotask(() => {
            void runSubmitRef.current('timer');
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [loading, exam?.id]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (submittedRef.current || !exam) return;

      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev === 'active' && (next === 'background' || next === 'inactive')) {
        setViolations((v) => {
          const n = v + 1;
          if (n === 1) {
            Alert.alert(
              'Warning',
              'Leaving the exam is flagged. If it happens again, your exam will be submitted automatically.',
              [{ text: 'I understand', style: 'default' }]
            );
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          } else if (n >= 2) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            void runSubmitRef.current('cheat');
          }
          return n;
        });
      }
    });

    return () => sub.remove();
  }, [exam]);

  function selectOption(questionId: number, option: string) {
    if (submittedRef.current || submitting) return;
    setAnswers((a) => ({ ...a, [questionId]: option }));
  }

  function onPressSubmit() {
    if (submittedRef.current || submitting) return;
    Alert.alert('Submit exam', 'Submit your answers? You cannot change them after.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        style: 'destructive',
        onPress: () => void runSubmit('user'),
      },
    ]);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={PortalColors.accent} />
        <Text style={styles.loadingText}>Loading exam…</Text>
      </View>
    );
  }

  if (loadError || !exam) {
    return (
      <View style={[styles.center, { backgroundColor: bg, padding: Spacing.lg }]}>
        <Text style={styles.errorText}>{loadError ?? 'Exam unavailable'}</Text>
      </View>
    );
  }

  const urgent = timeLeft <= 60 && timeLeft > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top']}>
      <View style={[styles.timerBar, urgent && styles.timerUrgent, getShadow(2)]}>
        <Text style={styles.timerLabel}>Time left</Text>
        <Text style={[styles.timerValue, urgent && styles.timerValueUrgent]}>
          {formatTime(timeLeft)}
        </Text>
        {violations > 0 ? (
          <Text style={styles.violationHint}>Alerts: {violations}</Text>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: dark ? '#f8fafc' : PortalColors.navy }]}>
          {exam.title}
        </Text>
        <Text style={styles.meta}>
          {exam.questions.length} questions · {exam.duration} min allowed
        </Text>

        {exam.questions.map((q, index) => (
          <View
            key={q.id}
            style={[
              styles.card,
              {
                backgroundColor: dark ? PortalColors.cardDark : '#fff',
                borderColor: dark ? PortalColors.borderDark : PortalColors.border,
              },
              getShadow(1),
            ]}>
            <Text style={styles.qIndex}>Question {index + 1}</Text>
            <Text style={[styles.qText, { color: dark ? '#e2e8f0' : PortalColors.navy }]}>
              {q.question}
            </Text>
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => selectOption(q.id, opt)}
                  disabled={submitting}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? PortalColors.accent : dark ? '#334155' : PortalColors.border,
                      backgroundColor: selected
                        ? 'rgba(37, 99, 235, 0.12)'
                        : dark
                          ? 'transparent'
                          : '#fafafa',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.optionText,
                      { color: dark ? '#e2e8f0' : PortalColors.slate },
                    ]}>
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: dark ? '#0f172a' : '#fff',
            borderTopColor: dark ? '#1e293b' : PortalColors.border,
          },
        ]}>
        <PrimaryButton
          title={submitting ? 'Submitting…' : 'Submit exam'}
          onPress={onPressSubmit}
          loading={submitting}
          disabled={submitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: PortalColors.muted,
  },
  errorText: {
    color: PortalColors.danger,
    textAlign: 'center',
    fontSize: 15,
  },
  timerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PortalColors.border,
  },
  timerUrgent: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  timerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: PortalColors.muted,
  },
  timerValue: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: PortalColors.navy,
  },
  timerValueUrgent: {
    color: PortalColors.danger,
  },
  violationHint: {
    fontSize: 11,
    color: PortalColors.danger,
    fontWeight: '600',
  },
  scroll: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    color: PortalColors.muted,
    marginBottom: Spacing.lg,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  qIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: PortalColors.accent,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  qText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  option: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    borderTopWidth: 1,
  },
});

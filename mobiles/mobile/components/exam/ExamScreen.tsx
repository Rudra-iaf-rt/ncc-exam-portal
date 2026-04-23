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
  saveAttemptAnswer,
  startExamAttempt,
  submitExam,
  type ExamDetail,
  type SubmitExamResponse,
} from '@/lib/examApi';

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

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamDetail | null>(null);

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [savingStep, setSavingStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [guardNavigation, setGuardNavigation] = useState(true);

  const submittedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        'Use Next/Previous to navigate questions. Submit when finished.',
        [{ text: 'OK', style: 'default' }]
      );
      return true;
    });
    return () => sub.remove();
  }, [guardNavigation]);

  const runSubmit = useCallback(
    async (reason: 'user' | 'timer' | 'cheat') => {
      if (submittedRef.current || !exam) return;
      submittedRef.current = true;
      setGuardNavigation(false);
      setSubmitting(true);

      try {
        // Final score is computed from persisted attempt state on server.
        const data = await submitExam(examId);
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
    [exam, examId, onComplete, onFatalError]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const state = await startExamAttempt(examId);
        if (cancelled) return;

        setExam(state.exam);
        setTimeLeft(Math.max(1, state.exam.duration * 60));
        const restored = state.answers ?? {};
        const mapped = Object.fromEntries(
          Object.entries(restored).map(([k, v]) => [Number(k), String(v ?? '')])
        );
        setAnswers(mapped as Record<number, string>);

        const maxIdx = Math.max(0, state.exam.questions.length - 1);
        setCurrentIndex(Math.min(Math.max(0, state.currentQuestionIndex ?? 0), maxIdx));
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
            void runSubmit('timer');
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [loading, exam?.id, runSubmit]);

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
            void runSubmit('cheat');
          }
          return n;
        });
      }
    });

    return () => sub.remove();
  }, [exam, runSubmit]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, []);

  function selectOption(questionId: number, option: string) {
    if (submittedRef.current || submitting || savingStep) return;
    setAnswers((a) => ({ ...a, [questionId]: option }));
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    setSaveState('saving');
    autosaveTimerRef.current = setTimeout(async () => {
      if (submittedRef.current || submitting) return;
      try {
        await saveAttemptAnswer({
          examId,
          questionId,
          selectedAnswer: option,
          nextQuestionIndex: currentIndex,
        });
        setLastSavedAt(Date.now());
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 500);
  }

  async function persistAndMove(nextIndex: number) {
    if (!exam) return;
    const q = exam.questions[currentIndex];
    if (!q) return;
    const selected = answers[q.id];
    if (!selected?.trim()) {
      Alert.alert('Answer required', 'Please select an option before proceeding.');
      return;
    }

    setSavingStep(true);
    setSaveState('saving');
    try {
      const saved = await saveAttemptAnswer({
        examId,
        questionId: q.id,
        selectedAnswer: selected,
        nextQuestionIndex: nextIndex,
      });
      const mapped = Object.fromEntries(
        Object.entries(saved.answers ?? {}).map(([k, v]) => [Number(k), String(v ?? '')])
      );
      setAnswers(mapped as Record<number, string>);
      setCurrentIndex(saved.currentQuestionIndex);
      setLastSavedAt(Date.now());
      setSaveState('saved');
    } catch (e) {
      setSaveState('error');
      Alert.alert('Save failed', getErrorMessage(e, 'Could not save answer.'));
    } finally {
      setSavingStep(false);
    }
  }

  function onPressPrevious() {
    if (!exam || savingStep || submitting) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const prev = Math.max(0, currentIndex - 1);
    setCurrentIndex(prev);
  }

  function onPressNext() {
    if (!exam || savingStep || submitting) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const next = Math.min(exam.questions.length - 1, currentIndex + 1);
    void persistAndMove(next);
  }

  function onPressSubmit() {
    if (!exam || savingStep || submitting) return;
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const q = exam.questions[currentIndex];
    const selected = q ? answers[q.id] : null;

    const doSubmit = async () => {
      if (q && selected?.trim()) {
        await persistAndMove(currentIndex);
      }
      await runSubmit('user');
    };

    Alert.alert('Submit exam', 'Submit your answers? You cannot change them after.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        style: 'destructive',
        onPress: () => void doSubmit(),
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PortalColors.navy} />
        <Text style={styles.loadingText}>Loading exam…</Text>
      </View>
    );
  }

  if (loadError || !exam) {
    return (
      <View style={[styles.center, { padding: Spacing.lg }]}>
        <Text style={styles.errorText}>{loadError ?? 'Exam unavailable'}</Text>
      </View>
    );
  }

  const q = exam.questions[currentIndex];
  const urgent = timeLeft <= 60 && timeLeft > 0;
  const saveHint =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? lastSavedAt
          ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
          : 'Saved'
        : saveState === 'error'
          ? 'Save failed — retry on next step'
          : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.timerBar, urgent && styles.timerUrgent, getShadow(2)]}>
        <Text style={styles.timerLabel}>Time left</Text>
        <Text style={[styles.timerValue, urgent && styles.timerValueUrgent]}>
          {formatTime(timeLeft)}
        </Text>
        {violations > 0 ? <Text style={styles.violationHint}>Alerts: {violations}</Text> : null}
      </View>
      {saveHint ? (
        <View style={styles.saveBar}>
          <Text style={[styles.saveText, saveState === 'error' && styles.saveTextError]}>{saveHint}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{exam.title}</Text>
        <Text style={styles.meta}>
          Question {currentIndex + 1} of {exam.questions.length}
        </Text>

        <View style={[styles.card, getShadow(1)]}>
          <Text style={styles.qIndex}>Question {currentIndex + 1}</Text>
          <Text style={styles.qText}>{q.question}</Text>
          {q.options.map((opt) => {
            const selected = answers[q.id] === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => selectOption(q.id, opt)}
                disabled={savingStep || submitting}
                style={[
                  styles.option,
                  {
                    borderColor: selected ? PortalColors.navy : PortalColors.border,
                    backgroundColor: selected ? 'rgba(44, 68, 110, 0.12)' : PortalColors.parchment,
                  },
                ]}>
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.row}>
          <PrimaryButton
            title="Previous"
            onPress={onPressPrevious}
            variant="outline"
            disabled={currentIndex === 0 || savingStep || submitting}
            style={{ flex: 1 }}
          />
          {currentIndex < exam.questions.length - 1 ? (
            <PrimaryButton
              title={savingStep ? 'Saving…' : 'Next'}
              onPress={onPressNext}
              loading={savingStep}
              disabled={savingStep || submitting}
              style={{ flex: 1 }}
            />
          ) : (
            <PrimaryButton
              title={submitting ? 'Submitting…' : 'Submit exam'}
              onPress={onPressSubmit}
              loading={submitting}
              disabled={savingStep || submitting}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PortalColors.stone },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: PortalColors.stone,
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
    backgroundColor: PortalColors.cardLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PortalColors.border,
  },
  timerUrgent: {
    backgroundColor: 'rgba(139, 26, 26, 0.08)',
  },
  saveBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    backgroundColor: 'rgba(44, 68, 110, 0.08)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: PortalColors.border,
  },
  saveText: {
    fontSize: 12,
    color: PortalColors.navySoft,
    fontWeight: '600',
  },
  saveTextError: {
    color: PortalColors.danger,
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
    color: PortalColors.navy,
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
    borderColor: PortalColors.border,
    backgroundColor: PortalColors.cardLight,
    padding: Spacing.md,
  },
  qIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: PortalColors.navySoft,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  qText: {
    fontSize: 16,
    lineHeight: 24,
    color: PortalColors.navy,
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
    color: PortalColors.slate,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.md,
    borderTopWidth: 1,
    borderTopColor: PortalColors.border,
    backgroundColor: PortalColors.cardLight,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});

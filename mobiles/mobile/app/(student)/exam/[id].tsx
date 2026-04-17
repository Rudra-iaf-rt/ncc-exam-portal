import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ExamScreen } from '@/components/exam/ExamScreen';
import { PrimaryButton } from '@/components/portal/primary-button';
import { PortalColors, Spacing } from '@/constants/portal';
import type { ExamCompletePayload } from '@/components/exam/ExamScreen';

export default function ExamRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const examId = Number(id);

  const onComplete = useCallback(
    (result: ExamCompletePayload) => {
      router.replace({
        pathname: '/(student)/exam/result',
        params: {
          examId: String(result.examId),
          score: String(result.score),
          total: String(result.total),
          correct: String(result.correct),
          examTitle: result.examTitle,
        },
      });
    },
    [router]
  );

  const onFatalError = useCallback(
    (message: string) => {
      Alert.alert('Exam error', message, [
        { text: 'OK', onPress: () => router.replace('/(student)/exam') },
      ]);
    },
    [router]
  );

  if (!Number.isFinite(examId)) {
    return (
      <View style={styles.bad}>
        <Text style={styles.badText}>Invalid exam</Text>
        <PrimaryButton title="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  return <ExamScreen examId={examId} onComplete={onComplete} onFatalError={onFatalError} />;
}

const styles = StyleSheet.create({
  bad: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: '#f8fafc',
  },
  badText: {
    color: PortalColors.danger,
    marginBottom: Spacing.md,
    fontSize: 16,
    textAlign: 'center',
  },
});

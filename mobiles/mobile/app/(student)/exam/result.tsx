import { useLocalSearchParams } from 'expo-router';

import { ResultScreen } from '@/components/exam/ResultScreen';

export default function ExamResultRoute() {
  const { score, total, correct, examTitle } = useLocalSearchParams<{
    score?: string;
    total?: string;
    correct?: string;
    examTitle?: string;
  }>();

  const s = Number(score ?? 0);
  const t = Number(total ?? 0);
  const c = correct != null && correct !== '' ? Number(correct) : undefined;

  return (
    <ResultScreen
      score={Number.isFinite(s) ? s : 0}
      total={Number.isFinite(t) ? t : 0}
      correct={c !== undefined && Number.isFinite(c) ? c : undefined}
      examTitle={typeof examTitle === 'string' ? examTitle : undefined}
    />
  );
}

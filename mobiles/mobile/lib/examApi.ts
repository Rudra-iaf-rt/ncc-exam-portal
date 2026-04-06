/**
 * Exam module API — uses shared axios instance (JWT from AsyncStorage via auth context).
 */
import { api } from '@/lib/api';

export type ExamQuestion = {
  id: number;
  question: string;
  options: string[];
};

export type ExamDetail = {
  id: number;
  title: string;
  duration: number;
  questions: ExamQuestion[];
};

export type StartAttemptResponse = {
  attemptId: number;
  exam: ExamDetail;
};

export type AnswerEntry = {
  questionId: number;
  selectedAnswer: string;
};

export type SubmitExamResponse = {
  score: number;
  correct: number;
  total: number;
};

export async function fetchExamById(examId: number): Promise<ExamDetail> {
  const { data } = await api.get<ExamDetail>(`/exams/${examId}`);
  return data;
}

export async function startExamAttempt(examId: number): Promise<StartAttemptResponse> {
  const { data } = await api.post<StartAttemptResponse>('/attempt/start', { examId });
  return data;
}

export async function submitExam(
  examId: number,
  answers: AnswerEntry[]
): Promise<SubmitExamResponse> {
  const { data } = await api.post<SubmitExamResponse>('/exams/submit', {
    examId,
    answers,
  });
  return data;
}

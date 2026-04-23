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
  answers?: Record<string, string>;
  currentQuestionIndex?: number;
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

export type SaveAnswerResponse = {
  answers: Record<string, string>;
  currentQuestionIndex: number;
  answeredCount: number;
  totalQuestions: number;
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
  answers?: AnswerEntry[]
): Promise<SubmitExamResponse> {
  const body = answers ? { examId, answers } : { examId };
  const { data } = await api.post<SubmitExamResponse>('/exams/submit', body);
  return data;
}

export async function saveAttemptAnswer(payload: {
  examId: number;
  questionId: number;
  selectedAnswer: string;
  nextQuestionIndex: number;
}): Promise<SaveAnswerResponse> {
  const { data } = await api.post<SaveAnswerResponse>('/attempt/answer', payload);
  return data;
}

import axios, { type AxiosError } from 'axios';

import { getApiBaseUrl } from '@/lib/config';
import { ReactNode } from 'react';

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

export type ApiUser = {
  id: number;
  name: string;
  regimentalNumber: string | null;
  email: string | null;
  role: string;
  college: string;
};

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const ax = err as AxiosError<{ error?: string }>;
  return ax.response?.data?.error ?? ax.message ?? fallback;
}

export type ExamListItem = {
  id: number;
  title: string;
  duration: number;
  questionCount: number;
  published?: boolean;
  publishedAt?: string | null;
};

export type StudentResultItem = {
  studentName: ReactNode;
  id: number;
  score: number;
  examId: number;
  examTitle: string;
};

import { api } from '../lib/api'
import type { AttemptStartResponse } from '../types'

export async function startAttempt(examId: number) {
  const { data } = await api.post<AttemptStartResponse>('/attempt/start', { examId })
  return data
}

export async function submitAttempt(
  examId: number,
  answers: Array<{ questionId: number; selectedAnswer: string }>,
) {
  const { data } = await api.post<{ score: number; correct: number; total: number }>(
    '/attempt/submit',
    {
      examId,
      answers,
    },
  )
  return data
}

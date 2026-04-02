import { api } from '../lib/api'
import type { CreateExamPayload } from '../types'

export async function createExam(payload: CreateExamPayload) {
  const { data } = await api.post('/exams/create', payload)
  return data
}

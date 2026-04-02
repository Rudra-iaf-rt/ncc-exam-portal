export type User = {
  id: number
  name: string
  email: string | null
  regimentalNumber: string | null
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  college: string
}

export type LoginResponse = {
  token: string
  user: User
}

export type QuestionInput = {
  question: string
  options: string[]
  answer: string
}

export type CreateExamPayload = {
  title: string
  duration: number
  questions: QuestionInput[]
}

export type ResultRow = {
  id: number
  score: number
  examId: number
  examTitle: string
  studentId?: number
  studentName?: string | null
  regimentalNumber?: string | null
  college?: string | null
}

export type ExamQuestion = {
  id: number
  question: string
  options: string[]
}

export type AttemptStartResponse = {
  attemptId: number
  exam: {
    id: number
    title: string
    duration: number
    questions: ExamQuestion[]
  }
}

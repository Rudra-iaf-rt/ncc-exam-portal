import { FormEvent, useEffect, useMemo, useState } from 'react'
import { startAttempt, submitAttempt } from '../services/attemptService'
import type { AttemptStartResponse } from '../types'

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function ExamAttemptPage() {
  const [examId, setExamId] = useState<number | ''>('')
  const [attempt, setAttempt] = useState<AttemptStartResponse | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ score: number; correct: number; total: number } | null>(
    null,
  )

  useEffect(() => {
    if (!attempt) return
    if (secondsLeft <= 0) return
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [attempt, secondsLeft])

  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  )

  async function onStart(event: FormEvent) {
    event.preventDefault()
    if (examId === '') return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await startAttempt(examId)
      setAttempt(data)
      setAnswers({})
      setSecondsLeft(data.exam.duration * 60)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Unable to start exam.')
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit() {
    if (!attempt) return
    setSubmitting(true)
    setError('')
    try {
      const payload = attempt.exam.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] ?? '',
      }))
      const data = await submitAttempt(attempt.exam.id, payload)
      setResult(data)
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Unable to submit exam.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-content">
      <div className="card">
        <div className="section-head">
          <h3>Exam Attempt UI</h3>
          <p className="muted">
            Card-based questions, selected answer highlight, sticky timer and sticky submit.
          </p>
        </div>

        <form className="actions" onSubmit={onStart}>
          <input
            className="input"
            type="number"
            min={1}
            placeholder="Enter Exam ID"
            value={examId}
            onChange={(e) => setExamId(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Starting...' : 'Start Exam'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </div>

      {attempt ? (
        <>
          <div className="timer-sticky">
            <span>Time Left</span>
            <strong>{formatTime(secondsLeft)}</strong>
          </div>

          <div className="stack">
            {attempt.exam.questions.map((q, index) => (
              <div className="question-attempt-card" key={q.id}>
                <h4>
                  Q{index + 1}. {q.question}
                </h4>
                <div className="options-list">
                  {q.options.map((opt) => {
                    const selected = answers[q.id] === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        className={`option-btn ${selected ? 'option-selected' : ''}`}
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: opt,
                          }))
                        }
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="submit-sticky">
            <p className="muted">
              Answered {answeredCount}/{attempt.exam.questions.length}
            </p>
            <button className="btn" onClick={onSubmit} disabled={submitting || secondsLeft === 0}>
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>

          {result ? (
            <div className="card">
              <h3>Result</h3>
              <p className="success">
                Score: {result.score}% ({result.correct}/{result.total})
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}


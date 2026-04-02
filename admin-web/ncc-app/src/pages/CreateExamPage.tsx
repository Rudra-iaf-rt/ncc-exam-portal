import { FormEvent, useState } from 'react'
import { createExam } from '../services/examService'

type FormQuestion = {
  question: string
  options: string[]
  answer: string
}

const emptyQuestion = (): FormQuestion => ({
  question: '',
  options: ['', '', '', ''],
  answer: '',
})

export function CreateExamPage() {
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(30)
  const [questions, setQuestions] = useState<FormQuestion[]>([emptyQuestion()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function updateQuestion(
    index: number,
    key: keyof FormQuestion,
    value: string | string[],
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [key]: value } : q)),
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const normalizedQuestions = questions.map((q, idx) => {
        const questionText = q.question.trim()
        const options = q.options.map((o) => o.trim()).filter(Boolean)
        const answer = q.answer.trim()

        if (!questionText) {
          throw new Error(`Question ${idx + 1}: question text is required.`)
        }
        if (options.length < 2) {
          throw new Error(`Question ${idx + 1}: provide at least 2 options.`)
        }
        if (!answer) {
          throw new Error(`Question ${idx + 1}: correct answer is required.`)
        }
        if (!options.includes(answer)) {
          throw new Error(
            `Question ${idx + 1}: correct answer must match one of the options.`,
          )
        }

        return {
          question: questionText,
          options,
          answer,
        }
      })

      await createExam({
        title: title.trim(),
        duration,
        questions: normalizedQuestions,
      })

      setSuccess('Exam created successfully.')
      setTitle('')
      setDuration(30)
      setQuestions([emptyQuestion()])
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? 'Unable to create exam.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="section-head">
        <h3>Create Exam</h3>
        <p className="muted">Set title, duration, and questions with options and answers.</p>
      </div>

      <form onSubmit={onSubmit} className="stack">
        <label className="label">Exam Title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Mid Term - NCC Basics"
          required
        />

        <label className="label">Duration (minutes)</label>
        <input
          className="input"
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          required
        />

        {questions.map((question, index) => (
          <div key={index} className="question-card">
            <h4>Question {index + 1}</h4>
            <input
              className="input"
              placeholder="Enter question"
              value={question.question}
              onChange={(e) => updateQuestion(index, 'question', e.target.value)}
              required
            />

            <div className="grid-two">
              {question.options.map((option, optionIndex) => (
                <input
                  key={optionIndex}
                  className="input"
                  placeholder={`Option ${optionIndex + 1}`}
                  value={option}
                  onChange={(e) => {
                    const next = [...question.options]
                    next[optionIndex] = e.target.value
                    updateQuestion(index, 'options', next)
                  }}
                  required
                />
              ))}
            </div>

            <input
              className="input"
              placeholder="Correct answer (must match one option)"
              value={question.answer}
              onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
              required
            />
          </div>
        ))}

        <div className="actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}
          >
            Add Question
          </button>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Create Exam'}
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {success ? <p className="success">{success}</p> : null}
      </form>
    </div>
  )
}

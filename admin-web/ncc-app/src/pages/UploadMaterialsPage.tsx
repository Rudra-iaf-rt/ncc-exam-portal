import { FormEvent, useEffect, useState } from 'react'
import { api } from '../lib/api'

type ExamRow = {
  id: number
  title: string
  duration: number
  questionCount: number
}

export function UploadMaterialsPage() {
  const [exams, setExams] = useState<ExamRow[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [examError, setExamError] = useState('')

  const [examId, setExamId] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    async function loadExams() {
      setLoadingExams(true)
      setExamError('')
      try {
        // Backend returns exam list to authenticated users
        const { data } = await api.get<{ exams: ExamRow[] }>('/exams')
        setExams(data.exams)
      } catch (err: any) {
        setExamError(err?.response?.data?.error ?? 'Unable to load exams.')
      } finally {
        setLoadingExams(false)
      }
    }
    void loadExams()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus(null)

    if (!file) {
      setStatus({ type: 'error', msg: 'Please choose a file to upload.' })
      return
    }
    if (examId === '') {
      setStatus({ type: 'error', msg: 'Please select an exam.' })
      return
    }
    if (!title.trim()) {
      setStatus({ type: 'error', msg: 'Please enter a material title.' })
      return
    }

    // NOTE: Your current backend does not implement a materials upload endpoint.
    // This UI is ready; once the backend endpoint is added, wire the axios call here.
    // For now we fail gracefully (to avoid silent UI lying).
    setStatus({
      type: 'error',
      msg: 'Materials upload is not implemented on the backend yet. Please add an API endpoint to handle file uploads.',
    })
  }

  return (
    <div className="card">
      <div className="section-head">
        <h3>Upload Materials</h3>
        <p className="muted">Attach a learning resource to an exam (UI-ready).</p>
      </div>

      {loadingExams ? <p className="muted">Loading exams...</p> : null}
      {examError ? <p className="error">{examError}</p> : null}

      <form onSubmit={onSubmit} className="stack">
        <label className="label">Exam</label>
        <select
          className="input"
          value={examId}
          onChange={(e) => setExamId(e.target.value === '' ? '' : Number(e.target.value))}
          required
        >
          <option value="">Select an exam</option>
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.title}
            </option>
          ))}
        </select>

        <label className="label">Material Title</label>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="E.g., Module 1 Notes"
          required
        />

        <label className="label">File</label>
        <input
          className="input"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />

        {file ? <p className="muted">Selected: {file.name}</p> : null}

        <div className="actions">
          <button className="btn" type="submit">
            Upload
          </button>
        </div>

        {status ? (
          <p className={status.type === 'error' ? 'error' : 'success'}>{status.msg}</p>
        ) : null}
      </form>
    </div>
  )
}


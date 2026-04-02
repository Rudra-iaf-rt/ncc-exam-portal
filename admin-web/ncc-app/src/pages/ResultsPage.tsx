import { useEffect, useState } from 'react'
import { getAdminResults } from '../services/resultsService'
import type { ResultRow } from '../types'

export function ResultsPage() {
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadResults() {
      setLoading(true)
      setError('')
      try {
        const data = await getAdminResults()
        setRows(data)
      } catch (err: any) {
        setError(err?.response?.data?.error ?? 'Unable to fetch results.')
      } finally {
        setLoading(false)
      }
    }
    void loadResults()
  }, [])

  return (
    <div className="card">
      <div className="section-head">
        <h3>Exam Results</h3>
        <p className="muted">Review performance across all students and exams.</p>
      </div>

      {loading ? <p className="muted">Loading results...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !error ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Student</th>
                <th>Regimental No.</th>
                <th>College</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    No results available yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.examTitle}</td>
                    <td>{row.studentName ?? '-'}</td>
                    <td>{row.regimentalNumber ?? '-'}</td>
                    <td>{row.college ?? '-'}</td>
                    <td>
                      <span className="score-pill">{row.score}%</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

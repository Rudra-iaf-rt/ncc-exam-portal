import { useEffect, useState } from 'react'
import { getAdminResults } from '../services/resultsService'
import type { ResultRow } from '../types'

export function DashboardHomePage() {
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const all = await getAdminResults()
        setRows(all.slice(0, 8))
      } catch (err: any) {
        setError(err?.response?.data?.error ?? 'Unable to load dashboard.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="page-content">
      <div className="card">
        <div className="section-head">
          <h3>Overview</h3>
          <p className="muted">Quick access to admin actions and recent results.</p>
        </div>

        <div className="quick-grid">
          <div className="quick-tile">
            <div className="quick-title">Create Exams</div>
            <div className="quick-subtitle">Add MCQs and set answers.</div>
          </div>
          <div className="quick-tile">
            <div className="quick-title">View Results</div>
            <div className="quick-subtitle">Track student performance.</div>
          </div>
          <div className="quick-tile">
            <div className="quick-title">Upload Materials</div>
            <div className="quick-subtitle">Attach learning resources (UI-ready).</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-head">
          <h3>Recent Results</h3>
          <p className="muted">Latest submitted scores (up to 8 rows).</p>
        </div>

        {loading ? <p className="muted">Loading...</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {!loading && !error ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Exam</th>
                  <th>Student</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty-cell">
                      No results yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.examTitle}</td>
                      <td>{r.studentName ?? '-'}</td>
                      <td>
                        <span className="score-pill">{r.score}%</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  )
}


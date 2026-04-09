import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../lib/api';
import { PageHeader } from '../components/Shared';
import { Download, Search, Filter } from 'lucide-react';
import '../admin.css';

export default function ResultsBoard() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ college: '', exam: '', search: '' });

  useEffect(() => {
    async function fetchResults() {
      const { data } = await apiFetch('/results/admin');
      if (data) setResults(data.results);
      setLoading(false);
    }
    fetchResults();
  }, []);

  // Filter options
  const colleges = useMemo(() => [...new Set(results.map(r => r.college))].sort(), [results]);
  const exams = useMemo(() => [...new Set(results.map(r => r.examTitle))].sort(), [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesCollege = !filters.college || r.college === filters.college;
      const matchesExam = !filters.exam || r.examTitle === filters.exam;
      const matchesSearch = !filters.search || 
        r.studentName.toLowerCase().includes(filters.search.toLowerCase()) ||
        r.regimentalNumber.toLowerCase().includes(filters.search.toLowerCase());
      return matchesCollege && matchesExam && matchesSearch;
    });
  }, [results, filters]);

  const exportCSV = () => {
    const headers = ['Student Name', 'Regimental No', 'College', 'Exam', 'Score (%)'];
    const rows = filteredResults.map(r => [r.studentName, r.regimentalNumber, r.college, r.examTitle, r.score]);
    const content = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NCC_Results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <div style={{ color: 'var(--ink-4)', padding: '40px', fontFamily: 'var(--f-mono)', fontSize: '13px' }}>Loading exam results...</div>;

  return (
    <div>
      <PageHeader 
        title="Exam *Results*" 
        subtitle="Detailed score reports for all cadets and examinations."
        action={
          <button className="adm-btn adm-btn-primary" onClick={exportCSV} disabled={filteredResults.length === 0}>
            <Download size={16} strokeWidth={1.5} />
            <span>Export Report (CSV)</span>
          </button>
        }
      />

      {/* Filters Area */}
      <div className="adm-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', padding: '20px' }}>
        <div className="adm-form-group" style={{ marginBottom: 0 }}>
          <label className="adm-label">Filter by College</label>
          <div style={{ position: 'relative' }}>
            <select 
              className="adm-input" 
              value={filters.college}
              onChange={(e) => setFilters({ ...filters, college: e.target.value })}
            >
              <option value="">All Colleges</option>
              {colleges.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="adm-form-group" style={{ marginBottom: 0 }}>
          <label className="adm-label">Filter by Exam</label>
          <select 
            className="adm-input" 
            value={filters.exam}
            onChange={(e) => setFilters({ ...filters, exam: e.target.value })}
          >
            <option value="">All Exams</option>
            {exams.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div className="adm-form-group" style={{ marginBottom: 0 }}>
          <label className="adm-label">Search Cadets</label>
          <div style={{ position: 'relative' }}>
            <input 
              className="adm-input" 
              placeholder="Name or Regimental No..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ paddingLeft: '36px' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Cadet Name</th>
              <th>Regimental No.</th>
              <th>College</th>
              <th>Exam Name</th>
              <th>Score</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--ink-4)', fontWeight: 300 }}>
                  No result records found.
                </td>
              </tr>
            ) : (
              filteredResults.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{r.studentName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-4)', fontWeight: 300 }}>{r.college}</div>
                  </td>
                  <td><code style={{ background: 'transparent', padding: 0 }}>{r.regimentalNumber}</code></td>
                  <td>{r.college}</td>
                  <td>{r.examTitle}</td>
                  <td style={{ fontWeight: 600, color: r.score >= 70 ? '#3B6D11' : r.score < 40 ? 'var(--crimson)' : 'var(--ink)' }}>
                    {r.score}%
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={`adm-badge ${r.score >= 40 ? 'adm-badge-success' : 'adm-badge-danger'}`}>
                      {r.score >= 40 ? 'Qualified' : 'Not Clear'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

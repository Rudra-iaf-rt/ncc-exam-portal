import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { PageHeader } from '../components/Shared';
import { Plus, Eye, Info, ShieldAlert } from 'lucide-react';
import '../admin.css';

export default function ExamList() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchExams() {
      const { data, error } = await apiFetch('/exams');
      if (data) {
        setExams(data.exams);
      }
      setLoading(false);
    }
    fetchExams();
  }, []);

  const CreateAction = (
    <NavLink to="/admin/exams/create" className="adm-btn adm-btn-primary">
      <Plus size={16} strokeWidth={1.5} />
      <span>Deploy New Examination</span>
    </NavLink>
  );

  if (loading) {
    return <div style={{ color: 'var(--ink-4)', padding: '40px', fontFamily: 'var(--f-mono)', fontSize: '13px' }}>Accessing HQ exam registry...</div>;
  }

  return (
    <div>
      <PageHeader 
        title="Exam *Management*" 
        subtitle="Catalogue of all training and certificate examinations historically archived" 
        action={CreateAction}
      />

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Ref ID</th>
              <th>Designation / Title</th>
              <th>Duration</th>
              <th>Questions</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {exams.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: 'var(--ink-4)', fontWeight: 300 }}>
                  No active assessment protocols found in the database.
                </td>
              </tr>
            ) : (
              exams.map((e) => (
                <tr key={e.id}>
                  <td><code style={{ background: 'transparent', padding: 0 }}>#{e.id.toString().padStart(3, '0')}</code></td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--navy)' }}>{e.title}</div>
                  </td>
                  <td>{e.duration} Minutes</td>
                  <td>{e.questionCount} Items</td>
                  <td>
                    <span className="adm-badge adm-badge-success">Operational</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="adm-btn adm-btn-ghost" style={{ padding: '6px' }} title="View Detail" disabled>
                        <Eye size={16} strokeWidth={1.5} />
                      </button>
                      <div style={{ fontSize: '10px', color: 'var(--crimson)', opacity: 0.6, fontStyle: 'italic' }}>
                        API Pending
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Operational Disclaimer */}
      <div className="adm-card" style={{ marginTop: '32px', borderLeft: '4px solid var(--gold-2)', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <ShieldAlert size={20} style={{ color: 'var(--gold-3)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--navy)' }}>Operational Protocol</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-4)', marginTop: '4px', lineHeight: 1.5 }}>
              Modification of deployed exam parameters is restricted. Currently, only new exam deployment is supported via this terminal. 
              Removal or modification of existing registries requires Command Level permission (Backend API update).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

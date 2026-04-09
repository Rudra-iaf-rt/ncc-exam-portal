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
      <span>Create New Exam</span>
    </NavLink>
  );

  if (loading) {
    return <div style={{ color: 'var(--ink-4)', padding: '40px', fontFamily: 'var(--f-mono)', fontSize: '13px' }}>Loading exam registry...</div>;
  }

  return (
    <div>
      <PageHeader 
        title="Manage *Exams*" 
        subtitle="Catalog of all training and certificate examinations available in the system." 
        action={CreateAction}
      />

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>Exam Title</th>
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
                  No exams found. Create your first exam to get started.
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
                    <span className="adm-badge adm-badge-success">Active</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button className="adm-btn adm-btn-ghost" style={{ padding: '6px' }} title="View Detailed Results" disabled>
                        <Eye size={16} strokeWidth={1.5} />
                      </button>
                      <div style={{ fontSize: '10px', color: 'var(--crimson)', opacity: 0.6, fontStyle: 'italic' }}>
                        Details Soon
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* System Policy */}
      <div className="adm-card" style={{ marginTop: '32px', borderLeft: '4px solid var(--gold-2)', padding: '20px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <ShieldAlert size={20} style={{ color: 'var(--gold-3)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--navy)' }}>System Policy</div>
            <div style={{ fontSize: '13px', color: 'var(--ink-4)', marginTop: '4px', lineHeight: 1.5 }}>
              Modification of active exams is currently restricted. New exams can be created via the 'Create New Exam' button. 
              To delete or modify existing records, please contact the system administrator.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

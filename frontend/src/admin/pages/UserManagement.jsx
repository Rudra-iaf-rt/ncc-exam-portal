import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api';
import { PageHeader } from '../components/Shared';
import { 
  Database, 
  Terminal, 
  ShieldAlert,
  FileCode,
  UserPlus
} from 'lucide-react';
import '../admin.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await apiFetch('/admin/users');
      if (data) setUsers(data);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  return (
    <div style={{ maxWidth: '1000px' }}>
      <PageHeader 
        title="Cadet *Registry*" 
        subtitle="Manage cadet enrollment and administrative access control." 
        action={
          <button className="adm-btn adm-btn-primary">
            <UserPlus size={16} strokeWidth={1.5} />
            <span>Add Cadet</span>
          </button>
        }
      />

      {users.length === 0 && !loading && (
        <div className="adm-card" style={{ padding: '24px', borderLeft: '4px solid var(--gold-2)', background: 'rgba(201, 152, 42, 0.05)', marginBottom: '40px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <ShieldAlert size={24} style={{ color: 'var(--gold-3)' }} />
            <div>
              <h2 style={{ color: 'var(--navy)', margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Empty Registry</h2>
              <p style={{ fontSize: '14px', color: 'var(--ink-4)', margin: 0, lineHeight: 1.6 }}>
                No registered cadets or administrators found in the database. New users must register via the student portal or be added manually.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="adm-table-wrap" style={{ opacity: loading ? 0.5 : 1 }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Regimental / ID</th>
              <th>Role</th>
              <th>College</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading ? (
              users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.name}</td>
                  <td><code style={{ background: 'transparent', padding: 0 }}>{user.regimentalNumber || user.email || 'N/A'}</code></td>
                  <td>
                    <span className={`adm-badge ${user.role === 'ADMIN' ? 'adm-badge-info' : 'adm-badge-neutral'}`} style={{ fontSize: '9px' }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{user.college}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="adm-badge adm-badge-success">Active</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                  Accessing Secure Database...
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--ink-4)' }}>
                  No records matching search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

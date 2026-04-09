import { PageHeader } from '../components/Shared';
import { 
  AlertTriangle, 
  Database, 
  Terminal, 
  ShieldAlert,
  FileCode,
  UserPlus
} from 'lucide-react';
import '../admin.css';

export default function UserManagement() {
  return (
    <div style={{ maxWidth: '1000px' }}>
      <PageHeader 
        title="Personnel *Registry*" 
        subtitle="Secure management of cadet enrolment and administrative access control" 
        action={
          <button className="adm-btn adm-btn-primary" disabled style={{ opacity: 0.5 }}>
            <UserPlus size={16} strokeWidth={1.5} />
            <span>Onboard Personnel</span>
          </button>
        }
      />

      <div className="adm-card" style={{ padding: '24px', borderLeft: '4px solid var(--gold-2)', background: 'rgba(201, 152, 42, 0.05)', marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <ShieldAlert size={24} style={{ color: 'var(--gold-3)' }} />
          <div>
            <h2 style={{ color: 'var(--navy)', margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Operational Restriction: Data API Pending</h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-4)', margin: 0, lineHeight: 1.6 }}>
              The current secure terminal requires integration with the core Personnel Database. 
              Cadet CRUD operations (Create, Read, Update, Delete) are disabled until the corresponding backend protocols are authorized and deployed.
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '48px' }}>
        <div className="adm-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Database size={20} style={{ color: 'var(--navy)' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required Endpoints</h3>
          </div>
          <ul style={{ fontSize: '13px', padding: 0, listStyle: 'none', color: 'var(--ink-4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li style={{ display: 'flex', gap: '8px' }}>
              <code style={{ fontSize: '11px', background: 'var(--stone-2)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>GET</code>
              <span>/api/admin/users — Retrieve personnel registry</span>
            </li>
            <li style={{ display: 'flex', gap: '8px' }}>
              <code style={{ fontSize: '11px', background: 'var(--stone-2)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>POST</code>
              <span>/api/admin/users — Onboard new personnel</span>
            </li>
            <li style={{ display: 'flex', gap: '8px' }}>
              <code style={{ fontSize: '11px', background: 'var(--stone-2)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start' }}>PATCH</code>
              <span>/api/admin/users/:id — Revoke or modify access</span>
            </li>
          </ul>
        </div>
        
        <div className="adm-card" style={{ padding: '24px', background: 'var(--navy)', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <Terminal size={20} style={{ color: 'var(--gold-2)' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--gold-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schema Specification</h3>
          </div>
          <pre style={{ 
            fontSize: '12px', 
            background: 'rgba(255,255,255,0.05)', 
            padding: '16px', 
            borderRadius: '6px', 
            margin: 0, 
            fontFamily: 'var(--f-mono)',
            color: 'rgba(255,255,255,0.7)',
            lineHeight: 1.5,
            overflowX: 'auto'
          }}>
{`// Personnel Data Object
{
  "name": "Full Name",
  "role": "STUDENT | ADMIN",
  "college": "Designated Institution",
  "regNo": "NCC/202X/XXX",
  "status": "ACTIVE | SUSPENDED"
}`}
          </pre>
        </div>
      </div>

      <div className="adm-table-wrap" style={{ opacity: 0.3, pointerEvents: 'none', filter: 'grayscale(0.5)' }}>
        <table className="adm-table">
          <thead>
            <tr>
              <th>Personnel Name</th>
              <th>Regimental No.</th>
              <th>Designation</th>
              <th>Affiliated College</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>[SYSTEM PLACEHOLDER]</td>
              <td><code style={{ background: 'transparent', padding: 0 }}>NCC/2024/001</code></td>
              <td style={{ fontSize: '11px', fontWeight: 600 }}>CADET</td>
              <td>Sri Venkateswara University</td>
              <td style={{ textAlign: 'right' }}><span className="adm-badge">Encrypted</span></td>
            </tr>
            <tr>
              <td>[SYSTEM PLACEHOLDER]</td>
              <td><code style={{ background: 'transparent', padding: 0 }}>NCC/2024/002</code></td>
              <td style={{ fontSize: '11px', fontWeight: 600 }}>ADMIN</td>
              <td>Unit HQ Command</td>
              <td style={{ textAlign: 'right' }}><span className="adm-badge">Encrypted</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid var(--stone-3)', paddingTop: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--ink-4)', fontSize: '13px' }}>
          <FileCode size={14} />
          <span>Refer to <span style={{ textDecoration: 'underline' }}>docs/missing-endpoints.md</span> for technical dispatch instructions.</span>
        </div>
      </div>
    </div>
  );
}

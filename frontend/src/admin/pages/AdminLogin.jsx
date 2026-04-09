import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Mail, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import '../admin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, login, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('adm-body');
    if (!isLoading && user && user.role === 'ADMIN') {
      navigate('/admin/dashboard');
    }
    return () => document.body.classList.remove('adm-body');
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.error || 'Authentication failed. Please verify your credentials.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) return null;

  return (
    <div className="adm-login-container">
      <div className="adm-card adm-login-card" style={{ padding: '40px', maxWidth: '420px', width: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--navy)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 20px',
            boxShadow: '0 8px 16px rgba(11, 22, 43, 0.1)'
          }}>
            <ShieldCheck size={32} color="var(--gold-2)" strokeWidth={1.5} />
          </div>
          <h1 style={{ 
            fontFamily: 'var(--f-display)', 
            fontSize: '28px', 
            color: 'var(--navy)', 
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em'
          }}>
            Command Centre
          </h1>
          <p style={{ color: 'var(--ink-4)', fontSize: '13px', fontWeight: 400 }}>Authentication required for Unit Registry Access</p>
        </div>

        {error && (
          <div style={{ 
            background: '#FFF5F5', 
            borderLeft: '4px solid var(--crimson)',
            color: 'var(--crimson)', 
            padding: '12px 16px', 
            borderRadius: '4px',
            fontSize: '13px',
            marginBottom: '24px',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            fontWeight: 500
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="adm-form-group">
            <label className="adm-label">Email Designation</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                className="adm-input" 
                placeholder="officer@ncc.hq"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                style={{ paddingLeft: '40px' }}
              />
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
            </div>
          </div>

          <div className="adm-form-group" style={{ marginBottom: '32px' }}>
            <label className="adm-label">Access Key Code</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                className="adm-input" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                style={{ paddingLeft: '40px' }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-4)' }} />
            </div>
          </div>

          <button 
            type="submit" 
            className="adm-btn adm-btn-primary" 
            style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Verifying Credentials...' : 'Sign In to HQ'}</span>
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '11px', color: 'var(--ink-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          National Cadet Corps · Government of India
        </div>
      </div>
      
      {/* Background Accent */}
      <div style={{ position: 'fixed', bottom: '40px', right: '40px', opacity: 0.1, zid: -1 }}>
        <div style={{ fontFamily: 'var(--f-display)', fontSize: '120px', fontWeight: 900, color: 'var(--navy)', lineHeight: 0.8, pointerEvents: 'none' }}>
          NCC
        </div>
      </div>
    </div>
  );
}

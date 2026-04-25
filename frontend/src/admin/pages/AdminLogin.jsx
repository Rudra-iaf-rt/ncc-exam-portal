import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, login, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Both ADMIN and INSTRUCTOR are allowed in the staff portal
    if (!isLoading && user && (user.role === 'ADMIN' || user.role === 'INSTRUCTOR')) {
      navigate('/admin/dashboard');
    }
  }, [user, isLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await login(email, password);
    if (result.success) {
      toast.success('Successfully authenticated.');
      navigate('/admin/dashboard');
    } else {
      toast.error(result.error || 'Authentication failed. Please verify your credentials.');
    }
    setIsSubmitting(false);
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-5 font-ui relative overflow-hidden">
      <div className="bg-white border border-stone-deep rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] w-full max-w-[420px] p-10 relative z-10">
        <div className="text-center mb-8">
          <div className="w-[80px] h-[80px] mx-auto mb-5 drop-shadow-[0_8px_16px_rgba(11,22,43,0.15)]">
            <img
              src="/assets/ncc-logo.png"
              alt="NCC Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="font-display text-[28px] text-navy m-0 mb-2 tracking-[-0.02em]">
            Staff Command Centre
          </h1>
          <p className="text-ink-4 text-[13px] font-normal">Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label htmlFor="login-email" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Designation Email</label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                className="w-full h-[38px] pl-10 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="officer@ncc.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            </div>
          </div>

          <div className="mb-8">
            <label htmlFor="login-password" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Access Key</label>
            <div className="relative">
              <input
                id="login-password"
                type="password"
                className="w-full h-[38px] pl-10 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-[48px] rounded-md font-ui text-[15px] font-medium flex items-center justify-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-8 text-center text-[11px] text-ink-4 tracking-[0.05em] uppercase">
          National Cadet Corps · Government of India
        </div>
      </div>

      {/* Background Accent */}
      <div className="fixed bottom-10 right-10 opacity-10 -z-10 pointer-events-none">
        <div className="font-display text-[120px] font-black text-navy leading-[0.8]">
          NCC
        </div>
      </div>
    </div>
  );
}

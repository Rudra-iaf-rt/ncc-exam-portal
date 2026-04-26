import React, { useState, useEffect } from 'react';
import { Lock, Shield, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { toast } from 'sonner';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token.');
      navigate('/');
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return toast.error('Passwords do not match.');
    }

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }

    setLoading(true);

    try {
      await authApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      toast.error(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone p-6">
        <div className="w-full max-w-[420px] bg-white rounded-md border border-stone-deep p-10 shadow-xl text-center">
          <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="font-display text-2xl text-navy mb-4">Password Reset!</h2>
          <p className="text-ink-3 text-sm mb-8 leading-relaxed">
            Your password has been successfully updated. You can now sign in with your new credentials.
          </p>
          <p className="text-ink-4 text-xs">Redirecting to login in 3 seconds...</p>
          <Link 
            to="/" 
            className="mt-6 inline-flex h-11 items-center justify-center px-6 bg-navy text-white rounded-sm font-ui font-bold text-sm"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone p-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(var(--navy) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-md border border-stone-deep p-10 shadow-xl relative z-10">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-navy-wash border border-navy-pale rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-gold" />
          </div>
          <h1 className="font-display text-2xl text-navy mb-2">Set New Password</h1>
          <p className="text-ink-4 text-sm">Please choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-ink-3 uppercase tracking-wider ml-1">New Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 z-20 text-ink-4" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-12 font-ui text-[15px] outline-none focus:bg-white focus:border-navy transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-ink-4 hover:text-navy transition-colors z-20"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-ink-3 uppercase tracking-wider ml-1">Confirm Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 z-20 text-ink-4" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-12 font-ui text-[15px] outline-none focus:bg-white focus:border-navy transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-navy text-white rounded-sm py-4 font-ui font-bold text-[15px] transition-all hover:bg-navy-mid disabled:opacity-70 shadow-lg shadow-navy/10"
            disabled={loading}
          >
            {loading ? 'RESETTING...' : 'RESET PASSWORD'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

import React, { useState } from 'react';
import { Mail, ArrowLeft, Shield, CheckCircle2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'cadet';
  const backLink = type === 'admin' ? '/admin/login' : '/';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
      toast.success('Reset link sent! Please check your email.');
    } catch (err) {
      // We don't reveal if user exists or not for security
      setSubmitted(true);
      console.error('Forgot password error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone p-6">
        <div className="w-full max-w-[420px] bg-white rounded-md border border-stone-deep p-10 shadow-xl text-center">
          <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="font-display text-2xl text-navy mb-4">Check your email</h2>
          <p className="text-ink-3 text-sm mb-8 leading-relaxed">
            If an account exists with <strong>{email}</strong>, you will receive a link to reset your password shortly.
          </p>
          <Link 
            to={backLink} 
            className="inline-flex items-center gap-2 text-navy font-ui font-bold text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Login
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
        <div className="mb-8">
          <div className="w-12 h-12 bg-navy-wash rounded-full flex items-center justify-center mb-4">
            <Shield size={24} className="text-gold" />
          </div>
          <h1 className="font-display text-2xl text-navy mb-2">Forgot Password?</h1>
          <p className="text-ink-4 text-sm">Enter your designated email address and we'll send you a recovery link.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[11px] font-bold text-ink-3 uppercase tracking-wider ml-1">Designation Email</label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-4 z-20 text-ink-4" />
              <input
                id="email"
                type="email"
                placeholder="officer@ncc.gov.in"
                className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-4 font-ui text-[15px] outline-none focus:bg-white focus:border-navy transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-navy text-white rounded-sm py-4 font-ui font-bold text-[15px] transition-all hover:bg-navy-mid disabled:opacity-70 shadow-lg shadow-navy/10"
            disabled={loading}
          >
            {loading ? 'SENDING LINK...' : 'SEND RECOVERY LINK'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-dashed border-stone-deep text-center">
          <Link 
            to={backLink} 
            className="inline-flex items-center gap-2 text-navy font-ui font-bold text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

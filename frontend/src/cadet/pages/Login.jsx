import React, { useState } from 'react';
import { Shield, Lock, User, Info, ArrowRight } from 'lucide-react';
import { authApi } from '../../api';
import { setToken, setRefreshToken, saveUser } from '../../lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CadetLogin = () => {
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data } = await authApi.login({ regimentalNumber: regNo, password });
      setLoading(false);
      
      setToken(data.token);
      setRefreshToken(data.refreshToken);
      saveUser(data.user);
      
      toast.success('Login successful. Welcome back!');
      navigate('/dashboard');
    } catch (apiErr) {
      setLoading(false);
      toast.error(apiErr.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(var(--navy) 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-md border border-stone-deep p-10 shadow-[0_20px_50px_-12px_rgba(28,28,24,0.12)] relative z-10">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-navy-wash border border-navy-pale rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Shield size={32} className="text-gold" />
          </div>
          <h1 className="font-display text-3xl text-navy mb-1">NCC Tirupati Unit</h1>
          <p className="font-ui text-[11px] font-bold tracking-[0.15em] text-ink-4 uppercase">Cadet Examination Portal</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="regNo" className="text-[12px] font-bold text-ink-3 uppercase tracking-wider ml-1">Regimental Number</label>
            <div className="relative flex items-center">
              <User size={18} className="absolute left-4 z-20 text-ink-4" />
              <input
                id="regNo"
                type="text"
                placeholder="e.g. NCC/2024/123"
                className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-4 font-ui text-[15px] transition-all focus:bg-white focus:border-navy focus:ring-4 focus:ring-navy-wash outline-none relative z-10"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[12px] font-bold text-ink-3 uppercase tracking-wider ml-1">Secure Passkey</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 z-20 text-ink-4" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-4 font-ui text-[15px] transition-all focus:bg-white focus:border-navy focus:ring-4 focus:ring-navy-wash outline-none relative z-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="group mt-2 bg-navy text-white rounded-sm py-4 font-ui font-bold text-[15px] flex items-center justify-center gap-3 transition-all hover:bg-navy-mid hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-navy/10"
            disabled={loading}
          >
            {loading ? 'AUTHENTICATING...' : 'ACCESS PORTAL'}
            {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-dashed border-stone-deep text-center">
          <p className="font-display italic text-xl text-ink-4 opacity-60">"Unity and Discipline"</p>
        </div>
      </div>
    </div>
  );
};

export default CadetLogin;

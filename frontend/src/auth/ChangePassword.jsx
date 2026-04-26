import React, { useState } from 'react';
import { Lock, Shield, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { toast } from 'sonner';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      return toast.error('New passwords do not match.');
    }

    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters.');
    }

    setLoading(true);

    try {
      await authApi.changePassword({ oldPassword, newPassword });
      toast.success('Password updated successfully!');
      navigate(-1);
    } catch (err) {
      toast.error(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white border border-stone-deep flex items-center justify-center text-ink-3 hover:text-navy hover:border-navy transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-3xl text-navy">Security Settings</h1>
          <p className="text-ink-4 text-sm mt-1">Update your account password and security preferences.</p>
        </div>
      </div>

      <div className="bg-white border border-stone-deep rounded-md p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-dashed border-stone-deep">
          <div className="w-12 h-12 bg-navy-wash rounded-full flex items-center justify-center shrink-0">
            <Shield size={24} className="text-gold" />
          </div>
          <div>
            <h2 className="font-display text-xl text-navy">Update Password</h2>
            <p className="text-ink-4 text-xs">Ensure your account is protected with a strong, unique password.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-ink-3 uppercase tracking-wider ml-1">Current Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 z-20 text-ink-4" />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-4 font-ui text-[15px] outline-none focus:bg-white focus:border-navy transition-all"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-ink-3 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-4 z-20 text-ink-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-12 font-ui text-[15px] outline-none focus:bg-white focus:border-navy transition-all"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              <label className="text-[11px] font-bold text-ink-3 uppercase tracking-wider ml-1">Confirm New Password</label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-4 z-20 text-ink-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-stone-wash border border-stone-deep rounded-sm py-3.5 pl-12 pr-4 font-ui text-[15px] outline-none focus:bg-white focus:border-navy transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              className="bg-navy text-white px-8 py-4 rounded-sm font-ui font-bold text-[15px] transition-all hover:bg-navy-mid disabled:opacity-70 shadow-lg shadow-navy/10"
              disabled={loading}
            >
              {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;

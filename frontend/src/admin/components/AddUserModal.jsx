import { useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { X, ShieldCheck, User as UserIcon, Building2, Key, Mail } from 'lucide-react';

export default function AddUserModal({ isOpen, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    name: '',
    regimentalNumber: '',
    college: '',
    email: '',
    password: '',
    wing: '',
    batch: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Sanitize payload: replace empty strings with null/undefined for optional fields
    const payload = { ...formData };
    if (!payload.password) delete payload.password;
    if (!payload.email) payload.email = null;
    if (!payload.wing) payload.wing = null;
    if (!payload.batch) payload.batch = null;

    try {
      await adminApi.createUser(payload);
      toast.success('Cadet enrolled successfully.');
      setFormData({ name: '', regimentalNumber: '', college: '', email: '', password: '', wing: '', batch: '' });
      onRefresh();
      onClose();
    } catch (apiErr) {
      toast.error(apiErr.message || 'Failed to create record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm">
      <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[750px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)]">
        <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gold-2 text-white p-2 rounded-lg">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">Manual Enrollment</h3>
              <p className="m-0 text-[12px] text-ink-4 font-ui">Register a single cadet to the database.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="mb-0">
              <label htmlFor="add-name" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input 
                  id="add-name"
                  type="text" 
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4"
                />
              </div>
            </div>

            <div className="mb-0">
              <label htmlFor="add-regno" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Regimental Number</label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input 
                  id="add-regno"
                  type="text" 
                  required
                  placeholder="e.g. WB21SDA/123456"
                  value={formData.regimentalNumber}
                  onChange={(e) => setFormData({...formData, regimentalNumber: e.target.value})}
                  className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4"
                />
              </div>
            </div>

            <div className="mb-0">
              <label htmlFor="add-college" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">College / Unit</label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input 
                  id="add-college"
                  type="text" 
                  required
                  placeholder="e.g. MITS"
                  value={formData.college}
                  onChange={(e) => setFormData({...formData, college: e.target.value})}
                  className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4"
                />
              </div>
            </div>

            <div className="mb-0">
              <label htmlFor="add-email" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Email Address (Optional)</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input 
                  id="add-email"
                  type="email" 
                  placeholder="e.g. john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4"
                />
              </div>
            </div>

            <div className="mb-0">
              <label htmlFor="add-wing" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">NCC Wing</label>
              <select
                id="add-wing"
                className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all"
                value={formData.wing}
                onChange={(e) => setFormData({ ...formData, wing: e.target.value })}
              >
                <option value="">Select Wing</option>
                <option value="ARMY">Army Wing</option>
                <option value="NAVY">Navy Wing</option>
                <option value="AIR">Air Wing</option>
              </select>
            </div>

            <div className="mb-0">
              <label htmlFor="add-batch" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Batch / Year</label>
              <input
                id="add-batch"
                type="text"
                placeholder="e.g. 2024-25"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                className="w-full h-[38px] px-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 mb-0">
              <label htmlFor="add-password" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Initial Password (Optional)</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input 
                  id="add-password"
                  type="password" 
                  placeholder="Defaults to 'cadet123'"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full h-[38px] pl-9 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 h-[40px] rounded-md font-ui text-[14px] font-medium flex items-center justify-center bg-white text-ink-2 border border-stone-deep hover:bg-stone hover:text-navy transition-all" 
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-[2] h-[40px] rounded-md font-ui text-[14px] font-medium flex items-center justify-center bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Create Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

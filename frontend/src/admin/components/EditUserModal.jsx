import { Building2, Key, Mail, ShieldCheck, User as UserIcon, X, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { invalidateCachedResource } from '../../lib/resourceCache';

import { useCachedFetch } from '../../hooks/useCachedFetch';
import CustomSelect from '../../components/CustomSelect';

export default function EditUserModal({ isOpen, onClose, onRefresh, user }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    regimentalNumber: user?.regimentalNumber || '',
    college: user?.collegeCode || '',
    email: user?.email || '',
    role: user?.role || 'STUDENT',
    wing: user?.wing || '',
    batch: user?.batch || '',
    isActive: user?.isActive ?? true,
    password: ''
  });
  const { data: collegesData, loading: fetchingColleges } = useCachedFetch(
    'admin-colleges',
    async () => {
      const response = await adminApi.getColleges();
      return { colleges: response?.data?.colleges || [] };
    },
    { staleTimeMs: 5 * 60 * 1000, enabled: isOpen }
  );
  const colleges = collegesData?.colleges || [];

  const { data: batchesData, loading: fetchingBatches } = useCachedFetch(
    'admin-batches',
    async () => {
      const response = await adminApi.getBatches();
      return { batches: response?.data || [] };
    },
    { staleTimeMs: 5 * 60 * 1000, enabled: isOpen }
  );
  const batches = batchesData?.batches || [];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user?.name || '',
        regimentalNumber: user?.regimentalNumber || '',
        college: user?.collegeCode || '',
        email: user?.email || '',
        role: user?.role || 'STUDENT',
        wing: user?.wing || '',
        batch: user?.batch || '',
        isActive: user?.isActive ?? true,
        password: ''
      });
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = { ...formData };
    if (!payload.password) delete payload.password;
    if (!payload.email) payload.email = null;
    if (!payload.wing) payload.wing = null;
    if (!payload.batch) payload.batch = null;

    try {
      await adminApi.updateUser(user.id, payload);
      toast.success('Record updated successfully.');
      // Invalidate both caches — role change could move user between lists
      invalidateCachedResource('admin-users-students');
      invalidateCachedResource('admin-staff-list');
      onRefresh?.();
      onClose();
    } catch (apiErr) {
      toast.error(apiErr.response?.data?.message || apiErr.message || 'Failed to update record.');
    } finally {
      setLoading(false);
    }
  };

  const isStudent = formData.role === 'STUDENT';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
        <div className="shrink-0 bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-navy text-white p-2 rounded-lg">
              <UserIcon size={20} />
            </div>
            <div>
              <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">Update {isStudent ? 'Cadet' : 'Staff'} Details</h3>
              <p className="m-0 text-[12px] text-ink-4 font-ui mt-0.5">Editing record for {user?.name}</p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label htmlFor="edit-name" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Full Name *</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    id="edit-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="col-span-1">
                <label htmlFor="edit-regno" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Regimental Number / ID</label>
                <div className="relative">
                  <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    id="edit-regno"
                    type="text"
                    required={isStudent}
                    value={formData.regimentalNumber}
                    onChange={(e) => setFormData({ ...formData, regimentalNumber: e.target.value })}
                    className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="col-span-1">
                <label htmlFor="edit-college" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Assigned College / Unit *</label>
                <div className="relative">
                  {/* <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 z-10" /> */}
                  <CustomSelect
                    value={formData.college}
                    onChange={(val) => setFormData({ ...formData, college: val })}
                    searchable={true}
                    options={[
                      { value: "", label: fetchingColleges ? 'Loading Colleges...' : 'Select College' },
                      ...colleges.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))
                    ]}
                  />  
                </div>
              </div>

              <div className="col-span-1">
                <label htmlFor="edit-email" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    id="edit-email"
                    type="email"
                    required={!isStudent}
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="col-span-1">
                <label htmlFor="edit-role" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Access Level (Role)</label>
                <CustomSelect
                  value={formData.role}
                  onChange={(val) => setFormData({ ...formData, role: val })}
                  options={[
                    { value: "STUDENT", label: "STUDENT (Cadet)" },
                    { value: "INSTRUCTOR", label: "INSTRUCTOR (Staff)" },
                    { value: "ADMIN", label: "ADMIN (Controller)" }
                  ]}
                />
              </div>

              <div className="col-span-1">
                <label htmlFor="edit-password" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Reset Password (Optional)</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                  <input
                    id="edit-password"
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4 shadow-sm"
                  />
                </div>
              </div>

              {isStudent && (
                <>
                  <div className="col-span-1">
                    <label htmlFor="edit-wing" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">NCC Wing</label>
                    <CustomSelect
                      value={formData.wing}
                      onChange={(val) => setFormData({ ...formData, wing: val })}
                      options={[
                        { value: "", label: "Select Wing" },
                        { value: "ARMY", label: "Army Wing" },
                        { value: "NAVY", label: "Navy Wing" },
                        { value: "AIR", label: "Air Wing" }
                      ]}
                    />
                  </div>

                  <div className="col-span-1">
                    <label htmlFor="edit-batch" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Batch / Year *</label>
                    <CustomSelect
                      value={formData.batch}
                      onChange={(val) => setFormData({ ...formData, batch: val })}
                      options={[
                        { value: "", label: fetchingBatches ? 'Loading Batches...' : 'Select Batch' },
                        ...batches.map(b => ({ value: b.name, label: `${b.name} ${!b.isActive ? '(Archived)' : ''}` }))
                      ]}
                    />
                  </div>
                </>
              )}

              <div className="col-span-1 sm:col-span-2 p-4 bg-stone rounded-xl flex items-center justify-between border border-stone-deep">
                <div>
                  <div className="text-[14px] font-bold text-navy font-ui">Account Access</div>
                  <div className="text-[11px] text-ink-3 font-ui mt-0.5">
                    {formData.isActive ? 'User is currently enabled' : 'User is currently disabled'}
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`w-12 h-6 rounded-full relative cursor-pointer border-none transition-colors duration-300 ${formData.isActive ? 'bg-[#3B6D11]' : 'bg-stone-deep'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 ${formData.isActive ? 'left-[26px]' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="shrink-0 p-4 sm:px-8 sm:py-6 bg-stone border-t border-stone-deep flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[48px] rounded-xl font-ui text-[15px] font-medium border border-stone-deep text-ink-2 hover:bg-stone-mid transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] h-[48px] rounded-xl font-ui text-[15px] font-bold bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all shadow-lg shadow-navy/20 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

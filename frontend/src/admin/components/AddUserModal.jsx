import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { X, ShieldCheck, User as UserIcon, Building2, Mail, Info, Search } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { invalidateCachedResource } from '../../lib/resourceCache';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import CustomSelect from '../../components/CustomSelect';

export default function AddUserModal({ isOpen, onClose, onRefresh, initialRole = 'STUDENT' }) {
  const { user: currentUser } = useAdminAuth();
  const isInstructor = currentUser?.role === 'INSTRUCTOR';

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    regimentalNumber: '',
    college: isInstructor ? (currentUser?.collegeCode || '') : '',
    email: '',
    role: initialRole,
    wing: '',
    batch: '',
    canManageExams: false
  });
  const { data: collegesData, loading: fetchingColleges } = useCachedFetch(
    'admin-colleges-list',
    async () => {
      const response = await adminApi.getColleges();
      return { colleges: response?.data?.colleges || [] };
    },
    { staleTimeMs: 5 * 60 * 1000, enabled: isOpen && !isInstructor }
  );
  const colleges = collegesData?.colleges || [];

  const { data: batchesData, loading: fetchingBatches } = useCachedFetch(
    'admin-batches',
    async () => {
      const response = await adminApi.getBatches();
      const allBatches = response?.data || [];
      return { batches: allBatches.filter(b => b.isActive) };
    },
    { staleTimeMs: 5 * 60 * 1000, enabled: isOpen }
  );
  const batches = batchesData?.batches || [];

  // Sync role if initialRole changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, role: initialRole }));
  }, [initialRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = { ...formData };
    
    // Instructors always create STUDENT role; college is locked to their own
    if (isInstructor) {
      payload.role = 'STUDENT';
      payload.college = currentUser?.collegeCode || payload.college;
    }

    if (!payload.email) payload.email = null;
    if (!payload.wing) payload.wing = null;
    if (!payload.batch) payload.batch = null;

    try {
      await adminApi.createUser(payload);
      const label = payload.role === 'INSTRUCTOR' ? 'Instructor account created.' : 'Cadet enrolled successfully.';
      toast.success(label);
      // Invalidate whichever list this user belongs to
      if (payload.role === 'INSTRUCTOR' || payload.role === 'ADMIN') {
        invalidateCachedResource('admin-staff-list');
      } else {
        invalidateCachedResource('admin-users-students');
      }
      setFormData({
        name: '',
        regimentalNumber: '',
        college: isInstructor ? (currentUser?.collegeCode || '') : '',
        email: '',
        role: initialRole,
        wing: '',
        batch: ''
      });
      onRefresh?.();
      onClose();
    } catch (apiErr) {
      toast.error(apiErr.response?.data?.message || apiErr.message || 'Failed to create record.');
    } finally {
      setLoading(false);
    }
  };

  const isStudent = formData.role === 'STUDENT';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[700px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200 rounded-2xl">
        <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-navy text-white p-2 rounded-lg">
              {isStudent ? <UserIcon size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div>
              <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">
                {isStudent ? 'Enroll *Cadet*' : 'Provision *Instructor*'}
              </h3>
              <p className="m-0 text-[12px] text-ink-4 font-ui mt-0.5">
                {isInstructor ? `Adding cadet to your unit: ${currentUser?.college || currentUser?.collegeCode}` : `Creating a new ${isStudent ? 'cadet' : 'instructor'} record.`}
              </p>
            </div>
          </div>
          <button onClick={onClose} type="button" className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="col-span-1">
              <label htmlFor="add-name" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Full Name *</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  id="add-name"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4 shadow-sm"
                />
              </div>
            </div>

            <div className="col-span-1">
              <label htmlFor="add-regno" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                {isStudent ? 'Regimental Number *' : 'Regimental / ID Number'}
              </label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  id="add-regno"
                  type="text"
                  required={isStudent}
                  placeholder={isStudent ? "e.g. WB21SDA/123456" : "Optional"}
                  value={formData.regimentalNumber}
                  onChange={(e) => setFormData({ ...formData, regimentalNumber: e.target.value })}
                  className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4 shadow-sm"
                />
              </div>
            </div>

            <div className="col-span-1">
              <label htmlFor="add-college" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                Assigned College / Unit * {isInstructor && <span className="text-gold lowercase font-ui font-normal ml-1">(locked)</span>}
              </label>
              <div className="relative">
                {/* <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 z-10" /> */}
                {isInstructor ? (
                  <input
                    readOnly
                    value={currentUser?.college || currentUser?.collegeCode || ''}
                    className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-stone cursor-not-allowed outline-none shadow-sm"
                  />
                ) : (
                  <CustomSelect
                    value={formData.college}
                    onChange={(val) => setFormData({ ...formData, college: val })}
                    searchable={true}
                    options={[
                      { value: "", label: fetchingColleges ? 'Loading Colleges...' : `Select College` },
                      ...colleges.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))
                    ]}
                  />
                )}
              </div>
            </div>

            <div className="col-span-1">
              <label htmlFor="add-email" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                Email Address {!isStudent ? '* (required for staff)' : '(optional for cadets)'}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  id="add-email"
                  type="email"
                  required={!isStudent}
                  placeholder="e.g. user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4 shadow-sm"
                />
              </div>
            </div>

            {isStudent && (
              <>
                <div className="col-span-1">
                  <label htmlFor="add-wing" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">NCC Wing</label>
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
                  <label htmlFor="add-batch" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Batch / Year *</label>
                  <CustomSelect
                    value={formData.batch}
                    onChange={(val) => setFormData({ ...formData, batch: val })}
                    options={[
                      { value: "", label: fetchingBatches ? 'Loading Batches...' : 'Select Batch' },
                      ...batches.map(b => ({ value: b.name, label: b.name }))
                    ]}
                  />
                </div>
              </>
            )}

            {!isStudent && formData.role === 'INSTRUCTOR' && !isInstructor && (
              <div className="col-span-1 sm:col-span-2 p-4 bg-stone rounded-xl flex items-center justify-between border border-stone-deep">
                <div>
                  <div className="text-[14px] font-bold text-navy font-ui">Exam Management</div>
                  <div className="text-[11px] text-ink-3 font-ui mt-0.5">
                    {formData.canManageExams ? 'Instructor can assign and manage exams for their college' : 'Instructor cannot manage exams'}
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({ ...formData, canManageExams: !formData.canManageExams })}
                  className={`w-12 h-6 rounded-full relative cursor-pointer border-none transition-colors duration-300 ${formData.canManageExams ? 'bg-[#3B6D11]' : 'bg-stone-deep'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all duration-300 ${formData.canManageExams ? 'left-[26px]' : 'left-1'}`} />
                </button>
              </div>
            )}
          </div>

            <div className="mt-8 flex items-start gap-3 bg-stone p-4 rounded-xl border border-stone-deep">
              <Info size={16} className="text-navy/60 mt-0.5 shrink-0" />
              <p className="m-0 font-ui text-[13px] text-ink-3 leading-relaxed">
                {!isStudent
                  ? <>Default instructor password is <code className="bg-white px-1.5 py-0.5 rounded border border-stone-deep text-navy font-bold">staff@ncc123</code>. Staff sign in via email.</>
                  : <>Default cadet password is <code className="bg-white px-1.5 py-0.5 rounded border border-stone-deep text-navy font-bold">cadet123</code>. Cadets sign in via Regimental No or Email.</>
                }
              </p>
            </div>
          </div>

          <div className="shrink-0 p-4 sm:px-6 sm:py-4 bg-stone-wash/50 border-t border-stone-deep flex justify-end gap-3 mt-auto rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-ui text-[14px] font-medium text-ink-3 hover:text-ink hover:bg-stone transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl font-ui text-[14px] font-medium bg-navy text-white hover:bg-navy-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_2px_10px_rgba(26,39,68,0.15)] flex items-center gap-2"
            >
              {loading ? <span className="opacity-70">Creating...</span> : 'Create Record'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

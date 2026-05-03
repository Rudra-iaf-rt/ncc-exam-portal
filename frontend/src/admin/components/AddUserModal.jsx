import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { X, ShieldCheck, User as UserIcon, Building2, Mail, Info, Search } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuth';

export default function AddUserModal({ isOpen, onClose, onRefresh, initialRole = 'STUDENT' }) {
  const { user: currentUser } = useAdminAuth();
  const isInstructor = currentUser?.role === 'INSTRUCTOR';

  const [formData, setFormData] = useState({
    name: '',
    regimentalNumber: '',
    college: isInstructor ? (currentUser?.collegeCode || '') : '',
    email: '',
    role: initialRole,
    wing: '',
    batch: ''
  });
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingColleges, setFetchingColleges] = useState(false);
  const [batches, setBatches] = useState([]);
  const [fetchingBatches, setFetchingBatches] = useState(false);

  useEffect(() => {
    if (isOpen && !isInstructor) {
      const fetchColleges = async () => {
        setFetchingColleges(true);
        try {
          const { data } = await adminApi.getColleges();
          if (data?.colleges) setColleges(data.colleges);
        } catch (error) {
          console.error('Failed to fetch colleges:', error);
          toast.error('Failed to load college list');
        } finally {
          setFetchingColleges(false);
        }
      };
      fetchColleges();
    }
  }, [isOpen, isInstructor]);

  useEffect(() => {
    if (isOpen) {
      const fetchBatches = async () => {
        setFetchingBatches(true);
        try {
          const { data } = await adminApi.getBatches();
          if (data) setBatches(data.filter(b => b.isActive));
        } catch (error) {
          console.error('Failed to fetch batches:', error);
        } finally {
          setFetchingBatches(false);
        }
      };
      fetchBatches();
    }
  }, [isOpen]);

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
      setFormData({
        name: '',
        regimentalNumber: '',
        college: isInstructor ? (currentUser?.collegeCode || '') : '',
        email: '',
        role: initialRole,
        wing: '',
        batch: ''
      });
      onRefresh();
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
      <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[700px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
        <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
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
          <button onClick={onClose} className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
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
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 z-10" />
                {isInstructor ? (
                  <input
                    readOnly
                    value={currentUser?.college || currentUser?.collegeCode || ''}
                    className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-stone cursor-not-allowed outline-none shadow-sm"
                  />
                ) : (
                  <select
                    required
                    id="add-college"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="w-full h-[42px] pl-10 pr-3 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all appearance-none shadow-sm"
                    disabled={fetchingColleges}
                  >
                    <option value="">{fetchingColleges ? 'Loading Colleges...' : 'Select College'}</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                )}
                {!isInstructor && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-4">
                    <Search size={14} />
                  </div>
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
                  <select
                    id="add-wing"
                    className="w-full h-[42px] px-4 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all shadow-sm"
                    value={formData.wing}
                    onChange={(e) => setFormData({ ...formData, wing: e.target.value })}
                  >
                    <option value="">Select Wing</option>
                    <option value="ARMY">Army Wing</option>
                    <option value="NAVY">Navy Wing</option>
                    <option value="AIR">Air Wing</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label htmlFor="add-batch" className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Batch / Year *</label>
                  <select
                    id="add-batch"
                    required
                    className="w-full h-[42px] px-4 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all shadow-sm"
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  >
                    <option value="">{fetchingBatches ? 'Loading Batches...' : 'Select Batch'}</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </>
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

          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[48px] rounded-xl font-ui text-[15px] font-medium border border-stone-deep text-ink-2 hover:bg-stone transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] h-[48px] rounded-xl font-ui text-[15px] font-bold bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all shadow-lg shadow-navy/20 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Processing...' : isStudent ? 'Enroll Cadet' : 'Provision Instructor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

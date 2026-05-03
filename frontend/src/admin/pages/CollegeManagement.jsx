import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { toast } from 'sonner';
import { PageHeader } from '../components/Shared';
import { 
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  MapPin,
  User,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  Shield,
  School,
  ChevronDown,
  UserPlus,
  Link2
} from 'lucide-react';

export default function CollegeManagement() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCollege, setCurrentCollege] = useState(null);
  const [instructors, setInstructors] = useState([]);
  const [oicType, setOicType] = useState('new'); // 'new' | 'existing'

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    nccContactName: '',
    nccContactEmail: '',
    nccContactPhone: ''
  });

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [collegesRes, instructorsRes] = await Promise.all([
          adminApi.getColleges(),
          adminApi.getStaff()
        ]);
        
        if (collegesRes.data?.colleges) setColleges(collegesRes.data.colleges);
        if (instructorsRes.data) setInstructors(instructorsRes.data);
      } catch (error) {
        console.error('Failed to fetch management data:', error);
        toast.error('Failed to load records');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const handleOpenModal = (college = null) => {
    setOicType('new');
    if (college) {
      setIsEditing(true);
      setCurrentCollege(college);
      setFormData({
        name: college.name || '',
        code: college.code || '',
        address: college.address || '',
        city: college.city || '',
        state: college.state || '',
        pincode: college.pincode || '',
        nccContactName: college.nccContactName || '',
        nccContactEmail: college.nccContactEmail || '',
        nccContactPhone: college.nccContactPhone || '',
        oicId: ''
      });
    } else {
      setIsEditing(false);
      setCurrentCollege(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        nccContactName: '',
        nccContactEmail: '',
        nccContactPhone: '',
        oicId: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      
      if (oicType === 'new') {
        payload.newOic = {
          name: formData.nccContactName,
          email: formData.nccContactEmail
        };
        delete payload.oicId;
      } else {
        // Link existing instructor
        delete payload.nccContactName;
        delete payload.nccContactEmail;
      }

      if (isEditing) {
        await adminApi.updateCollege(currentCollege.id, payload);
        toast.success('College updated successfully');
      } else {
        await adminApi.createCollege(payload);
        toast.success('College registered and OIC assigned');
      }
      setIsModalOpen(false);
      handleRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const handleDeactivate = async (college) => {
    if (!window.confirm(`Are you sure you want to ${college.isActive ? 'deactivate' : 'reactivate'} ${college.name}?`)) {
      return;
    }

    try {
      if (college.isActive) {
        await adminApi.deleteCollege(college.id);
        toast.success('College deactivated');
      } else {
        await adminApi.updateCollege(college.id, { isActive: true });
        toast.success('College reactivated');
      }
      handleRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const filteredColleges = colleges.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.city && c.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full pb-10">
      <PageHeader 
        title="Colleges"
        subtitle="List of participating colleges."
        action={
          <button 
            className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid"
            onClick={() => handleOpenModal()}
          >
            <Plus size={16} strokeWidth={1.5} />
            <span>Add College</span>
          </button>
        }
      />

      <div className="mb-5 flex gap-3 flex-wrap">
        <div className="flex-auto min-w-[300px] relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input 
            type="text" 
            placeholder="Search by name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 pr-3 pl-10 rounded-xl border border-stone-3 bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4"
          />
        </div>
      </div>

      <div className={`bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3">College Code</th>
                <th className="font-normal px-4 py-3">College Name</th>
                <th className="font-normal px-4 py-3">Location</th>
                <th className="font-normal px-4 py-3">NCC Contact</th>
                <th className="font-normal px-4 py-3 text-center">Staff</th>
                <th className="font-normal px-4 py-3 text-center">Cadets</th>
                <th className="font-normal px-4 py-3">Status</th>
                <th className="font-normal px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {!loading ? (
                filteredColleges.map((college) => (
                  <tr key={college.id} className={`border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0 ${!college.isActive ? 'bg-stone-wash/50 opacity-70' : ''}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold bg-navy-wash text-navy px-2 py-1 rounded border border-navy-soft/20 uppercase">
                        {college.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">{college.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-ink-3">
                        <MapPin size={14} className="flex-none" />
                        <span>{college.city || 'N/A'}{college.state ? `, ${college.state}` : ''}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-ink-2">
                          <User size={13} className="text-ink-4" />
                          <span>{college.nccContactName || 'N/A'}</span>
                        </div>
                        {college.nccContactPhone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-ink-4">
                            <Phone size={11} />
                            <span>{college.nccContactPhone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-navy">{college.officerCount || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono font-bold text-navy">{college.cadetCount || 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${college.isActive ? 'bg-olive' : 'bg-stone-3'}`} />
                        <span className={`text-[12px] ${college.isActive ? 'text-navy font-medium' : 'text-ink-4'}`}>
                          {college.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => handleOpenModal(college)}
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-stone-2 text-navy hover:bg-stone-3 transition-colors" 
                          title="Edit College"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeactivate(college)}
                          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                            college.isActive 
                              ? 'bg-[#ef444410] text-[#ef4444] hover:bg-[#ef444420]' 
                              : 'bg-olive/10 text-olive hover:bg-olive/20'
                          }`}
                          title={college.isActive ? 'Deactivate College' : 'Reactivate College'}
                        >
                          {college.isActive ? <Trash2 size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center p-10 text-ink-4 font-mono text-[12px]">
                    Accessing Institutional Records...
                  </td>
                </tr>
              )}
              {!loading && filteredColleges.length === 0 && colleges.length > 0 && (
                <tr>
                  <td colSpan="8" className="text-center p-10 text-ink-4 font-ui">
                    No records matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* College Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[650px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-navy text-white p-2 rounded-lg shadow-sm">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">
                    {isEditing ? 'Update *College*' : 'Register *New College*'}
                  </h3>
                  <p className="m-0 text-[12px] text-ink-4 font-ui mt-0.5">Configure institutional identity and contact details.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">College Full Name *</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Madanapalle Institute of Technology & Science"
                      className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">College Code (Optional)</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input 
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                      placeholder="Auto-generated if empty"
                      className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 uppercase shadow-sm"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">City *</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input 
                      required
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="e.g. Madanapalle"
                      className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                    />
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="sm:col-span-2">
                    <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Street Address</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                      <input 
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        placeholder="Street / Locality"
                        className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">State</label>
                    <input 
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      placeholder="Andhra Pradesh"
                      className="w-full h-[44px] px-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                    />
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 border-t border-stone-deep pt-6 mt-2">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[14px] font-semibold text-navy flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-navy/5 flex items-center justify-center text-navy">
                        <Users size={16} />
                      </div>
                      <span>NCC Officer In-Charge (OIC)</span>
                    </h3>
                    
                    <div className="flex bg-stone p-1 rounded-lg border border-stone-deep">
                      <button 
                        type="button"
                        onClick={() => setOicType('new')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 ${oicType === 'new' ? 'bg-white text-navy shadow-sm' : 'text-ink-4 hover:text-ink'}`}
                      >
                        <UserPlus size={12} />
                        CREATE NEW
                      </button>
                      <button 
                        type="button"
                        onClick={() => setOicType('existing')}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 ${oicType === 'existing' ? 'bg-white text-navy shadow-sm' : 'text-ink-4 hover:text-ink'}`}
                      >
                        <Link2 size={12} />
                        LINK EXISTING
                      </button>
                    </div>
                  </div>

                  {oicType === 'existing' ? (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Select Instructor Account</label>
                      <div className="relative">
                        <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                        <select
                          required
                          value={formData.oicId}
                          onChange={(e) => setFormData({...formData, oicId: e.target.value})}
                          className="w-full h-[44px] pl-10 pr-10 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink appearance-none shadow-sm"
                        >
                          <option value="">-- Choose available instructor --</option>
                          {instructors
                            .filter(inst => !inst.collegeCode || inst.collegeCode === currentCollege?.code)
                            .map(inst => (
                              <option key={inst.id} value={inst.id}>
                                {inst.name} ({inst.email}) - {inst.college || 'No college'}
                              </option>
                            ))
                          }
                        </select>
                        <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
                      </div>
                      <p className="mt-2 text-[11px] text-ink-4 italic">Only instructors without an assigned college are listed.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="col-span-1 sm:col-span-2">
                        <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Officer Full Name *</label>
                        <div className="relative">
                          <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                          <input 
                            required={oicType === 'new'}
                            type="text"
                            value={formData.nccContactName}
                            onChange={(e) => setFormData({...formData, nccContactName: e.target.value})}
                            placeholder="e.g. Lt. Col. Ramesh Kumar"
                            className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Contact Phone</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                          <input 
                            type="text"
                            value={formData.nccContactPhone}
                            onChange={(e) => setFormData({...formData, nccContactPhone: e.target.value})}
                            placeholder="e.g. +91 98765 43210"
                            className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Contact Email *</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                          <input 
                            required={oicType === 'new'}
                            type="email"
                            value={formData.nccContactEmail}
                            onChange={(e) => setFormData({...formData, nccContactEmail: e.target.value})}
                            placeholder="e.g. officer@mits.edu"
                            className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-[50px] rounded-xl font-ui text-[15px] font-medium border border-stone-deep text-ink-2 hover:bg-stone transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-[2] h-[50px] rounded-xl font-ui text-[15px] font-bold bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all shadow-lg shadow-navy/20"
                >
                  {isEditing ? 'Update Records' : 'Register College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

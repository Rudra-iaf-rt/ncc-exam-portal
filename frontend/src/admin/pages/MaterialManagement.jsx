import React, { useState, useEffect } from 'react';
import { materialsApi, adminApi } from '../../api';
import { toast } from 'sonner';
import { PageHeader, StatCard } from '../components/Shared';
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Video, 
  Globe,
  XCircle,
  Building2,
  BookOpen,
  RefreshCcw,
  Shield,
  Info
} from 'lucide-react';

export default function MaterialManagement() {
  const [materials, setMaterials] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revalidatingId, setRevalidatingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    driveUrl: '',
    fileType: 'PDF',
    wing: '',
    collegeId: ''
  });

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [mRes, cRes] = await Promise.all([
          materialsApi.list(),
          adminApi.getColleges()
        ]);
        
        if (mRes.data?.materials) setMaterials(mRes.data.materials);
        if (cRes.data?.colleges) setColleges(cRes.data.colleges);
      } catch (error) {
        console.error('Failed to fetch materials data:', error);
        toast.error('Failed to load records');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  const handleOpenModal = () => {
    setFormData({
      title: '',
      subject: '',
      description: '',
      driveUrl: '',
      fileType: 'PDF',
      wing: '',
      collegeId: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data } = await materialsApi.upload(formData);
      if (data.warning) {
        toast.warning(data.warning);
      } else {
        toast.success('Material added successfully');
      }
      setIsModalOpen(false);
      handleRefresh();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this academic resource?')) return;
    try {
      await materialsApi.delete(id);
      toast.success('Resource removed');
      handleRefresh();
    } catch (error) {
      toast.error('Deletion failed');
    }
  };

  const handleRevalidate = async (id) => {
    setRevalidatingId(id);
    try {
      const { data } = await materialsApi.revalidate(id);
      if (data.status === 'VERIFIED') {
        toast.success('Drive link verified');
      } else {
        toast.error(`Access check failed: ${data.status}`);
      }
      handleRefresh();
    } catch (error) {
      toast.error('Revalidation error');
    } finally {
      setRevalidatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse" />
            <span className="text-[11px] font-bold text-navy uppercase tracking-tighter">Verified</span>
          </div>
        );
      case 'RESTRICTED':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-tighter">Restricted</span>
          </div>
        );
      case 'ERROR':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-tighter">Link Error</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-stone-deep" />
            <span className="text-[11px] font-bold text-ink-4 uppercase tracking-tighter">Pending</span>
          </div>
        );
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-[1200px]">
      <PageHeader 
        title="Syllabus *Materials*"
        subtitle="Repository of academic resources and training manuals."
        action={
          <button 
            className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid shadow-sm"
            onClick={handleOpenModal}
          >
            <Plus size={16} strokeWidth={1.5} />
            <span>Add Resource</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard 
          label="Total Resources" 
          value={materials.length} 
          icon={<BookOpen size={24} />}
        />
        <StatCard 
          label="Verified Access" 
          value={materials.filter(m => m.accessStatus === 'VERIFIED').length} 
          colorClass="text-olive"
          icon={<CheckCircle2 size={24} />}
        />
        <StatCard 
          label="Restricted Files" 
          value={materials.filter(m => m.accessStatus === 'RESTRICTED').length} 
          colorClass={materials.filter(m => m.accessStatus === 'RESTRICTED').length > 0 ? 'text-red-500' : 'text-ink-4'}
          icon={<AlertCircle size={24} />}
        />
      </div>

      <div className="mb-5 flex gap-3 flex-wrap">
        <div className="flex-auto min-w-[300px] relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
          <input 
            type="text" 
            placeholder="Search resources by title or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 pr-3 pl-11 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
          />
        </div>
        <button 
          onClick={handleRefresh}
          className="h-[46px] w-[46px] flex items-center justify-center rounded-xl bg-white border border-stone-deep text-navy hover:bg-stone transition-all shadow-sm group"
          title="Refresh Data"
        >
          <RefreshCcw size={18} className={loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform duration-500'} />
        </button>
      </div>

      <div className={`bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-6 py-4">Resource Info</th>
                <th className="font-normal px-6 py-4">Subject</th>
                <th className="font-normal px-6 py-4">Visibility</th>
                <th className="font-normal px-6 py-4">Drive Status</th>
                <th className="font-normal px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {!loading ? (
                filteredMaterials.map((material) => (
                  <tr key={material.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                          material.fileType === 'VIDEO' 
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-500' 
                            : 'bg-navy-wash border-navy-soft/20 text-navy'
                        }`}>
                          {material.fileType === 'VIDEO' ? <Video size={18} /> : <FileText size={18} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-navy leading-tight">{material.title}</span>
                          <span className="text-[11px] font-mono text-ink-4 uppercase mt-0.5">{material.fileType} Asset</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded bg-stone text-ink-3 text-[11px] font-bold font-mono border border-stone-deep uppercase">
                        {material.subject || 'GENERAL'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-ink-3">
                          <Globe size={12} />
                          <span className="text-[12px] font-medium">
                            {material.collegeId ? colleges.find(c => c.id === material.collegeId)?.name || 'Local Unit' : 'Global Access'}
                          </span>
                        </div>
                        {material.wing && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gold/60 uppercase tracking-tighter">
                              {material.wing} Wing
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {material.isDrive ? (
                        <div className="flex flex-col gap-1.5">
                          {getStatusBadge(material.accessStatus)}
                          <button 
                            onClick={() => handleRevalidate(material.id)}
                            disabled={revalidatingId === material.id}
                            className="flex items-center gap-1 text-[10px] font-bold text-ink-4 hover:text-navy transition-colors disabled:opacity-40"
                          >
                            <RefreshCw size={10} className={revalidatingId === material.id ? 'animate-spin' : ''} />
                            Check Access
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-ink-4 uppercase italic">Local Storage</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <a 
                          href={material.isDrive ? material.viewUrl : material.downloadUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-stone-2 text-navy hover:bg-stone-3 transition-colors" 
                          title="View Source"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button 
                          onClick={() => handleDelete(material.id)}
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-[#ef444410] text-[#ef4444] hover:bg-[#ef444420] transition-colors" 
                          title="Delete Resource"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center p-12 text-ink-4 font-mono text-[12px]">
                    Accessing Academic Repository...
                  </td>
                </tr>
              )}
              {!loading && filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-12 text-ink-4 font-ui">
                    No academic resources match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resource Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[600px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
            <div className="bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-navy text-white p-2 rounded-lg shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">
                    Add *Academic Resource*
                  </h3>
                  <p className="m-0 text-[12px] text-ink-4 font-ui mt-0.5">Link Google Drive files to the cadet portal.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Resource Title *</label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input 
                      required
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. Map Reading & Navigation Guide"
                      className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                    />
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Subject / Topic *</label>
                  <input 
                    required
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. Military History"
                    className="w-full h-[44px] px-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Resource Type *</label>
                  <select 
                    required
                    name="fileType"
                    value={formData.fileType}
                    onChange={(e) => setFormData({...formData, fileType: e.target.value})}
                    className="w-full h-[44px] px-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink shadow-sm"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="VIDEO">Video Lecture</option>
                    <option value="DOCUMENT">Other Manual</option>
                  </select>
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Google Drive URL *</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input 
                      required
                      type="url"
                      name="driveUrl"
                      value={formData.driveUrl}
                      onChange={(e) => setFormData({...formData, driveUrl: e.target.value})}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-4 font-medium italic">
                    <Info size={12} />
                    <span>Access will be automatically verified for "Anyone with the link".</span>
                  </div>
                </div>

                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Wing Visibility</label>
                  <select 
                    name="wing"
                    value={formData.wing}
                    onChange={(e) => setFormData({...formData, wing: e.target.value})}
                    className="w-full h-[44px] px-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink shadow-sm"
                  >
                    <option value="">All Wings</option>
                    <option value="ARMY">Army</option>
                    <option value="NAVY">Navy</option>
                    <option value="AIR">Air Force</option>
                  </select>
                </div>

                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">College Context</label>
                  <select 
                    name="collegeId"
                    value={formData.collegeId}
                    onChange={(e) => setFormData({...formData, collegeId: e.target.value})}
                    className="w-full h-[44px] px-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink shadow-sm"
                  >
                    <option value="">Global (All Colleges)</option>
                    {colleges.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
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
                  disabled={isSubmitting}
                  className="flex-[2] h-[50px] rounded-xl font-ui text-[15px] font-bold bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all shadow-lg shadow-navy/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    'Save Resource'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

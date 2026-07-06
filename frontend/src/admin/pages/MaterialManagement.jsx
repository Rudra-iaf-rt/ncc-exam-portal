import React, { useState, useRef } from 'react';
import { materialsApi, adminApi } from '../../api';
import { toast } from 'sonner';
import { PageHeader, StatCard } from '../components/Shared';
import { invalidateCachedResource } from '../../lib/resourceCache';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import CustomSelect from '../../components/CustomSelect';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
  Plus,
  Search,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  FileText,
  Video,
  Globe,
  XCircle,
  Building2,
  BookOpen,
  RefreshCcw,
  Upload,
  File,
  CloudUpload,
  HardDrive,
  Download,
  Edit,
} from 'lucide-react';

// ─── File size formatter ───────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Upload progress bar ───────────────────────────────────────────────────────

function UploadProgressBar({ progress }) {
  if (progress === null) return null;
  return (
    <div className="mt-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-mono text-ink-4 uppercase tracking-wider">
          Uploading to secure storage...
        </span>
        <span className="text-[11px] font-bold text-navy font-mono">{progress}%</span>
      </div>
      <div className="h-1.5 bg-stone-deep rounded-full overflow-hidden">
        <div
          className="h-full bg-navy rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Drag-and-drop file zone ──────────────────────────────────────────────────

const ACCEPTED_TYPES = [
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/mpeg',
  'video/quicktime',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

function FileDropZone({ file, onFileChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  };

  const handleFileInput = (e) => {
    const selected = e.target.files[0];
    if (selected) onFileChange(selected);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        w-full rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
        flex flex-col items-center justify-center gap-2 p-6
        ${isDragging
          ? 'border-navy bg-navy-wash scale-[1.01]'
          : file
            ? 'border-olive/50 bg-[#f0f4e8]'
            : 'border-stone-deep bg-stone hover:border-navy-soft hover:bg-navy-wash/40'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileInput}
      />

      {file ? (
        <>
          <div className="w-10 h-10 rounded-lg bg-olive/10 border border-olive/20 flex items-center justify-center text-olive">
            <CheckCircle2 size={22} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[14px] text-navy leading-tight truncate max-w-[260px]">
              {file.name}
            </p>
            <p className="text-[12px] text-ink-4 font-mono mt-0.5">
              {formatBytes(file.size)} · Click to change
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-lg bg-stone-mid border border-stone-deep flex items-center justify-center text-ink-4">
            <CloudUpload size={22} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[14px] text-ink-2">
              Drop file here or <span className="text-navy underline underline-offset-2">browse</span>
            </p>
            <p className="text-[11px] text-ink-4 font-mono mt-1">
              PDF, DOCX, PPTX, MP4, WEBM · Max 100 MB
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ material }) {
  if (material.isB2) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse" />
        <span className="text-[11px] font-bold text-navy uppercase tracking-tighter">
          B2 Cloud
        </span>
      </div>
    );
  }

  if (material.isDrive) {
    switch (material.accessStatus) {
      case 'VERIFIED':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-tighter">Drive</span>
            </div>
            <span className="text-[10px] text-olive font-bold">Verified</span>
          </div>
        );
      case 'RESTRICTED':
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="text-[11px] font-bold text-red-700 uppercase tracking-tighter">Drive</span>
            </div>
            <span className="text-[10px] text-red-500 font-bold">Restricted</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 opacity-50">
            <div className="w-1.5 h-1.5 rounded-full bg-stone-deep" />
            <span className="text-[11px] font-bold text-ink-4 uppercase tracking-tighter">Drive · Pending</span>
          </div>
        );
    }
  }

  return (
    <span className="text-[11px] font-bold text-ink-4 uppercase italic">Local</span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MaterialManagement() {
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    description: '',
    fileType: 'PDF',
    wing: '',
    collegeId: '',
    accessStatus: 'VERIFIED',
  });

  const { data, loading, refetch } = useCachedFetch(
    'admin-materials',
    async () => {
      const [mRes, cRes] = await Promise.all([
        materialsApi.list(),
        adminApi.getColleges(),
      ]);
      return {
        materials: mRes.data?.materials || [],
        colleges: cRes.data?.colleges || [],
      };
    },
    { staleTimeMs: 2 * 60 * 1000 }
  );

  const materials = data?.materials || [];
  const colleges = data?.colleges || [];

  const handleRefresh = () => refetch();

  const handleOpenModal = () => {
    setFormData({ title: '', subject: '', description: '', fileType: 'PDF', wing: '', collegeId: '', accessStatus: 'VERIFIED' });
    setSelectedFile(null);
    setUploadProgress(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (material) => {
    setFormData({
      title: material.title || '',
      subject: material.subject || '',
      description: material.description || '',
      fileType: material.fileType || 'PDF',
      wing: material.wing || '',
      collegeId: material.collegeId || '',
      accessStatus: material.accessStatus || 'VERIFIED',
    });
    setEditingMaterialId(material.id);
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      await materialsApi.upload(
        { ...formData, file: selectedFile },
        (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(pct);
        }
      );
      toast.success('Material uploaded successfully to secure cloud storage.');
      invalidateCachedResource('admin-materials');
      setIsModalOpen(false);
      handleRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Upload failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await materialsApi.update(editingMaterialId, formData);
      toast.success('Material metadata updated successfully.');
      invalidateCachedResource('admin-materials');
      setIsEditModalOpen(false);
      handleRefresh();
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Update failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Remove Resource',
      message: 'Are you sure you want to remove this academic resource? The file will also be deleted from cloud storage.',
      confirmText: 'Remove',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      await materialsApi.delete(id);
      toast.success('Resource removed');
      invalidateCachedResource('admin-materials');
      handleRefresh();
    } catch {
      toast.error('Deletion failed');
    }
  };

  const filteredMaterials = materials.filter(
    (m) =>
      m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const b2Count = materials.filter((m) => m.isB2).length;
  const verifiedCount = materials.filter((m) => m.accessStatus === 'VERIFIED').length;
  const restrictedCount = materials.filter((m) => m.accessStatus === 'RESTRICTED').length;

  return (
    <div className="w-full pb-10">
      <PageHeader
        title="Syllabus *Materials*"
        subtitle="Academic resources stored securely in cloud storage."
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
          label="Cloud Stored (B2)"
          value={b2Count}
          colorClass="text-olive"
          icon={<HardDrive size={24} />}
        />
        <StatCard
          label="Drive (Legacy)"
          value={materials.length - b2Count}
          colorClass={restrictedCount > 0 ? 'text-amber-500' : 'text-ink-4'}
          icon={<Globe size={24} />}
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
                <th className="font-normal px-6 py-4">Storage</th>
                <th className="font-normal px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {!loading ? (
                filteredMaterials.map((material) => (
                  <tr
                    key={material.id}
                    className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0"
                  >
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-ink-4 uppercase">
                              {material.fileType} Asset
                            </span>
                            {material.sizeBytes && (
                              <span className="text-[11px] text-ink-4">· {formatBytes(material.sizeBytes)}</span>
                            )}
                          </div>
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
                            {material.collegeId
                              ? colleges.find((c) => c.id === material.collegeId)?.name || 'Local Unit'
                              : 'Global Access'}
                          </span>
                        </div>
                        {material.wing && (
                          <span className="text-[10px] font-bold text-gold/60 uppercase tracking-tighter">
                            {material.wing} Wing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge material={material} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(material)}
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-stone-2 text-navy hover:bg-stone-3 transition-colors"
                          title="Edit Metadata"
                        >
                          <Edit size={14} />
                        </button>
                        <a
                          href={material.isB2 ? materialsApi.getViewUrl(material.id) : (material.viewUrl || material.downloadUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-stone-2 text-navy hover:bg-stone-3 transition-colors"
                          title="Preview Inline"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <a
                          href={material.isB2 ? materialsApi.getDownloadUrl(material.id) : material.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-stone-2 text-navy hover:bg-stone-3 transition-colors"
                          title="Download Resource"
                        >
                          <Download size={14} />
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

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[600px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200 rounded-2xl">
            <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="shrink-0 bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-navy text-white p-2 rounded-lg shadow-sm">
                  <CloudUpload size={20} />
                </div>
                <div>
                  <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">
                    Upload *Academic Resource*
                  </h3>
                  <p className="m-0 text-[12px] text-ink-4 font-ui mt-0.5">
                    Files are stored securely in Backblaze B2 cloud storage.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                type="button"
                className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors disabled:opacity-40"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* File drop zone — full width */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    File *
                  </label>
                  <FileDropZone file={selectedFile} onFileChange={setSelectedFile} />
                  <UploadProgressBar progress={uploadProgress} />
                </div>

                {/* Title */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Resource Title *
                  </label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Map Reading & Navigation Guide"
                      className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Subject / Topic *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Military History"
                    className="w-full h-[44px] px-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                  />
                </div>

                {/* File Type */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Resource Type *
                  </label>
                  <CustomSelect
                    value={formData.fileType}
                    onChange={(val) => setFormData({ ...formData, fileType: val })}
                    options={[
                      { value: 'PDF', label: 'PDF Document' },
                      { value: 'VIDEO', label: 'Video Lecture' },
                      { value: 'DOCUMENT', label: 'Other Manual' },
                    ]}
                  />
                </div>

                {/* Wing */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Wing Visibility
                  </label>
                  <CustomSelect
                    value={formData.wing}
                    onChange={(val) => setFormData({ ...formData, wing: val })}
                    options={[
                      { value: '', label: 'All Wings' },
                      { value: 'ARMY', label: 'Army' },
                      { value: 'NAVY', label: 'Navy' },
                      { value: 'AIR', label: 'Air Force' },
                    ]}
                  />
                </div>

                {/* College */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    College Context
                  </label>
                  <CustomSelect
                    value={formData.collegeId}
                    onChange={(val) => setFormData({ ...formData, collegeId: val })}
                    searchable
                    options={[
                      { value: '', label: 'Global (All Colleges)' },
                      ...colleges.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </div>
              </div>
              </div>
              <div className="shrink-0 p-4 sm:px-8 sm:py-6 bg-stone border-t border-stone-deep flex gap-4 mt-auto rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 h-[50px] rounded-xl font-ui text-[15px] font-medium border border-stone-deep text-ink-2 hover:bg-stone transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedFile}
                  className="flex-[2] h-[50px] rounded-xl font-ui text-[15px] font-bold bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all shadow-lg shadow-navy/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Upload size={18} className="animate-bounce" />
                      <span>Uploading{uploadProgress !== null ? ` ${uploadProgress}%` : '...'}</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload size={18} />
                      <span>Upload to Cloud</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[600px] max-h-[90vh] shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200 rounded-2xl">
            <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full h-full max-h-[90vh] flex flex-col overflow-hidden isolate">
            <div className="shrink-0 bg-stone border-b border-stone-mid px-6 py-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-navy text-white p-2 rounded-lg shadow-sm">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">
                    Edit *Metadata*
                  </h3>
                  <p className="m-0 text-[12px] text-ink-4 font-ui mt-0.5">
                    Update details about this resource. The file cannot be changed here.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
                type="button"
                className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors disabled:opacity-40"
              >
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Title */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Resource Title *
                  </label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-4" />
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Map Reading & Navigation Guide"
                      className="w-full h-[44px] pl-10 pr-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Subject / Topic *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Military History"
                    className="w-full h-[44px] px-4 rounded-xl border border-stone-deep bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4 shadow-sm"
                  />
                </div>

                {/* File Type */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Resource Type *
                  </label>
                  <CustomSelect
                    value={formData.fileType}
                    onChange={(val) => setFormData({ ...formData, fileType: val })}
                    options={[
                      { value: 'PDF', label: 'PDF Document' },
                      { value: 'VIDEO', label: 'Video Lecture' },
                      { value: 'DOCUMENT', label: 'Other Manual' },
                    ]}
                  />
                </div>

                {/* Wing */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Wing Visibility
                  </label>
                  <CustomSelect
                    value={formData.wing}
                    onChange={(val) => setFormData({ ...formData, wing: val })}
                    options={[
                      { value: '', label: 'All Wings' },
                      { value: 'ARMY', label: 'Army' },
                      { value: 'NAVY', label: 'Navy' },
                      { value: 'AIR', label: 'Air Force' },
                    ]}
                  />
                </div>

                {/* College */}
                <div className="col-span-1">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    College Context
                  </label>
                  <CustomSelect
                    value={formData.collegeId}
                    onChange={(val) => setFormData({ ...formData, collegeId: val })}
                    searchable
                    options={[
                      { value: '', label: 'Global (All Colleges)' },
                      ...colleges.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </div>

                {/* Access Status */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">
                    Access Status
                  </label>
                  <CustomSelect
                    value={formData.accessStatus}
                    onChange={(val) => setFormData({ ...formData, accessStatus: val })}
                    options={[
                      { value: 'VERIFIED', label: 'Verified (Accessible)' },
                      { value: 'RESTRICTED', label: 'Restricted (Hidden)' },
                      { value: 'PENDING', label: 'Pending Review' },
                    ]}
                  />
                </div>
              </div>
              </div>
              <div className="shrink-0 p-4 sm:px-8 sm:py-6 bg-stone border-t border-stone-deep flex gap-4 mt-auto rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 h-[50px] rounded-xl font-ui text-[15px] font-medium border border-stone-deep text-ink-2 hover:bg-stone-mid transition-all disabled:opacity-40"
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
                      <RefreshCcw size={18} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

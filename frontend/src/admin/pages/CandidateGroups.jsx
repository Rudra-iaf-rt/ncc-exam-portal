import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/Shared';
import { adminApi } from '../../api';
import { toast } from 'sonner';
import PageLoader from '../../components/PageLoader';
import { Layers, Plus, Edit2, Trash2, X, Users, AlertCircle, Loader2 } from 'lucide-react';
import MultiSelect from '../../components/MultiSelect';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function CandidateGroups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirm = useConfirm();

  // Form State
  const [form, setForm] = useState({
    name: '',
    description: '',
    isActive: true,
    collegeCodes: [],
    memberIds: []
  });

  const [filterOptions, setFilterOptions] = useState({ colleges: [] });
  const [cadets, setCadets] = useState([]);
  const [searchingCadets, setSearchingCadets] = useState(false);
  const [hasLoadedAllCadets, setHasLoadedAllCadets] = useState(false);
  const [isFetchingGroup, setIsFetchingGroup] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [groupsRes, filtersRes] = await Promise.all([
        adminApi.getGroups(),
        adminApi.getFilters()
      ]);
      setGroups(groupsRes.data.groups || []);
      setFilterOptions({
        colleges: filtersRes.data.colleges || []
      });
    } catch (err) {
      toast.error('Failed to load candidate groups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCadets = async () => {
    setSearchingCadets(true);
    try {
      const { data } = await adminApi.searchUsers({ limit: 5000 });
      setCadets(data.users || data);
    } catch (err) {
      toast.error("Failed to load cadets");
    } finally {
      setSearchingCadets(false);
    }
  };

  const handleOpenModal = async (group = null) => {
    if (group) {
      setEditingGroup(group);
      setForm({
        name: group.name,
        description: group.description || '',
        isActive: group.isActive,
        collegeCodes: [],
        memberIds: []
      });
      setIsModalOpen(true);
      setIsFetchingGroup(true);
      
      try {
        const { data } = await adminApi.getGroup(group.id);
        const prePopulatedCadets = data.members.map(m => m.user);
        
        if (!hasLoadedAllCadets && prePopulatedCadets.length > 0) {
          setCadets(prePopulatedCadets);
        }

        setForm(prev => ({
          ...prev,
          collegeCodes: data.colleges.map(c => c.collegeCode),
          memberIds: data.members.map(m => m.userId.toString())
        }));
      } catch(err) {
        toast.error("Failed to load group details");
      } finally {
        setIsFetchingGroup(false);
      }
    } else {
      setEditingGroup(null);
      setForm({ name: '', description: '', isActive: true, collegeCodes: [], memberIds: [] });
      setIsModalOpen(true);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        memberIds: form.memberIds.map(id => parseInt(id)),
      };

      if (editingGroup) {
        await adminApi.updateGroup(editingGroup.id, payload);
        toast.success('Group updated successfully');
      } else {
        await adminApi.createGroup(payload);
        toast.success('Group created successfully');
      }
      setIsModalOpen(false);
      fetchData(false);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group? This action cannot be undone.',
      confirmText: 'Delete',
      isDanger: true
    });
    
    if (!confirmed) return;
    
    try {
      await adminApi.deleteGroup(id);
      toast.success('Group deleted');
      fetchData(false);
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  if (loading) return <PageLoader text="Loading Candidate Groups..." />;

  return (
    <div className="w-full pb-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <PageHeader 
          title="Candidate *Groups*"
          subtitle="Create and manage reusable sets of cadets and colleges for exam scheduling."
        />
        <button
          onClick={() => handleOpenModal()}
          className="h-[40px] px-5 rounded-lg bg-navy text-white font-ui font-medium text-[14px] flex items-center gap-2 hover:bg-navy-mid transition-all shadow-sm"
        >
          <Plus size={18} />
          Create Group
        </button>
      </div>

      <div className="bg-white border border-stone-deep rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-mid bg-stone-wash/50 text-[11px] uppercase tracking-wider text-ink-4 font-mono">
                <th className="py-4 px-6 font-semibold">Group Name</th>
                <th className="py-4 px-6 font-semibold">Description</th>
                <th className="py-4 px-6 font-semibold text-center">Colleges</th>
                <th className="py-4 px-6 font-semibold text-center">Cadets</th>
                <th className="py-4 px-6 font-semibold text-center">Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-mid">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-ink-4">
                    <Layers size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="font-ui text-[14px] font-medium">No groups found</p>
                    <p className="text-[12px]">Create your first reusable group to get started.</p>
                  </td>
                </tr>
              ) : (
                groups.map(group => (
                  <tr key={group.id} className="hover:bg-stone-wash/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-ui font-bold text-navy text-[14px]">{group.name}</div>
                      <div className="text-[11px] text-ink-4 mt-0.5">Created by {group.createdBy?.name || 'Unknown'}</div>
                    </td>
                    <td className="py-4 px-6 text-[13px] text-ink-3 max-w-xs truncate">
                      {group.description || <span className="italic opacity-50">No description</span>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-wash border border-stone text-[12px] font-medium text-navy">
                        <Layers size={14} />
                        {group.collegeCount}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-wash border border-stone text-[12px] font-medium text-navy">
                        <Users size={14} />
                        {group.memberCount}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${group.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-500 border border-stone-200'}`}>
                        {group.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(group)}
                          className="p-1.5 text-navy hover:bg-navy/10 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="p-1.5 text-crimson hover:bg-crimson/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] overflow-y-auto p-4 sm:p-6 flex">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl m-auto flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-stone flex justify-between items-center bg-stone-wash/30 rounded-t-xl">
              <div>
                <h2 className="font-display font-bold text-navy text-xl">
                  {editingGroup ? 'Edit Group' : 'Create Group'}
                </h2>
                <p className="text-[13px] text-ink-4 mt-1">
                  Define a reusable set of colleges and individual cadets.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-ink-4 hover:text-ink transition-colors p-2 hover:bg-stone rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div className="relative">
              {isFetchingGroup && (
                <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-b-xl">
                  <Loader2 size={32} className="animate-spin text-navy" />
                  <span className="font-ui font-medium text-navy mt-3">Loading details...</span>
                </div>
              )}
              <form onSubmit={handleSave} className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column: Basic Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[15px] font-bold text-navy mb-4 border-b border-stone-deep pb-2">Basic Details</h3>
                    <div className="space-y-5">
                      <div>
                        <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Group Name *</label>
                        <input
                          required
                          type="text"
                          value={form.name}
                          onChange={e => setForm({...form, name: e.target.value})}
                          placeholder="e.g., Alpha Wing 2026 Batch"
                          className="w-full h-[46px] px-4 bg-white border border-stone-deep hover:border-navy-soft/50 rounded-xl text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all shadow-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Description</label>
                        <textarea
                          value={form.description}
                          onChange={e => setForm({...form, description: e.target.value})}
                          placeholder="Brief description of this group..."
                          rows={3}
                          className="w-full px-4 py-3 bg-white border border-stone-deep hover:border-navy-soft/50 rounded-xl text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all resize-none shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-stone-wash rounded-xl border border-stone-deep transition-colors hover:border-navy-soft/30 cursor-pointer" onClick={() => setForm({...form, isActive: !form.isActive})}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={form.isActive}
                      onChange={e => setForm({...form, isActive: e.target.checked})}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 mt-0.5 rounded border-stone-deep accent-navy cursor-pointer"
                    />
                    <div>
                      <label htmlFor="isActive" className="block font-ui text-[14px] font-medium text-navy cursor-pointer">
                        Group is Active
                      </label>
                      <p className="text-[12px] text-ink-4 mt-0.5">Inactive groups cannot be assigned to new exams.</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Selections */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[15px] font-bold text-navy mb-4 border-b border-stone-deep pb-2">Group Members</h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Included Colleges</label>
                        <p className="text-[12px] text-ink-4 mb-2 leading-relaxed">All cadets in these colleges will be included automatically.</p>
                        <MultiSelect
                          placeholder="Select colleges..."
                          options={filterOptions.colleges.map(c => ({ value: c.code, label: `${c.name} (${c.code})` }))}
                          selectedValues={form.collegeCodes}
                          onChange={(vals) => setForm({...form, collegeCodes: vals})}
                          searchable={true}
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-1.5">Included Cadets (Specific)</label>
                        <p className="text-[12px] text-ink-4 mb-2 leading-relaxed">Add specific cadets individually, regardless of their college.</p>
                        <MultiSelect
                          placeholder="Select cadets..."
                          options={cadets.map(c => ({ value: c.id.toString(), label: `${c.name} (${c.regimentalNumber})` }))}
                          selectedValues={form.memberIds}
                          onChange={(vals) => setForm({...form, memberIds: vals})}
                          searchable={true}
                          isLoading={searchingCadets}
                          onOpen={async () => {
                            if (!hasLoadedAllCadets) {
                              await loadCadets();
                              setHasLoadedAllCadets(true);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-stone-deep bg-stone-wash/20 -mx-6 -mb-6 p-6 rounded-b-xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[13px] font-medium text-ink-3 hover:text-navy transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting || isFetchingGroup} className="px-5 py-2.5 bg-navy text-white text-[13px] font-medium rounded-lg hover:bg-navy-soft transition-colors disabled:opacity-50 min-w-[120px]">
                  {isSubmitting ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
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

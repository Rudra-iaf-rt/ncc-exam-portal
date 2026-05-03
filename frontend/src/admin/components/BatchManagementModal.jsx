import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../api';
import { X, Plus, Trash2, Calendar, Loader2, Check, AlertCircle } from 'lucide-react';

export default function BatchManagementModal({ isOpen, onClose }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getBatches();
      setBatches(data || []);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBatches();
    }
  }, [isOpen]);

  const handleAddBatch = async (e) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    setSubmitting(true);
    try {
      await adminApi.createBatch({ name: newBatchName.trim() });
      toast.success(`Batch ${newBatchName} created`);
      setNewBatchName('');
      fetchBatches();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBatch = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete batch ${name}? This will NOT delete cadets, but they will no longer be associated with this batch in the system.`)) {
      return;
    }

    try {
      await adminApi.deleteBatch(id);
      toast.success(`Batch ${name} deleted`);
      fetchBatches();
    } catch (error) {
      toast.error('Failed to delete batch');
    }
  };

  const toggleBatchStatus = async (batch) => {
    try {
      await adminApi.updateBatch(batch.id, { isActive: !batch.isActive });
      fetchBatches();
    } catch (error) {
      toast.error('Failed to update batch status');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[500px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
        <div className="bg-stone border-b border-stone-mid px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-navy text-white p-1.5 rounded-lg">
              <Calendar size={18} />
            </div>
            <h3 className="m-0 text-[16px] text-navy font-semibold font-ui tracking-tight">Batch Management</h3>
          </div>
          <button onClick={onClose} className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleAddBatch} className="mb-6">
            <label className="block font-mono text-[10px] tracking-[0.1em] uppercase text-ink-3 mb-2">Create New Batch</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 2025-26"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="flex-1 h-[42px] px-4 border border-stone-deep rounded-xl font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4 shadow-sm"
                required
              />
              <button
                type="submit"
                disabled={submitting || !newBatchName.trim()}
                className="w-[42px] h-[42px] rounded-xl flex items-center justify-center bg-navy text-[#F4F0E4] hover:bg-navy-mid transition-all shadow-md shadow-navy/10 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-ink-4 font-ui italic">Standardize formats like "2025-26" to avoid data entry inconsistency.</p>
          </form>

          <div className="border border-stone-deep rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3 text-ink-4">
                  <Loader2 size={24} className="animate-spin" />
                  <span className="text-[12px] font-mono uppercase tracking-widest">Fetching Batches</span>
                </div>
              ) : batches.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3 text-ink-4 italic text-[14px]">
                  <AlertCircle size={24} className="opacity-20" />
                  <span>No batches defined yet.</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone/50 border-b border-stone-deep font-mono text-[10px] tracking-[0.05em] uppercase text-ink-4">
                      <th className="px-4 py-2 font-normal">Batch Name</th>
                      <th className="px-4 py-2 font-normal">Status</th>
                      <th className="px-4 py-2 font-normal text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-[13px] text-ink-2">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="border-b border-stone-mid last:border-b-0 hover:bg-stone-wash transition-colors">
                        <td className="px-4 py-3 font-medium text-navy">{batch.name}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => toggleBatchStatus(batch)}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              batch.isActive ? 'bg-olive/10 text-olive hover:bg-olive/20' : 'bg-stone-3/20 text-ink-4 hover:bg-stone-3/30'
                            }`}
                          >
                            <Check size={12} className={batch.isActive ? 'opacity-100' : 'opacity-0'} />
                            {batch.isActive ? 'Active' : 'Archived'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteBatch(batch.id, batch.name)}
                            className="p-1.5 text-ink-4 hover:text-[#ef4444] hover:bg-[#ef444410] rounded-md transition-all"
                            title="Delete Batch"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="bg-stone border-t border-stone-mid px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 h-[38px] rounded-lg font-ui text-[14px] font-medium bg-white border border-stone-deep text-ink-2 hover:bg-stone-deep transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

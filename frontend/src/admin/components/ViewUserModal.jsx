import { useState } from 'react';
import { adminApi } from '../../api';
import { useCachedFetch } from '../../hooks/useCachedFetch';
import { invalidateCachedResourcePattern } from '../../lib/resourceCache';
import CadetProfileView from '../../components/profile/CadetProfileView';
import { X, Pencil, ShieldAlert, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ViewUserModal({ isOpen, onClose, user, onEdit, onRefresh }) {
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Fetch performance stats specific to this user
  const { data: statsData, loading: loadingStats } = useCachedFetch(
    `admin-user-stats-${user?.id}`,
    async () => {
      if (!user?.id) return null;
      const res = await adminApi.getUserStats(user.id);
      return res.data;
    },
    { staleTimeMs: 2 * 60 * 1000, enabled: isOpen && !!user?.id }
  );

  if (!isOpen || !user) return null;

  const handleToggleStatus = async () => {
    setTogglingStatus(true);
    try {
      await adminApi.updateUser(user.id, { isActive: !user.isActive });
      toast.success(`User ${!user.isActive ? 'enabled' : 'disabled'} successfully.`);
      invalidateCachedResourcePattern('admin-users-students');
      invalidateCachedResourcePattern(`admin-user-stats-${user.id}`);
      onRefresh?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update status.');
    } finally {
      setTogglingStatus(false);
    }
  };

  const adminActions = [
    {
      icon: Pencil,
      label: 'Edit Cadet Details',
      onClick: () => {
        onClose();
        onEdit(user);
      }
    },
    {
      icon: user.isActive ? ShieldAlert : ShieldCheck,
      label: user.isActive ? 'Disable Account' : 'Enable Account',
      onClick: handleToggleStatus,
      actionElement: togglingStatus ? <span className="text-[12px] text-ink-4">Updating...</span> : null
    }
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0E1929]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FDFCF8] border border-stone-deep rounded-2xl w-full max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="shrink-0 bg-stone border-b border-stone-mid px-6 py-4 flex justify-between items-center">
          <h3 className="m-0 text-[18px] text-navy font-semibold font-ui tracking-tight">
            Cadet Profile
          </h3>
          <button onClick={onClose} type="button" className="text-ink-4 hover:bg-stone-mid hover:text-ink p-1.5 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content using our Shared Presentation Component */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-wash">
          <CadetProfileView 
            user={user}
            stats={statsData}
            loadingStats={loadingStats}
            actions={adminActions}
          />
        </div>

      </div>
    </div>
  );
}

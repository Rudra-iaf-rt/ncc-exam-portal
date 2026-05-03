import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { useAdminAuth } from '../../contexts/AdminAuth';
import { toast } from 'sonner';
import { PageHeader } from '../components/Shared';
import { 
  UserPlus,
  FileUp,
  Pencil,
  Trash2,
  Search,
  ShieldAlert
} from 'lucide-react';
import BulkImport from '../components/BulkImport';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';
import BatchManagementModal from '../components/BatchManagementModal';
import { Calendar } from 'lucide-react';

export default function UserManagement() {
  const { user } = useAdminAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [wingFilter, setWingFilter] = useState('ALL');

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const handleDelete = async (id, name) => {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${name}? All their exam attempts, results, and assignments will be purged.`)) {
      return;
    }

    try {
      await adminApi.deleteUser(id);
      toast.success(`${name} has been permanently removed.`);
      handleRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openEdit = (user) => {
    if (!isAdmin) return;
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const filteredUsers = users.filter(u => {
    const name = u.name || '';
    const regNo = u.regimentalNumber || '';
    const email = u.email || '';
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      regNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWing = wingFilter === 'ALL' || (u.wing && u.wing === wingFilter);
    
    return matchesSearch && matchesWing;
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await adminApi.getUsers({ role: 'STUDENT' });
        if (data) setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [refreshKey]);

  return (
    <div className="w-full pb-10">
      <PageHeader 
        title="Cadets"
        subtitle={isAdmin ? "Centralized record of all enrolled students." : `Student records for ${user?.college || 'your college'}.`}
        action={isAdmin && (
          <div className="flex gap-3">
            <button 
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-transparent border border-stone-deep text-ink-2 hover:bg-stone hover:text-navy"
              onClick={() => setIsImportOpen(true)}
            >
              <FileUp size={16} strokeWidth={1.5} />
              <span>Bulk Import</span>
            </button>
            <button 
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-transparent border border-stone-deep text-ink-2 hover:bg-stone hover:text-navy"
              onClick={() => setIsBatchOpen(true)}
            >
              <Calendar size={16} strokeWidth={1.5} />
              <span>Manage Batches</span>
            </button>
            <button 
              className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid"
              onClick={() => setIsAddOpen(true)}
            >
              <UserPlus size={16} strokeWidth={1.5} />
              <span>Add Cadet</span>
            </button>
          </div>
        )}
      />

      <AddUserModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onRefresh={handleRefresh}
      />

      {isEditOpen && (
        <EditUserModal 
          key={selectedUser?.id || 'new'}
          isOpen={isEditOpen} 
          user={selectedUser}
          onRefresh={() => {
            handleRefresh();
          }}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedUser(null);
          }} 
        />
      )}

      <BulkImport 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onRefresh={handleRefresh}
      />

      <BatchManagementModal 
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
      />

      <div className="mb-5 flex gap-3 flex-wrap">
        <div className="flex-auto min-w-[300px] relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input 
            type="text" 
            placeholder="Search by name, regimental number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 pr-3 pl-10 rounded-xl border border-stone-3 bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4"
          />
        </div>
        <select 
          value={wingFilter}
          onChange={(e) => setWingFilter(e.target.value)}
          className="px-4 rounded-xl border border-stone-3 bg-white font-ui text-[14px] min-w-[140px] h-[46px] flex-none outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink"
        >
          <option value="ALL">All Wings</option>
          <option value="ARMY">Army Wing</option>
          <option value="NAVY">Navy Wing</option>
          <option value="AIR">Air Wing</option>
        </select>
      </div>

      {users.length === 0 && !loading && (
        <div className="p-6 border-l-4 border-gold bg-[#c9982a]/5 mb-10 rounded-md shadow-sm">
          <div className="flex gap-4">
            <ShieldAlert size={24} className="text-gold" />
            <div>
              <h2 className="text-navy m-0 mb-2 text-[18px] font-semibold font-ui">No Cadets Found</h2>
              <p className="text-[14px] text-ink-4 m-0 leading-[1.6] font-ui">
                No registered cadets or administrators found in the database. New users must register via the student portal or be added manually.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-10 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3">Name</th>
                <th className="font-normal px-4 py-3">Regimental / ID</th>
                <th className="font-normal px-4 py-3">Wing</th>
                <th className="font-normal px-4 py-3">Status</th>
                <th className="font-normal px-4 py-3">College</th>
                {isAdmin && <th className="font-normal px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {!loading ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{user.name}</div>
                      {user.yearOfStudy && (
                        <div className="text-[10px] text-ink-4 mt-0.5 flex items-center gap-1">
                          <span className="px-1.5 py-0.5 bg-stone-deep rounded uppercase tracking-tighter font-bold">Year {user.yearOfStudy}</span>
                          {user.batch && <span className="opacity-40">·</span>}
                          {user.batch && <span>Batch {user.batch}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><code className="font-mono text-[12px] bg-transparent p-0 text-ink-3 tracking-wide">{user.regimentalNumber || user.email || 'N/A'}</code></td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex ${
                        user.wing?.toUpperCase() === 'ARMY' ? 'bg-[#ef444420] text-[#b91c1c] border border-[#b91c1c30]' :
                        user.wing?.toUpperCase() === 'NAVY' ? 'bg-[#3b82f620] text-[#1d4ed8] border border-[#1d4ed830]' :
                        user.wing?.toUpperCase() === 'AIR' ? 'bg-[#06b6d420] text-[#0891b2] border border-[#0891b230]' :
                        'bg-stone-mid text-ink-3 border border-stone-deep'
                      }`}>
                        {user.wing || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-olive' : 'bg-stone-3'}`} />
                        <span className={`text-[12px] ${user.isActive ? 'text-navy font-medium' : 'text-ink-4'}`}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[13px]">
                      <div className="truncate max-w-[150px]" title={user.college}>{user.college}</div>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button 
                            onClick={() => openEdit(user)}
                            className="w-8 h-8 rounded-md flex items-center justify-center bg-stone-2 text-navy hover:bg-stone-3 transition-colors" 
                            title="Edit User"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id, user.name)}
                            className="w-8 h-8 rounded-md flex items-center justify-center bg-[#ef444410] text-[#ef4444] hover:bg-[#ef444420] transition-colors" 
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center p-10 text-ink-4 font-mono text-[12px]">
                    Accessing Secure Database...
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && users.length > 0 && (
                <tr>
                  <td colSpan="6" className="text-center p-10 text-ink-4 font-ui">
                    No records matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

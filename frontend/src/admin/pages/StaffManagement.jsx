import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { toast } from 'sonner';
import { PageHeader } from '../components/Shared';
import { 
  UserCheck,
  Plus,
  Pencil,
  Trash2,
  Search,
  Building,
  Mail,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data } = await adminApi.getStaff();
        if (data) setStaff(data);
      } catch (error) {
        console.error('Failed to fetch staff:', error);
        toast.error('Failed to load instructor registry');
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [refreshKey]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the instructor registry? They will lose all administrative access.`)) {
      return;
    }

    try {
      await adminApi.deleteUser(id);
      toast.success(`${name} has been removed.`);
      handleRefresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const openEdit = (user) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const filteredStaff = staff.filter(u => {
    const name = u.name || '';
    const email = u.email || '';
    const college = u.college || '';
    
    return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="max-w-[1000px]">
      <PageHeader 
        title="Instructor *Registry*"
        subtitle="Command and administrative staff across all units."
        action={
          <button 
            className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-navy text-[#F4F0E4] hover:bg-navy-mid"
            onClick={() => setIsAddOpen(true)}
          >
            <Plus size={16} strokeWidth={1.5} />
            <span>Add Instructor</span>
          </button>
        }
      />

      <AddUserModal 
        isOpen={isAddOpen} 
        onClose={() => setIsAddOpen(false)} 
        onRefresh={handleRefresh}
        initialRole="INSTRUCTOR"
      />

      {isEditOpen && (
        <EditUserModal 
          key={selectedUser?.id || 'new'}
          isOpen={isEditOpen} 
          user={selectedUser}
          onRefresh={handleRefresh}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedUser(null);
          }} 
        />
      )}

      <div className="mb-5 flex gap-3 flex-wrap">
        <div className="flex-auto min-w-[300px] relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input 
            type="text" 
            placeholder="Search by name, email, or college code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-3 pr-3 pl-10 rounded-xl border border-stone-3 bg-white font-ui text-[14px] outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all text-ink placeholder:text-ink-4"
          />
        </div>
      </div>

      {!loading && staff.length === 0 && (
        <div className="p-6 border-l-4 border-gold bg-[#c9982a]/5 mb-10 rounded-md shadow-sm">
          <div className="flex gap-4">
            <AlertCircle size={24} className="text-gold" />
            <div>
              <h2 className="text-navy m-0 mb-2 text-[18px] font-semibold font-ui">No Instructors</h2>
              <p className="text-[14px] text-ink-4 m-0 leading-[1.6] font-ui">
                The instructor registry is currently empty. Use the "Add Instructor" button to provision accounts for officers and ANOs.
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
                <th className="font-normal px-4 py-3">Email / Contact</th>
                <th className="font-normal px-4 py-3">Assigned College</th>
                <th className="font-normal px-4 py-3">Status</th>
                <th className="font-normal px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {!loading ? (
                filteredStaff.map((user) => (
                  <tr key={user.id} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                    <td className="px-4 py-3 font-medium text-navy">
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        {user.role === 'ADMIN' && (
                          <ShieldCheck size={14} className="text-gold" title="System Administrator" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-ink-3">
                        <Mail size={13} />
                        <span>{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.college ? (
                        <span className="font-mono text-[11px] font-bold bg-navy-wash text-navy px-2 py-1 rounded border border-navy-soft/20 uppercase">
                          {user.college}
                        </span>
                      ) : (
                        <span className="text-ink-4 text-[12px] italic">No College Assigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-olive' : 'bg-stone-3'}`} />
                        <span className={`text-[12px] ${user.isActive ? 'text-navy font-medium' : 'text-ink-4'}`}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => openEdit(user)}
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-stone-2 text-navy hover:bg-stone-3 transition-colors" 
                          title="Edit Instructor"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id, user.name)}
                          className="w-8 h-8 rounded-md flex items-center justify-center bg-[#ef444410] text-[#ef4444] hover:bg-[#ef444420] transition-colors" 
                          title="Remove Instructor"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center p-10 text-ink-4 font-mono text-[12px]">
                    Accessing Secure Staff Registry...
                  </td>
                </tr>
              )}
              {!loading && filteredStaff.length === 0 && staff.length > 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-10 text-ink-4 font-ui">
                    No matching instructors found.
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

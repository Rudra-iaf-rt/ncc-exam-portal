import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { Search, Clock, User, Activity, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/Shared';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getLogs();
      const data = response.data || response;
      
      // Handle both { logs: [...] } and raw [...] formats
      if (data && data.logs && Array.isArray(data.logs)) {
        setLogs(data.logs);
      } else if (Array.isArray(data)) {
        setLogs(data);
      } else {
        console.warn("Unexpected logs format:", data);
        setLogs([]);
      }
    } catch (err) {
      console.error("Fetch Logs Error:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = (Array.isArray(logs) ? logs : []).filter(log => {
    if (!log) return false;
    const searchStr = filter.toLowerCase();
    const action = String(log.action || '').toLowerCase();
    const actor = String(log.user?.name || log.userId || 'SYSTEM').toLowerCase();
    const path = String(log.path || '').toLowerCase();
    
    return action.includes(searchStr) || 
           actor.includes(searchStr) || 
           path.includes(searchStr);
  });

  return (
    <div>
      <PageHeader 
        title="System *Audit Logs*" 
        subtitle="Traceability record for all administrative actions and security events."
        action={
          <button className="h-[36px] px-[18px] rounded-md font-ui text-[13px] font-medium flex items-center gap-2 transition-all bg-transparent border border-stone-deep text-ink-2 hover:bg-stone hover:text-navy" onClick={fetchLogs} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh Logs</span>
          </button>
        }
      />

      <div className="bg-white border border-stone-deep rounded-md p-5 mb-6 shadow-sm">
        <div className="relative max-w-[400px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
          <input 
            type="text" 
            className="w-full h-[38px] pl-10 pr-3 border border-stone-deep rounded-md font-ui text-[14px] text-ink bg-white outline-none focus:border-navy-soft focus:ring-[3px] focus:ring-navy-wash transition-all placeholder:text-ink-4" 
            placeholder="Search action, actor, or payload..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-stone-deep rounded-md shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone border-b border-stone-deep font-mono text-[11px] tracking-[0.1em] uppercase text-ink-4">
                <th className="font-normal px-4 py-3 w-[200px]">Timestamp</th>
                <th className="font-normal px-4 py-3 w-[100px]">Actor</th>
                <th className="font-normal px-4 py-3 w-[180px]">Action</th>
                <th className="font-normal px-4 py-3">Resource / Context</th>
                <th className="font-normal px-4 py-3 w-[100px]">Level</th>
              </tr>
            </thead>
            <tbody className="font-ui text-[13.5px] text-ink-2">
              {loading ? (
                <tr><td colSpan="5" className="text-center p-14 text-ink-4">Loading system logs...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="5" className="text-center p-14 text-ink-4">No events recorded matching your search filters.</td></tr>
              ) : (
                filteredLogs.map((log, i) => {
                  const timestamp = log.createdAt || log.timestamp;
                  const actor = log.user?.name || log.userId || 'SYSTEM';
                  const level = log.statusCode >= 500 ? 'ERROR' : log.statusCode >= 400 ? 'WARN' : 'AUDIT';
                  const resource = log.path || `${log.entityType || ''} ${log.entityId || ''}`.trim();
                  
                  return (
                    <tr key={i} className="border-b border-stone-mid hover:bg-stone-wash transition-colors last:border-b-0">
                      <td className="px-4 py-3 text-[12px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-ink-2">
                          <Clock size={12} className="text-ink-4" />
                          {new Date(timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-ink-4" />
                          <span className="font-mono text-[11px] font-medium text-ink-2">
                            {actor}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-navy text-[13px]">{log.action}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-ink-3 max-w-[450px] truncate bg-stone px-2 py-1 rounded border border-stone-mid">
                          {resource || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[10px] tracking-[0.06em] py-1 px-2.5 rounded-full font-medium inline-flex ${
                          level === 'ERROR' ? 'bg-[#ef444420] text-[#b91c1c] border border-[#b91c1c30]' : 
                          level === 'AUDIT' ? 'bg-[#3b82f620] text-[#1d4ed8] border border-[#1d4ed830]' : 
                          level === 'WARN' ? 'bg-[#f59e0b20] text-[#b45309] border border-[#f59e0b30]' : 
                          'bg-stone-mid text-ink-3 border border-stone-deep'
                        }`}>
                          {level}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[11px] text-ink-4 flex items-center gap-1.5 font-ui">
        <Activity size={12} />
        <span>Displaying the latest {filteredLogs.length} system events.</span>
      </div>
    </div>
  );
}

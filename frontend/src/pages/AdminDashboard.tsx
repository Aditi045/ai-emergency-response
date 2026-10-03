import React, { useState, useEffect } from 'react';
import { Users, Shield, Lock, Clock, RefreshCw, FileText } from 'lucide-react';
import { api } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [uList, aLogs] = await Promise.all([
        api.admin.users(),
        api.admin.auditLogs(),
      ]);
      setUsers(uList);
      setAuditLogs(aLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await api.admin.changeRole(userId, newRole);
      alert('User role updated successfully.');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            System Administration & Immutable Audit Trail
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            Access Control (RBAC) & Audit Integrity
          </h1>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Reload</span>
        </button>
      </div>

      {/* User Management Table (Section 41) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            User Accounts & Role Permissions ({users.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Active Role</th>
                <th className="p-3 text-right">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-bold text-white">
                    {u.full_name}
                  </td>
                  <td className="p-3 font-mono text-slate-300">
                    {u.email}
                  </td>
                  <td className="p-3 text-slate-400">
                    {u.organization || 'General Public'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 border border-slate-700 text-amber-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="DISPATCHER">DISPATCHER</option>
                      <option value="ANALYST">ANALYST</option>
                      <option value="RESPONDER">RESPONDER</option>
                      <option value="CITIZEN">CITIZEN</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Immutable Audit Logs Table (Section 47) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Immutable System Audit Logs ({auditLogs.length} Events)
            </h2>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            Cryptographically timestamped & immutable
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase sticky top-0">
              <tr>
                <th className="p-3">Timestamp (UTC)</th>
                <th className="p-3">Action</th>
                <th className="p-3">Actor Email</th>
                <th className="p-3">Actor Role</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {log.timestamp ? new Date(log.timestamp).toISOString() : '-'}
                  </td>
                  <td className="p-3 font-mono font-bold text-amber-300">
                    {log.action}
                  </td>
                  <td className="p-3 text-slate-300">
                    {log.user_email}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {log.user_role}
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {log.entity_type}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                    {log.new_state ? JSON.stringify(log.new_state) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

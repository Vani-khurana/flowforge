import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { AuditLog } from '../types';
import { Search, Code, Clock } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', actionFilter, search],
    queryFn: async () => {
      const res = await api.get('/audit', {
        params: {
          action: actionFilter,
          search: search || undefined,
          limit: 50,
        },
      });
      return res.data.data;
    },
  });

  const logs = data || [];

  const getActionBadgeColor = (action: string) => {
    if (action.includes('APPROVED') || action.includes('COMPLETED')) {
      return 'bg-brand-500/15 text-brand-400 border-brand-500/30';
    }
    if (action.includes('REJECTED')) {
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    }
    if (action.includes('CANCELLED')) {
      return 'bg-forge-800 text-forge-400 border-forge-700';
    }
    return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-white tracking-tight">System Audit Trail</h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
            Immutable Trace
          </span>
        </div>
        <p className="text-xs text-forge-400">
          Complete, tamper-evident chronological ledger of all organizational request decisions, workflow movements, and user actions.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-forge-900/60 border border-forge-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-forge-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, ID, or actor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-forge-950/80 border border-forge-700/80 rounded-xl px-3 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Actions</option>
            <option value="REQUEST_SUBMITTED">REQUEST_SUBMITTED</option>
            <option value="REQUEST_APPROVED">REQUEST_APPROVED</option>
            <option value="REQUEST_REJECTED">REQUEST_REJECTED</option>
            <option value="REQUEST_COMPLETED">REQUEST_COMPLETED</option>
            <option value="REQUEST_CANCELLED">REQUEST_CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-forge-900/60 border border-forge-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-forge-950/70 text-forge-400 uppercase font-semibold border-b border-forge-800">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Target Entity</th>
                <th className="px-5 py-3.5">Entity ID</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-forge-400">
                    <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-500" />
                    <span>Loading audit trail...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-forge-400">
                    No audit records match your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-forge-800/40 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 text-forge-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-white">{log.userName || 'System'}</td>
                    <td className="px-5 py-3.5">
                      <Badge role={log.userRole} />
                    </td>
                    <td className="px-5 py-3.5 text-forge-300 font-medium">{log.entity}</td>
                    <td className="px-5 py-3.5 font-mono text-forge-200">{log.entityId}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-brand-400 hover:text-brand-300">
                      <Code className="w-4 h-4 ml-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Details Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Event Details"
        subtitle={`Audit ID: ${selectedLog?.id} • Action: ${selectedLog?.action}`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-forge-950 border border-forge-800 text-xs">
            <div>
              <span className="text-[10px] text-forge-400 uppercase font-semibold block">Actor</span>
              <span className="font-bold text-white">{selectedLog?.userName}</span> ({selectedLog?.userRole})
            </div>
            <div>
              <span className="text-[10px] text-forge-400 uppercase font-semibold block">Timestamp</span>
              <span className="text-forge-200">
                {selectedLog?.createdAt ? new Date(selectedLog.createdAt).toLocaleString() : ''}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-forge-400 uppercase font-semibold block">Entity</span>
              <span className="text-forge-200">{selectedLog?.entity}</span>
            </div>
            <div>
              <span className="text-[10px] text-forge-400 uppercase font-semibold block">Entity ID</span>
              <span className="font-mono text-brand-400">{selectedLog?.entityId}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Event Payload & Metadata (JSON)
            </label>
            <pre className="p-4 rounded-xl bg-forge-950 border border-forge-800 text-xs text-brand-300 font-mono overflow-x-auto max-h-60">
              {JSON.stringify(selectedLog?.details || {}, null, 2)}
            </pre>
          </div>

          <div className="flex justify-end pt-2 border-t border-forge-800">
            <button
              onClick={() => setSelectedLog(null)}
              className="px-4 py-2 rounded-xl bg-forge-800 hover:bg-forge-700 text-xs font-bold text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

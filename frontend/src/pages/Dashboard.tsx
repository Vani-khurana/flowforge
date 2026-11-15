import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { DashboardStats, RequestItem } from '../types';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { RequestDetailModal } from '../components/requests/RequestDetailModal';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowRight,
  ShieldAlert,
  TrendingUp,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user, role } = useAuth();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);

  // Fetch Dashboard Stats
  const { data: statsData, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', role],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data.data;
    },
  });

  // Fetch Dashboard Charts
  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts', role],
    queryFn: async () => {
      const res = await api.get('/dashboard/charts');
      return res.data.data;
    },
  });

  const stats = statsData || {
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    rejectedRequests: 0,
    pendingMyAction: 0,
    totalWorkflows: 0,
    totalUsers: 0,
    userRole: role,
    userName: user?.name || '',
  };

  const statusColors = ['#22c55e', '#f59e0b', '#f43f5e', '#64748b'];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-forge-900 via-forge-850 to-forge-900 border border-forge-800 p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 text-xs font-semibold mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>Enterprise Workflow Engine Active</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Alex Rivera'}
            </h2>
            <p className="text-forge-300 text-sm mt-1 max-w-xl">
              {role === 'EMPLOYEE'
                ? 'Track your submissions and submit new leave, purchase, or expense requests.'
                : role === 'MANAGER'
                ? 'Review team submissions, authorize expenditures, and process pending approvals.'
                : role === 'HR'
                ? 'Manage organizational leave approvals, compliance, and department records.'
                : role === 'FINANCE'
                ? 'Oversee procurement clearance, invoice disbursements, and expense approvals.'
                : 'Full administrative access to workflows, system users, departments, and audit traces.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              title="Submit a new expense claim, purchase order, or leave request"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95 text-white text-sm font-bold shadow-lg shadow-brand-600/25 hover:shadow-brand-500/40 transition-all duration-150 cursor-pointer group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span>New Request</span>
            </button>

            {role !== 'EMPLOYEE' && stats.pendingMyAction > 0 && (
              <Link
                to="/approvals"
                title="Navigate directly to your pending approvals queue"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 hover:border-amber-400 hover:scale-105 active:scale-95 border border-amber-500/30 text-amber-300 text-sm font-semibold transition-all duration-150 cursor-pointer shadow-sm group"
              >
                <Clock className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                <span>Review Approvals ({stats.pendingMyAction})</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Action Required Banner for Approvers */}
      {role !== 'EMPLOYEE' && stats.pendingMyAction > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm hover:border-amber-400/50 transition-all duration-150 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
            <span>
              You have <strong className="text-white">{stats.pendingMyAction} request(s)</strong> waiting for your approval decision as <strong>{role}</strong>.
            </span>
          </div>
          <Link
            to="/approvals"
            title="Open Approvals Queue to review pending submissions"
            className="flex items-center gap-1 font-bold text-xs uppercase tracking-wider text-amber-400 hover:text-white hover:translate-x-1 transition-all duration-150 cursor-pointer"
          >
            <span>Open Queue</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 4 Clickable Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <Link
          to="/requests"
          title="Click to view all requests in Requests Management"
          className="p-5 rounded-2xl bg-forge-900/60 border border-forge-800 hover:border-blue-500/60 hover:bg-forge-900/90 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-200 shadow-sm cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-forge-400 group-hover:text-blue-400 transition-colors">
                Total Requests
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/25 transition-all">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white group-hover:text-blue-300 transition-colors">
              {statsLoading ? '...' : stats.totalRequests}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-forge-400 mt-3 pt-2.5 border-t border-forge-800/60">
            <span>{role === 'EMPLOYEE' ? 'Submitted by you' : 'Across organization'}</span>
            <span className="text-blue-400 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              View all <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Pending Approval */}
        <Link
          to={role !== 'EMPLOYEE' ? '/approvals' : '/requests'}
          title={role !== 'EMPLOYEE' ? 'Click to open your Approvals Queue' : 'Click to track your pending submissions'}
          className="p-5 rounded-2xl bg-forge-900/60 border border-forge-800 hover:border-amber-500/60 hover:bg-forge-900/90 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-all duration-200 shadow-sm cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                In Review
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/25 transition-all">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-400">
              {statsLoading ? '...' : stats.pendingRequests}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-forge-400 mt-3 pt-2.5 border-t border-forge-800/60">
            <span>Awaiting step approvals</span>
            <span className="text-amber-400 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              {role !== 'EMPLOYEE' ? 'Review queue' : 'Track'} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Approved / Completed */}
        <Link
          to="/requests"
          title="Click to view all completed and approved requests"
          className="p-5 rounded-2xl bg-forge-900/60 border border-forge-800 hover:border-brand-500/60 hover:bg-forge-900/90 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 transition-all duration-200 shadow-sm cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                Completed
              </span>
              <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-brand-500/25 transition-all">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-brand-400">
              {statsLoading ? '...' : stats.completedRequests}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-forge-400 mt-3 pt-2.5 border-t border-forge-800/60">
            <span>Successfully cleared</span>
            <span className="text-brand-400 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Inspect <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        {/* Rejected */}
        <Link
          to="/requests"
          title="Click to view rejected submissions and feedback notes"
          className="p-5 rounded-2xl bg-forge-900/60 border border-forge-800 hover:border-rose-500/60 hover:bg-forge-900/90 hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-200 shadow-sm cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Rejected
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-500/25 transition-all">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-400">
              {statsLoading ? '...' : stats.rejectedRequests}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-forge-400 mt-3 pt-2.5 border-t border-forge-800/60">
            <span>Terminated with comments</span>
            <span className="text-rose-400 font-semibold inline-flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
              Review reasons <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Status */}
        <div className="p-6 rounded-2xl bg-forge-900/60 border border-forge-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Requests by Status</h3>
              <p className="text-xs text-forge-400">Distribution across workflow states</p>
            </div>
            <TrendingUp className="w-4 h-4 text-forge-400" />
          </div>

          <div className="h-56 w-full">
            {chartsLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-forge-400">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData?.requestsByStatus || []}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {(chartsData?.requestsByStatus || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Requests by Type */}
        <div className="p-6 rounded-2xl bg-forge-900/60 border border-forge-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Requests by Type</h3>
              <p className="text-xs text-forge-400">Volume across Leave, Purchase, and Expense</p>
            </div>
            <FileText className="w-4 h-4 text-forge-400" />
          </div>

          <div className="h-56 w-full">
            {chartsLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-forge-400">
                Loading chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData?.requestsByType || []}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Requests Table */}
      <div className="rounded-2xl bg-forge-900/60 border border-forge-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-forge-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Workflow Requests</h3>
            <p className="text-xs text-forge-400">Most recently updated submissions</p>
          </div>
          <Link
            to="/requests"
            className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-forge-950/60 text-forge-400 uppercase font-semibold border-b border-forge-800">
              <tr>
                <th className="px-5 py-3">Tracking ID</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Requester</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Current Step</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-800/80">
              {(chartsData?.recentRequests || []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-forge-400">
                    No requests found. Click "New Request" to create one!
                  </td>
                </tr>
              ) : (
                (chartsData?.recentRequests || []).map((req: RequestItem) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className="hover:bg-forge-800/40 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 font-bold text-forge-200">{req.id}</td>
                    <td className="px-5 py-3.5 font-medium text-white max-w-xs truncate">
                      {req.title}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge type={req.type} />
                    </td>
                    <td className="px-5 py-3.5 text-forge-300">{req.requesterName}</td>
                    <td className="px-5 py-3.5">
                      <Badge status={req.status} />
                    </td>
                    <td className="px-5 py-3.5 text-forge-300 font-medium">
                      {req.status === 'COMPLETED' ? (
                        <span className="text-brand-400">Finished</span>
                      ) : req.status === 'REJECTED' ? (
                        <span className="text-rose-400">Closed</span>
                      ) : (
                        req.currentStepName
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-brand-400 hover:text-brand-300">
                      View
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateRequestModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <RequestDetailModal
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
};

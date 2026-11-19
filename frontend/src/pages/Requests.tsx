import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { RequestDetailModal } from '../components/requests/RequestDetailModal';
import { RequestItem } from '../types';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  User as UserIcon,
  Users,
  Building2,
  Shield,
  DollarSign,
  HeartHandshake,
} from 'lucide-react';

export const Requests: React.FC = () => {
  const { role } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [activeScope, setActiveScope] = useState<'my' | 'role'>(role === 'EMPLOYEE' ? 'my' : 'role');

  // Automatically update view scope when persona / role is switched
  React.useEffect(() => {
    setActiveScope(role === 'EMPLOYEE' ? 'my' : 'role');
    setPage(1);
  }, [role]);

  const resolvedScope =
    activeScope === 'my'
      ? 'my'
      : role === 'MANAGER'
      ? 'team'
      : role === 'DEPARTMENT_HEAD'
      ? 'department'
      : role === 'HR'
      ? 'hr'
      : role === 'FINANCE'
      ? 'finance'
      : 'all';

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['requests', page, search, statusFilter, typeFilter, role, resolvedScope],
    queryFn: async () => {
      const res = await api.get('/requests', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusFilter,
          type: typeFilter,
          scope: resolvedScope,
        },
      });
      return res.data.data;
    },
  });

  const requests: RequestItem[] = data?.items || [];
  const pagination = data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  // Role Scope label configuration
  const roleScopeConfig: Record<string, { label: string; icon: any }> = {
    MANAGER: { label: 'Team Requests', icon: Users },
    DEPARTMENT_HEAD: { label: 'Department Requests', icon: Building2 },
    HR: { label: 'HR Queue (Leave Reviews)', icon: HeartHandshake },
    FINANCE: { label: 'Finance Queue (Purchases & Expenses)', icon: DollarSign },
    ADMIN: { label: 'All System Requests', icon: Shield },
  };

  const currentRoleConfig = roleScopeConfig[role];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Requests Management</h2>
          <p className="text-xs text-forge-400 mt-1">
            Browse, track status, and submit new enterprise workflow requests.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          title="Create and submit a new request with attached documents"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95 text-white text-xs font-bold shadow-lg shadow-brand-600/25 hover:shadow-brand-500/40 transition-all duration-150 cursor-pointer self-start sm:self-auto group"
        >
          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
          <span>New Request</span>
        </button>
      </div>

      {/* Scope Selector Tabs (My Requests vs Role Scope) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-forge-800 pb-3">
        <button
          onClick={() => {
            setActiveScope('my');
            setPage(1);
          }}
          title="View exclusively requests submitted by your own account"
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${
            activeScope === 'my'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
              : 'bg-forge-900/60 text-forge-400 hover:text-white hover:bg-forge-800 border border-forge-800'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>My Requests</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-forge-950/60 text-forge-300 ml-1">
            {activeScope === 'my' ? pagination.total : 'Self'}
          </span>
        </button>

        {role !== 'EMPLOYEE' && currentRoleConfig && (
          <button
            onClick={() => {
              setActiveScope('role');
              setPage(1);
            }}
            title={`View requests scoped to your organizational responsibility (${currentRoleConfig.label})`}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer hover:scale-105 active:scale-95 ${
              activeScope === 'role'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'bg-forge-900/60 text-forge-400 hover:text-white hover:bg-forge-800 border border-forge-800'
            }`}
          >
            <currentRoleConfig.icon className="w-3.5 h-3.5" />
            <span>{currentRoleConfig.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-forge-950/60 text-forge-300 ml-1">
              {activeScope === 'role' ? pagination.total : role}
            </span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-forge-900/60 border border-forge-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-forge-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, tracking ID, or requester..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500 transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-forge-950/80 border border-forge-700/80 rounded-xl px-3 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="AWAITING_APPROVER_ASSIGNMENT">Awaiting Approver Assignment</option>
            <option value="RETURNED_FOR_CORRECTION">Returned for Correction</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-forge-950/80 border border-forge-700/80 rounded-xl px-3 py-1.5 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Types</option>
            <option value="LEAVE">Leave</option>
            <option value="PURCHASE">Purchase</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          title="Refresh table"
          className="p-2 rounded-xl bg-forge-800 text-forge-300 hover:text-white transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl bg-forge-900/60 border border-forge-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-forge-950/70 text-forge-400 uppercase font-semibold border-b border-forge-800">
              <tr>
                <th className="px-5 py-3.5">ID</th>
                <th className="px-5 py-3.5">Title</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Requester</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Current Stage</th>
                <th className="px-5 py-3.5">Submitted</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-800/70">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-forge-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-500" />
                    <span>Loading requests from database...</span>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-forge-400">
                    No requests match your current filters.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    title={`Click to inspect details and attached documents for request ${r.id}`}
                    className="hover:bg-forge-800/80 hover:shadow-inner cursor-pointer transition-all duration-150 group"
                  >
                    <td className="px-5 py-3.5 font-bold text-forge-200 group-hover:text-brand-300 transition-colors">{r.id}</td>
                    <td className="px-5 py-3.5 font-medium text-white max-w-xs truncate group-hover:text-brand-200 transition-colors">
                      {r.title}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge type={r.type} />
                    </td>
                    <td className="px-5 py-3.5 text-forge-300">
                      <div>
                        <span className="font-semibold text-white block">{r.requesterName}</span>
                        <span className="text-[10px] text-forge-400">{r.departmentName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-forge-300">
                      {r.status === 'COMPLETED' ? (
                        <span className="text-brand-400 font-semibold">Completed</span>
                      ) : r.status === 'REJECTED' ? (
                        <span className="text-rose-400 font-semibold">Rejected</span>
                      ) : (
                        <span className="font-medium">
                          {r.currentStepName} ({r.currentStepRole})
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-forge-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(r);
                        }}
                        title={`View full details & attached proof for ${r.id}`}
                        className="p-1.5 rounded-lg text-brand-400 hover:text-white hover:bg-brand-500/25 group-hover:scale-110 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <span className="text-[11px] font-bold hidden sm:inline">Inspect</span>
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination */}
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          limit={pagination.limit}
          onPageChange={(newPage) => setPage(newPage)}
        />
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

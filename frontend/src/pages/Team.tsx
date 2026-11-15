import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { User, Role } from '../types';
import { UserPlus, Check } from 'lucide-react';

export const Team: React.FC = () => {
  const { user: currentUser, role: authRole, switchRole } = useAuth();
  const currentRole: Role = authRole || currentUser?.role || 'EMPLOYEE';
  const isAdmin = currentRole === 'ADMIN';

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [departmentId, setDepartmentId] = useState('dept-1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: usersData, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.data;
    },
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/users/departments');
      return res.data.data;
    },
  });

  const users = usersData || [];
  const departments = deptsData || [];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/users', {
        name,
        email,
        role,
        departmentId,
      });

      if (res.data.success) {
        toast.success(`User ${name} added to ${role} role!`);
        setName('');
        setEmail('');
        setInviteModalOpen(false);
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Organization Team & RBAC</h2>
          <p className="text-xs text-forge-400 mt-1">
            Manage users, role permissions, and organizational departments.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/20 transition self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {/* Role Breakdown Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {(['ADMIN', 'DEPARTMENT_HEAD', 'MANAGER', 'EMPLOYEE', 'HR', 'FINANCE'] as Role[]).map((r) => {
          const count = users.filter((u) => u.role === r).length;
          return (
            <div
              key={r}
              className="p-4 rounded-xl bg-forge-900/60 border border-forge-800 text-center"
            >
              <span className="text-[10px] font-bold uppercase text-forge-400 block mb-1">
                {r.replace('_', ' ')}
              </span>
              <span className="text-xl font-black text-white">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Team Table */}
      <div className="rounded-2xl bg-forge-900/60 border border-forge-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-forge-950/70 text-forge-400 uppercase font-semibold border-b border-forge-800">
              <tr>
                <th className="px-5 py-3.5">Member</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Reporting Manager</th>
                <th className="px-5 py-3.5 text-right">Switch Active Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forge-800/70">
              {usersLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-forge-400">
                    Loading team directory...
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = u.id === currentUser?.id || u.role === currentUser?.role;
                  return (
                    <tr key={u.id} className="hover:bg-forge-800/40 transition">
                      <td className="px-5 py-3.5 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-forge-800 border border-forge-700 flex items-center justify-center font-bold text-xs text-brand-400">
                          {u.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <span className="block font-semibold text-white">{u.name}</span>
                          <span className="text-[10px] text-forge-400">ID: {u.id}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-forge-300 font-mono text-[11px]">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <Badge role={u.role} />
                      </td>
                      <td className="px-5 py-3.5 text-forge-300 font-medium">
                        {u.departmentName || 'General'}
                      </td>
                      <td className="px-5 py-3.5 text-forge-300 font-medium">
                        {u.managerName ? (
                          <span className="text-forge-200">↑ {u.managerName}</span>
                        ) : (
                          <span className="text-forge-500 italic">None (Executive)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isCurrent ? (
                          <span className="inline-flex items-center gap-1 text-xs text-brand-400 font-bold bg-brand-500/10 px-2 py-1 rounded-md border border-brand-500/20">
                            <Check className="w-3.5 h-3.5" />
                            <span>Active Persona</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => switchRole(u.role)}
                            className="px-2.5 py-1 rounded-lg border border-forge-700 bg-forge-800 text-forge-300 hover:text-white hover:border-brand-500 transition font-semibold text-[11px]"
                          >
                            Simulate As {u.role}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal (Admin Only) */}
      {isAdmin && (
        <Modal
          isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Add Team Member"
        subtitle="Provision an enterprise user account with role-based workflow permissions."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jordan Hayes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Email Address <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="jordan@flowforge.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-forge-300 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-2.5 py-2 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="DEPARTMENT_HEAD">Department Head</option>
                <option value="HR">HR</option>
                <option value="FINANCE">Finance</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-forge-300 mb-1">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-2.5 py-2 text-xs text-forge-200 focus:outline-none focus:border-brand-500"
              >
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-forge-800">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-forge-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition"
            >
              <span>{isSubmitting ? 'Adding...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </Modal>
      )}
    </div>
  );
};

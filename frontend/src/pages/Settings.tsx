import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/ui/Modal';
import { Building, Plus, Shield, Server, Globe } from 'lucide-react';

export const Settings: React.FC = () => {
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: deptsData, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/users/departments');
      return res.data.data;
    },
  });

  const departments = deptsData || [];

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      toast.error('Department name and code are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/users/departments', {
        name: deptName,
        code: deptCode,
      });

      if (res.data.success) {
        toast.success(`Department "${deptName}" created successfully!`);
        setDeptName('');
        setDeptCode('');
        setDeptModalOpen(false);
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">System Settings & Configuration</h2>
        <p className="text-xs text-forge-400 mt-1">
          Platform parameters, department registries, and security enforcement policies.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Departments Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-forge-900/60 border border-forge-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-400" />
                  <span>Organizational Departments</span>
                </h3>
                <p className="text-xs text-forge-400 mt-0.5">
                  Business units mapped to requests and approval authority
                </p>
              </div>

              <button
                onClick={() => setDeptModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {isLoading ? (
                <div className="text-xs text-forge-400">Loading departments...</div>
              ) : (
                departments.map((d: any) => (
                  <div
                    key={d.id}
                    className="p-3.5 rounded-xl bg-forge-950/80 border border-forge-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-xs text-white block">{d.name}</span>
                      <span className="text-[10px] text-forge-400">ID: {d.id}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                      {d.code}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform Architecture & Future Scope */}
          <div className="p-6 rounded-2xl bg-forge-900/60 border border-forge-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-purple-400" />
              <span>Phase 1 Scope vs Phase 2 Future Extension</span>
            </h3>
            <p className="text-xs text-forge-300 leading-relaxed">
              FlowForge is structured with clean service boundaries. Phase 1 provides the 50% core foundation:
              RBAC, dynamic workflow state machines, atomic transactions, live dashboards, and audit history.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-forge-950 border border-brand-500/20">
                <span className="text-xs font-bold text-brand-400 block mb-1">
                  ✓ Phase 1 (Core 50% Active)
                </span>
                <ul className="text-[11px] text-forge-400 space-y-1">
                  <li>• Multi-step dynamic workflows</li>
                  <li>• Atomic approval state transitions</li>
                  <li>• Role-based access control (5 roles)</li>
                  <li>• Real-time audit log trail</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-forge-950 border border-purple-500/20">
                <span className="text-xs font-bold text-purple-400 block mb-1">
                  🚀 Phase 2 (Future Layer)
                </span>
                <ul className="text-[11px] text-forge-400 space-y-1">
                  <li>• AI / LLM request classification & summary</li>
                  <li>• RAG policy retrieval & assistance</li>
                  <li>• Real-time WebSockets & push alerts</li>
                  <li>• Drag & drop visual workflow builder</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Connection & Security Summary */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-forge-900/60 border border-forge-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              <span>Security & Policies</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-forge-800">
                <span className="text-forge-400">JWT Token Expiry</span>
                <span className="font-bold text-white">7 Days</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-forge-800">
                <span className="text-forge-400">Rate Limiter</span>
                <span className="font-bold text-brand-400">200 req / 15m</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-forge-800">
                <span className="text-forge-400">Helmet Headers</span>
                <span className="font-bold text-brand-400">Enforced</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-forge-800">
                <span className="text-forge-400">CORS Policy</span>
                <span className="font-bold text-white">Strict Origin</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-forge-400">Rejection Protocol</span>
                <span className="font-bold text-amber-400">Mandatory Comment</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-forge-900/60 border border-forge-800 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Active Endpoints</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-forge-950 font-mono text-[11px] text-forge-300">
                Frontend: <span className="text-brand-400">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}</span>
              </div>
              <div className="p-2 rounded-lg bg-forge-950 font-mono text-[11px] text-forge-300">
                API Base: <span className="text-brand-400">{import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Department Modal */}
      <Modal
        isOpen={deptModalOpen}
        onClose={() => setDeptModalOpen(false)}
        title="Register New Department"
        subtitle="Create an organizational unit for workflow routing."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateDept} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Department Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Legal & Compliance"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Department Code (3-4 letters) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="LEG"
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-xs text-forge-100 uppercase focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-forge-800">
            <button
              type="button"
              onClick={() => setDeptModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-forge-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition"
            >
              <span>{isSubmitting ? 'Registering...' : 'Add Department'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

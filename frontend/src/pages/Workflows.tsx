import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Workflow, Role } from '../types';
import { GitFork, Plus, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export const Workflows: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('CUSTOM');
  const [steps, setSteps] = useState<Array<{ name: string; approverRole: Role }>>([
    { name: 'Initial Line Review', approverRole: 'MANAGER' },
    { name: 'Department Sign-Off', approverRole: 'HR' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await api.get('/workflows');
      return res.data.data;
    },
  });

  const workflows = data || [];

  const handleAddStep = () => {
    setSteps([...steps, { name: `Review Stage ${steps.length + 1}`, approverRole: 'FINANCE' }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      toast.error('A workflow must have at least one approval step');
      return;
    }
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: 'name' | 'approverRole', value: string) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Workflow name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/workflows', {
        name,
        description,
        type,
        steps,
      });

      if (res.data.success) {
        toast.success(`Workflow "${name}" created successfully!`);
        setName('');
        setDescription('');
        setCreateModalOpen(false);
        queryClient.invalidateQueries();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Configurable Workflows</h2>
          <p className="text-xs text-forge-400 mt-1">
            Enterprise multi-stage approval sequences stored in database and enforced by the state machine.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Workflow</span>
        </button>
      </div>

      {/* Workflows Cards List */}
      {isLoading ? (
        <div className="p-12 text-center text-forge-400 rounded-2xl bg-forge-900/50 border border-forge-800">
          Loading workflow definitions...
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-6 rounded-2xl bg-forge-900/70 border border-forge-800 hover:border-forge-700/80 transition shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-700/30 border border-brand-500/40 text-brand-400 flex items-center justify-center font-bold">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{wf.name}</h3>
                      <Badge type={wf.type} />
                    </div>
                    {wf.description && (
                      <p className="text-xs text-forge-400 mt-0.5">{wf.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                    Active Engine
                  </span>
                  <span className="text-xs text-forge-400 font-medium">
                    {wf.steps.length} Steps Sequence
                  </span>
                </div>
              </div>

              {/* Step Pipeline Flowchart */}
              <div className="p-4 rounded-xl bg-forge-950/70 border border-forge-800/80">
                <span className="text-[10px] uppercase font-bold tracking-wider text-forge-400 block mb-3">
                  Approval Routing Sequence
                </span>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* Start Node */}
                  <div className="px-3 py-1.5 rounded-lg bg-forge-900 border border-forge-700 text-xs text-forge-300 font-medium">
                    Requester Submits
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-brand-500" />

                  {/* Dynamic Workflow Steps */}
                  {wf.steps.map((st) => (
                    <React.Fragment key={st.id}>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/30 text-xs">
                        <span className="w-4 h-4 rounded-full bg-brand-500/20 text-brand-400 text-[10px] font-bold flex items-center justify-center">
                          {st.order}
                        </span>
                        <span className="font-semibold text-white">{st.name}</span>
                        <Badge role={st.approverRole} />
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-brand-500" />
                    </React.Fragment>
                  ))}

                  {/* Terminal Node */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-400 font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Completed</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Workflow Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Define New Workflow Pipeline"
        subtitle="Create an extensible multi-stage approval sequence routed dynamically by the engine."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateWorkflow} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-forge-300 mb-1">
              Workflow Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. IT Equipment & Asset Requisition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-forge-300 mb-1">Type Code</label>
              <input
                type="text"
                required
                placeholder="EQUIPMENT"
                value={type}
                onChange={(e) => setType(e.target.value.toUpperCase())}
                className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-xs text-forge-100 uppercase focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-forge-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="Brief summary of workflow purpose"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-forge-950/80 border border-forge-700/80 rounded-xl px-3.5 py-2 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {/* Sequential Steps Builder */}
          <div className="p-4 rounded-xl bg-forge-950/70 border border-forge-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-forge-300">
                Ordered Approval Stages ({steps.length})
              </span>
              <button
                type="button"
                onClick={handleAddStep}
                className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stage</span>
              </button>
            </div>

            <div className="space-y-2">
              {steps.map((st, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-forge-900 border border-forge-700/70"
                >
                  <span className="w-5 h-5 rounded-full bg-forge-800 text-forge-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    value={st.name}
                    onChange={(e) => handleStepChange(idx, 'name', e.target.value)}
                    placeholder="Stage Name"
                    className="flex-1 bg-forge-950 border border-forge-700/80 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                  <select
                    value={st.approverRole}
                    onChange={(e) =>
                      handleStepChange(idx, 'approverRole', e.target.value as Role)
                    }
                    className="bg-forge-950 border border-forge-700/80 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="HR">HR</option>
                    <option value="FINANCE">Finance</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-xs text-rose-400 hover:text-rose-300 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-forge-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-forge-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Deploy Workflow'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

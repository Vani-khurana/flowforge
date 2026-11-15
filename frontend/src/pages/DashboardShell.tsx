import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Activity, Cpu, ArrowRight } from 'lucide-react';

export const DashboardShell: React.FC = () => {
  const [apiStatus, setApiStatus] = useState<{
    success?: boolean;
    message?: string;
    environment?: string;
    timestamp?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => {
        setApiStatus(res.data);
      })
      .catch((err) => {
        console.error('API connection check failed:', err);
        setApiStatus({ success: false, message: 'Backend not reachable' });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-forge-900 via-forge-800 to-forge-900 border border-forge-700/60 p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/20 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Phase 1A: Project Initialization & Shell Verified</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              Welcome to FlowForge
            </h2>
            <p className="text-forge-400 text-sm md:text-base mt-1 max-w-2xl">
              The intelligent workflow automation and approval engine. Phase 1 foundation provides 
              enterprise role-based routing, multi-step approval state machines, and real-time audit logging.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-forge-950/80 border border-forge-700/80 rounded-xl p-4 text-center min-w-[130px]">
              <span className="text-[11px] font-semibold text-forge-400 uppercase tracking-wider block">
                Platform Stage
              </span>
              <span className="text-xl font-black text-brand-500">50% Core</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-forge-900/50 border border-forge-800 rounded-xl p-6 hover:border-forge-700 transition">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Express API Service</h3>
          <p className="text-xs text-forge-400 mb-4 leading-relaxed">
            REST API with Helmet, rate limiting, and centralized error handling running on port 5000.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-forge-800 text-xs font-medium">
            <span className="text-forge-400">Health Status:</span>
            {loading ? (
              <span className="text-forge-400 animate-pulse">Checking...</span>
            ) : apiStatus?.success ? (
              <span className="text-brand-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                Connected
              </span>
            ) : (
              <span className="text-rose-400 font-semibold">Offline</span>
            )}
          </div>
        </div>

        <div className="bg-forge-900/50 border border-forge-800 rounded-xl p-6 hover:border-forge-700 transition">
          <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-500 flex items-center justify-center mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Prisma & Database Engine</h3>
          <p className="text-xs text-forge-400 mb-4 leading-relaxed">
            PostgreSQL relational models configured with ACID transactional approval state transitions.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-forge-800 text-xs font-medium">
            <span className="text-forge-400">Prisma Status:</span>
            <span className="text-brand-500 font-semibold">Ready for Phase 1B</span>
          </div>
        </div>

        <div className="bg-forge-900/50 border border-forge-800 rounded-xl p-6 hover:border-forge-700 transition">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Role-Based Access Control</h3>
          <p className="text-xs text-forge-400 mb-4 leading-relaxed">
            Strict multi-role authorization (Admin, Manager, Employee, HR, Finance) enforced at API layer.
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-forge-800 text-xs font-medium">
            <span className="text-forge-400">Security Guard:</span>
            <span className="text-brand-500 font-semibold">Configured</span>
          </div>
        </div>
      </div>

      {/* Implementation Progress Roadmap */}
      <div className="bg-forge-900/40 border border-forge-800/80 rounded-xl p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>Phase 1 Implementation Progression</span>
          <ArrowRight className="w-4 h-4 text-forge-500" />
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-center">
          <div className="p-3 rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-500">
            <div className="text-[10px] font-bold uppercase">1A. Init Shell</div>
            <div className="text-xs font-black mt-1">Complete</div>
          </div>
          <div className="p-3 rounded-lg bg-forge-800/40 border border-forge-700/40 text-forge-400">
            <div className="text-[10px] font-bold uppercase">1B. Database</div>
            <div className="text-xs font-semibold mt-1">Next</div>
          </div>
          <div className="p-3 rounded-lg bg-forge-800/40 border border-forge-700/40 text-forge-400">
            <div className="text-[10px] font-bold uppercase">1C/D. Auth & RBAC</div>
            <div className="text-xs font-semibold mt-1">Pending</div>
          </div>
          <div className="p-3 rounded-lg bg-forge-800/40 border border-forge-700/40 text-forge-400">
            <div className="text-[10px] font-bold uppercase">1E. Workflows</div>
            <div className="text-xs font-semibold mt-1">Pending</div>
          </div>
          <div className="p-3 rounded-lg bg-forge-800/40 border border-forge-700/40 text-forge-400">
            <div className="text-[10px] font-bold uppercase">1F/G. Requests</div>
            <div className="text-xs font-semibold mt-1">Pending</div>
          </div>
          <div className="p-3 rounded-lg bg-forge-800/40 border border-forge-700/40 text-forge-400">
            <div className="text-[10px] font-bold uppercase">1H/J. UI & Analytics</div>
            <div className="text-xs font-semibold mt-1">Pending</div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { login, switchRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('employee@flowforge.internal');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Authentication failed. Please check your credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (role: Role, userEmail: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await switchRole(role);
      navigate('/');
    } catch (err: any) {
      // Fallback to password login
      try {
        await login(userEmail, 'Password123!');
        navigate('/');
      } catch (e: any) {
        setError(e.response?.data?.message || 'Quick login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoAccounts = [
    {
      role: 'EMPLOYEE' as Role,
      name: 'Alex Rivera',
      title: 'Software Engineer',
      email: 'employee@flowforge.internal',
      dept: 'Engineering',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      role: 'MANAGER' as Role,
      name: 'Sarah Connor',
      title: 'Engineering Manager',
      email: 'manager@flowforge.internal',
      dept: 'Engineering',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      role: 'DEPARTMENT_HEAD' as Role,
      name: 'Victoria Chase',
      title: 'VP of Engineering',
      email: 'head.eng@flowforge.internal',
      dept: 'Engineering',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    {
      role: 'HR' as Role,
      name: 'Jessica Pearson',
      title: 'People Operations',
      email: 'hr@flowforge.internal',
      dept: 'Human Resources',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      role: 'FINANCE' as Role,
      name: 'Michael Scott',
      title: 'Finance & Compliance',
      email: 'finance@flowforge.internal',
      dept: 'Finance & Accounts',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      role: 'ADMIN' as Role,
      name: 'Rachel Zane',
      title: 'Platform Administrator',
      email: 'admin@flowforge.internal',
      dept: 'Operations',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary-600 to-blue-500 shadow-xl shadow-primary-500/20 mb-4">
          <ShieldCheck className="w-9 h-9 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">FlowForge</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enterprise Workflow Automation & Proof Verification Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="name@flowforge.internal"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Account Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  placeholder="••••••••••••"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Default password for seeded accounts: <span className="font-mono text-primary-400">Password123!</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-500 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/50 shadow-lg shadow-primary-600/30 transition-all text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In with Credentials</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-700/60">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                Instant Role Pre-sets for Demonstration
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoAccounts.map((acct) => (
                <button
                  key={acct.email}
                  type="button"
                  onClick={() => handleQuickLogin(acct.role, acct.email)}
                  disabled={isSubmitting}
                  className="flex flex-col text-left p-3 rounded-xl bg-slate-900/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-primary-500/50 transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-medium text-sm text-white group-hover:text-primary-300">
                      {acct.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600">
                      {acct.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <span>{acct.title}</span>
                    <span>•</span>
                    <span className="text-slate-500">{acct.dept}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Info Footer */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            JWT Access & Session Tokens
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Bcrypt Hashed Storage
          </span>
          <span className="flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            Strict Chain Hierarchy
          </span>
        </div>
      </div>
    </div>
  );
};
export default Login;

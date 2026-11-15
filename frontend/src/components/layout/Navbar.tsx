import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Role, Notification } from '../../types';
import {
  Search,
  ChevronDown,
  Check,
  Bell,
  LogOut,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const roleProfiles: Array<{ role: Role; name: string; email: string; dept: string }> = [
  { role: 'EMPLOYEE', name: 'Alex Rivera', email: 'employee@flowforge.internal', dept: 'Engineering' },
  { role: 'MANAGER', name: 'Sarah Connor', email: 'manager@flowforge.internal', dept: 'Engineering' },
  { role: 'DEPARTMENT_HEAD', name: 'Victoria Chase', email: 'head.eng@flowforge.internal', dept: 'Engineering' },
  { role: 'HR', name: 'Jessica Pearson', email: 'hr@flowforge.internal', dept: 'Human Resources' },
  { role: 'FINANCE', name: 'Michael Scott', email: 'finance@flowforge.internal', dept: 'Finance & Accounts' },
  { role: 'ADMIN', name: 'Rachel Zane', email: 'admin@flowforge.internal', dept: 'Operations' },
  { role: 'DEPARTMENT_HEAD', name: 'Dr. Arthur Bell', email: 'senior.approver@flowforge.internal', dept: 'Executive Leadership' },
];

export const Navbar: React.FC = () => {
  const { user, role, switchRole, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch notifications
  const { data: notifData } = useQuery<{ notifications: Notification[]; unreadCount: number }>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleSelectRole = async (targetRole: Role, targetEmail?: string) => {
    setDropdownOpen(false);
    await switchRole(targetRole, targetEmail);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }
    setNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <header className="h-16 border-b border-forge-800 bg-forge-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-forge-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Quick search requests, IDs, workflows..."
            className="w-full bg-forge-950/70 border border-forge-700/60 rounded-xl pl-9 pr-4 py-1.5 text-xs text-forge-100 placeholder-forge-400 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Controls: Notifications, Role Switcher & Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-xl bg-forge-950 border border-forge-700/80 hover:border-brand-500 hover:bg-forge-900 hover:scale-105 active:scale-95 text-forge-300 hover:text-white transition-all duration-150 cursor-pointer shadow-sm group"
            title="In-App Notifications — Click to view updates and flags"
          >
            <Bell className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-forge-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-forge-900 border border-forge-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-forge-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-brand-400" />
                    Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-[11px] text-brand-400 hover:text-brand-300 hover:underline flex items-center gap-1 cursor-pointer transition"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-forge-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-forge-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 rounded-xl transition-all duration-150 cursor-pointer text-left hover:scale-[1.01] ${n.isRead
                            ? 'opacity-70 hover:bg-forge-800/60'
                            : 'bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-semibold text-white">{n.title}</h4>
                          <span className="text-[10px] text-forge-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-forge-300 mt-0.5">{n.message}</p>
                        {n.link && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-brand-400 mt-1 font-medium hover:underline">
                            View details <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={isLoading}
            title="Switch persona / role simulation (Test as Manager, HR, Finance, Admin...)"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-forge-950 border border-forge-700/80 hover:border-brand-500 hover:bg-forge-900 hover:scale-[1.02] active:scale-95 transition-all duration-150 cursor-pointer shadow-sm text-left group"
          >
            <div className="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold text-[10px] group-hover:scale-110 transition-transform">
              {role.slice(0, 2)}
            </div>
            <div className="hidden sm:block">
              <span className="text-[10px] text-forge-400 block font-medium uppercase tracking-wider">
                Simulate Role
              </span>
              <span className="text-xs font-bold text-white flex items-center gap-1.5 group-hover:text-brand-300 transition-colors">
                {role}
                <ChevronDown className="w-3 h-3 text-forge-400 group-hover:translate-y-0.5 transition-transform" />
              </span>
            </div>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-forge-900 border border-forge-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-forge-800">
                  <p className="text-xs font-bold text-white">Switch Active Persona</p>
                  <p className="text-[11px] text-forge-400">
                    Test the workflow from each stakeholder's perspective:
                  </p>
                </div>

                {roleProfiles.map((p) => {
                  const isCurrent = user?.email === p.email;
                  return (
                    <button
                      key={p.email}
                      onClick={() => handleSelectRole(p.role, p.email)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition ${isCurrent
                          ? 'bg-brand-500/15 border border-brand-500/30 text-white'
                          : 'hover:bg-forge-800/80 text-forge-300'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-forge-100">{p.name}</span>
                          <Badge role={p.role} />
                        </div>
                        <span className="text-[10px] text-forge-400 block mt-0.5">
                          {p.dept}
                        </span>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-brand-400" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Current User Pill */}
        <div
          title={`Signed in as ${user?.name || 'User'} (${user?.role || role})`}
          className="hidden md:flex items-center gap-2.5 pl-3 border-l border-forge-800 hover:bg-forge-900/60 rounded-xl p-1.5 transition-all cursor-default group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-brand-500/10 group-hover:scale-105 transition-transform">
            {user?.name
              ? user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
              : 'FF'}
          </div>
          <div>
            <p className="text-xs font-bold text-forge-100 leading-none group-hover:text-brand-300 transition-colors">{user?.name || 'Alex Rivera'}</p>
            <p className="text-[10px] text-forge-400 mt-1 leading-none">
              {user?.departmentName || 'Engineering'}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl bg-forge-950 border border-forge-700/80 hover:border-rose-500 hover:bg-rose-500/15 hover:scale-105 active:scale-95 text-forge-400 hover:text-rose-400 transition-all duration-150 cursor-pointer shadow-sm group"
          title="Sign Out of FlowForge"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </header>
  );
};

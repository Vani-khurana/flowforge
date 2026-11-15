import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  GitFork, 
  History, 
  Users, 
  Settings,
  Layers,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: Role[];
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    allowedRoles: ['EMPLOYEE', 'MANAGER', 'DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN'],
  },
  {
    name: 'My Requests',
    to: '/requests',
    icon: FileText,
    allowedRoles: ['EMPLOYEE', 'MANAGER', 'DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN'],
  },
  {
    name: 'Approvals Queue',
    to: '/approvals',
    icon: CheckSquare,
    allowedRoles: ['MANAGER', 'DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN'],
  },
  {
    name: 'Evidence Review',
    to: '/documents/review',
    icon: ShieldAlert,
    allowedRoles: ['MANAGER', 'DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN'],
  },
  {
    name: 'Workflows',
    to: '/workflows',
    icon: GitFork,
    allowedRoles: ['DEPARTMENT_HEAD', 'ADMIN'],
  },
  {
    name: 'Audit Trail',
    to: '/audit',
    icon: History,
    allowedRoles: ['DEPARTMENT_HEAD', 'HR', 'FINANCE', 'ADMIN'],
  },
  {
    name: 'Team & Hierarchy',
    to: '/users',
    icon: Users,
    allowedRoles: ['MANAGER', 'DEPARTMENT_HEAD', 'HR', 'ADMIN'],
  },
  {
    name: 'System Settings',
    to: '/settings',
    icon: Settings,
    allowedRoles: ['ADMIN'],
  },
];

export const Sidebar: React.FC = () => {
  const { user, role } = useAuth();
  const currentRole: Role = role || user?.role || 'EMPLOYEE';

  const visibleNavItems = navigationItems.filter((item) =>
    item.allowedRoles.includes(currentRole)
  );

  return (
    <aside className="w-64 border-r border-forge-800 bg-forge-950/70 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        <NavLink
          to="/"
          title="FlowForge Dashboard — Click to return home"
          className="h-16 px-6 flex items-center gap-3 border-b border-forge-800 hover:bg-forge-900/50 transition-all duration-200 group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-200">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide group-hover:text-brand-300 transition-colors">FlowForge</h1>
            <p className="text-[10px] uppercase font-semibold tracking-wider text-brand-500">
              Enterprise Platform
            </p>
          </div>
        </NavLink>

        <div className="px-4 py-6">
          <div className="text-[11px] font-semibold text-forge-400 uppercase tracking-wider px-3 mb-2">
            Navigation
          </div>
          <nav className="space-y-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  end={item.to === '/'}
                  title={`Navigate to ${item.name}`}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group cursor-pointer ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-400 font-bold border border-brand-500/30 shadow-sm translate-x-1'
                        : 'text-forge-300 hover:text-white hover:bg-forge-800/80 hover:translate-x-1.5 hover:border-forge-700 border border-transparent'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 group-hover:scale-110 group-hover:text-brand-400 transition-all duration-150" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Hierarchy & Org Position Card */}
      <div className="p-4 border-t border-forge-800/80">
        <NavLink
          to="/users"
          title="Click to view full organizational hierarchy and reporting chain"
          className="block bg-forge-900/60 border border-forge-800 hover:border-brand-500/50 hover:bg-forge-900/90 hover:shadow-lg hover:shadow-brand-500/10 hover:-translate-y-0.5 rounded-xl p-3 space-y-1.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1 group-hover:text-brand-300 transition-colors">
              <UserCheck className="w-3 h-3 group-hover:scale-110 transition-transform" />
              Hierarchy Chain
            </span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono group-hover:bg-emerald-500/30 transition-colors">
              ACTIVE
            </span>
          </div>

          <div className="text-xs text-forge-200 font-medium group-hover:text-white transition-colors">
            {user?.name || 'Current User'}
          </div>

          <div className="text-[11px] text-forge-400 space-y-0.5">
            {user?.manager ? (
              <p>Manager: <strong className="text-forge-300 group-hover:text-brand-300 transition-colors">{user.manager.name}</strong></p>
            ) : (
              <p className="italic text-forge-500">Executive / Top of Reporting Chain</p>
            )}
            {user?.directReports && user.directReports.length > 0 && (
              <p>Reports: <strong className="text-forge-300">{user.directReports.length} direct report(s)</strong></p>
            )}
          </div>
        </NavLink>
      </div>
    </aside>
  );
};
export default Sidebar;

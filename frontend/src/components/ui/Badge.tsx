import React from 'react';
import { RequestStatus, Role } from '../../types';

interface BadgeProps {
  status?: RequestStatus | string;
  role?: Role | string;
  type?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, role, type, className = '' }) => {
  if (status) {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Pending Approval
          </span>
        );
      case 'COMPLETED':
      case 'APPROVED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20 ${className}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
            {status === 'COMPLETED' ? 'Completed' : 'Approved'}
          </span>
        );
      case 'REJECTED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 ${className}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Rejected
          </span>
        );
      case 'RETURNED_FOR_CORRECTION':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 ${className}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Returned for Correction
          </span>
        );
      case 'AWAITING_APPROVER_ASSIGNMENT':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 ${className}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Awaiting Approver Assignment
          </span>
        );
      case 'CANCELLED':
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-forge-700/40 text-forge-400 border border-forge-700 ${className}`}
          >
            Cancelled
          </span>
        );
      default:
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 ${className}`}
          >
            {status}
          </span>
        );
    }
  }

  if (role) {
    switch (role) {
      case 'ADMIN':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-purple-500/15 text-purple-300 border border-purple-500/30 ${className}`}>
            Admin
          </span>
        );
      case 'DEPARTMENT_HEAD':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 ${className}`}>
            Dept Head
          </span>
        );
      case 'MANAGER':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-blue-500/15 text-blue-300 border border-blue-500/30 ${className}`}>
            Manager
          </span>
        );
      case 'HR':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-pink-500/15 text-pink-300 border border-pink-500/30 ${className}`}>
            HR
          </span>
        );
      case 'FINANCE':
        return (
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${className}`}>
            Finance
          </span>
        );
      default:
        return (
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-forge-700/40 text-forge-300 border border-forge-700 ${className}`}>
            Employee
          </span>
        );
    }
  }

  if (type) {
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold tracking-wide bg-forge-800 text-forge-200 border border-forge-700/60 ${className}`}>
        {type}
      </span>
    );
  }

  return null;
};

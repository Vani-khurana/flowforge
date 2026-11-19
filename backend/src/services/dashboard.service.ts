import { db } from '../db/store';
import { User, RequestItem } from '../types';
import { ApprovalService } from './approval.service';
import { HierarchyService } from './hierarchy.service';

export class DashboardService {
  static getScopedRequests(currentUser: User): RequestItem[] {
    const items = [...db.requests];
    if (currentUser.role === 'EMPLOYEE') {
      return items.filter((r) => r.requesterId === currentUser.id);
    }
    if (currentUser.role === 'MANAGER') {
      const subordinates = new Set(HierarchyService.getSubordinates(currentUser.id).map((s) => s.id));
      return items.filter(
        (r) =>
          r.requesterId === currentUser.id ||
          subordinates.has(r.requesterId) ||
          (r.currentStepId &&
            HierarchyService.getEligibleApprovers(
              r,
              db.workflowSteps.find((s) => s.id === r.currentStepId)!
            ).some((u) => u.id === currentUser.id))
      );
    }
    if (currentUser.role === 'DEPARTMENT_HEAD') {
      const deptMembers = new Set(
        db.users.filter((u) => u.departmentId === currentUser.departmentId).map((u) => u.id)
      );
      return items.filter(
        (r) =>
          r.requesterId === currentUser.id ||
          deptMembers.has(r.requesterId) ||
          HierarchyService.isManagerOf(currentUser.id, r.requesterId) ||
          (r.currentStepId &&
            HierarchyService.getEligibleApprovers(
              r,
              db.workflowSteps.find((s) => s.id === r.currentStepId)!
            ).some((u) => u.id === currentUser.id))
      );
    }
    if (currentUser.role === 'HR') {
      const hrMembers = new Set(
        db.users.filter((u) => u.departmentId === currentUser.departmentId).map((u) => u.id)
      );
      return items.filter(
        (r) =>
          r.requesterId === currentUser.id ||
          r.type === 'LEAVE' ||
          hrMembers.has(r.requesterId) ||
          (r.currentStepId &&
            HierarchyService.getEligibleApprovers(
              r,
              db.workflowSteps.find((s) => s.id === r.currentStepId)!
            ).some((u) => u.id === currentUser.id))
      );
    }
    if (currentUser.role === 'FINANCE') {
      const finMembers = new Set(
        db.users.filter((u) => u.departmentId === currentUser.departmentId).map((u) => u.id)
      );
      return items.filter(
        (r) =>
          r.requesterId === currentUser.id ||
          r.type === 'PURCHASE' ||
          r.type === 'EXPENSE' ||
          finMembers.has(r.requesterId) ||
          (r.currentStepId &&
            HierarchyService.getEligibleApprovers(
              r,
              db.workflowSteps.find((s) => s.id === r.currentStepId)!
            ).some((u) => u.id === currentUser.id))
      );
    }
    // ADMIN
    return items;
  }

  static async getStats(currentUser: User) {
    await db.syncFromDb();
    const scopedRequests = this.getScopedRequests(currentUser);

    const totalRequests = scopedRequests.length;
    const pendingRequests = scopedRequests.filter((r) => r.status === 'PENDING_APPROVAL').length;
    const awaitingAssignmentRequests = scopedRequests.filter(
      (r) => r.status === 'AWAITING_APPROVER_ASSIGNMENT'
    ).length;
    const completedRequests = scopedRequests.filter(
      (r) => r.status === 'COMPLETED' || r.status === 'APPROVED'
    ).length;
    const rejectedRequests = scopedRequests.filter((r) => r.status === 'REJECTED').length;

    // Approvals queue size for current role using strict business logic
    const pendingMyAction = (await ApprovalService.getPendingApprovals(currentUser)).length;
    const pendingDocumentReviews = db.documents.filter(
      (d) => d.status === 'REVIEW_REQUIRED' || d.status === 'VERIFICATION_FAILED'
    ).length;

    const totalWorkflows = db.workflows.filter((w) => w.status === 'ACTIVE').length;
    const totalUsers = db.users.length;

    return {
      totalRequests,
      pendingRequests,
      awaitingAssignmentRequests,
      completedRequests,
      rejectedRequests,
      pendingMyAction,
      pendingDocumentReviews,
      totalWorkflows,
      totalUsers,
      userRole: currentUser.role,
      userName: currentUser.name,
    };
  }

  static getCharts(currentUser: User) {
    const scopedRequests = this.getScopedRequests(currentUser);

    // 1. By Status
    const statusMap: Record<string, number> = {
      Completed: 0,
      'Pending Approval': 0,
      'Awaiting Assignment': 0,
      'Returned for Correction': 0,
      Rejected: 0,
      Cancelled: 0,
    };

    scopedRequests.forEach((r) => {
      if (r.status === 'COMPLETED' || r.status === 'APPROVED') statusMap['Completed']++;
      else if (r.status === 'PENDING_APPROVAL') statusMap['Pending Approval']++;
      else if (r.status === 'AWAITING_APPROVER_ASSIGNMENT') statusMap['Awaiting Assignment']++;
      else if (r.status === 'RETURNED_FOR_CORRECTION') statusMap['Returned for Correction']++;
      else if (r.status === 'REJECTED') statusMap['Rejected']++;
      else if (r.status === 'CANCELLED') statusMap['Cancelled']++;
    });

    const requestsByStatus = Object.keys(statusMap).map((name) => ({
      name,
      value: statusMap[name],
    }));

    // 2. By Type
    const typeMap: Record<string, number> = {
      Leave: 0,
      Purchase: 0,
      Expense: 0,
    };

    scopedRequests.forEach((r) => {
      if (r.type === 'LEAVE') typeMap['Leave']++;
      else if (r.type === 'PURCHASE') typeMap['Purchase']++;
      else if (r.type === 'EXPENSE') typeMap['Expense']++;
    });

    const requestsByType = Object.keys(typeMap).map((name) => ({
      name,
      count: typeMap[name],
    }));

    // 3. Recent 5 requests
    const recentRequests = [...scopedRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      requestsByStatus,
      requestsByType,
      recentRequests,
    };
  }
}

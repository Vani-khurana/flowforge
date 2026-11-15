import { db } from '../db/store';
import { RequestItem, RequestStatus, User } from '../types';
import { AppError } from '../middleware/errorHandler';
import { AuditService } from './audit.service';
import { NotificationService } from './notification.service';
import { HierarchyService } from './hierarchy.service';

interface ListRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  scope?: 'my' | 'team' | 'department' | 'hr' | 'finance' | 'all' | string;
  userId?: string;
}

export class RequestService {
  static listRequests(params: ListRequestsParams, currentUser: User) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 10));

    let items = [...db.requests];

    // 1. Scope and Role Record Access Control
    if (params.scope === 'my' || currentUser.role === 'EMPLOYEE') {
      // In "My Requests" or for Employees, STRICTLY show only the authenticated user's own requests
      items = items.filter((r) => r.requesterId === currentUser.id);
    } else if (currentUser.role === 'MANAGER') {
      // Team scope: direct reports + self
      const subordinates = new Set(HierarchyService.getSubordinates(currentUser.id).map((s) => s.id));
      items = items.filter(
        (r) =>
          r.requesterId === currentUser.id ||
          subordinates.has(r.requesterId) ||
          (r.currentStepId &&
            HierarchyService.getEligibleApprovers(
              r,
              db.workflowSteps.find((s) => s.id === r.currentStepId)!
            ).some((u) => u.id === currentUser.id))
      );
    } else if (currentUser.role === 'DEPARTMENT_HEAD') {
      // Department scope: users in department + reporting chain + self
      const deptMembers = new Set(
        db.users.filter((u) => u.departmentId === currentUser.departmentId).map((u) => u.id)
      );
      items = items.filter(
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
    } else if (currentUser.role === 'HR') {
      // HR queue: Leave requests + HR department members + self
      const hrMembers = new Set(
        db.users.filter((u) => u.departmentId === currentUser.departmentId).map((u) => u.id)
      );
      items = items.filter(
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
    } else if (currentUser.role === 'FINANCE') {
      // Finance queue: Purchase and Expense requests + Finance department members + self
      const finMembers = new Set(
        db.users.filter((u) => u.departmentId === currentUser.departmentId).map((u) => u.id)
      );
      items = items.filter(
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
    // ADMIN can view all requests when scope is not 'my'

    // Filter by status
    if (params.status && params.status !== 'ALL') {
      items = items.filter((r) => r.status === params.status);
    }

    // Filter by type
    if (params.type && params.type !== 'ALL') {
      items = items.filter((r) => r.type === params.type);
    }

    // Search query
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (r.requesterName && r.requesterName.toLowerCase().includes(q)) ||
          r.type.toLowerCase().includes(q)
      );
    }

    // Attach documents to requests
    items = items.map((r) => ({
      ...r,
      documents: db.documents.filter((d) => d.requestId === r.id),
    }));

    // Sort newest first
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  static getRequestById(id: string, currentUser?: User): RequestItem & { workflowDetails?: any } {
    const req = db.requests.find((r) => r.id === id);
    if (!req) {
      throw new AppError('Request not found', 404);
    }

    // Strict authorization guard against URL / ID parameter manipulation
    if (currentUser && !HierarchyService.canUserViewRequest(currentUser, req)) {
      throw new AppError('Access denied: You do not have authorization to view this request record.', 403);
    }

    const workflow = db.workflows.find((w) => w.id === req.workflowId);
    const steps = db.workflowSteps
      .filter((s) => s.workflowId === req.workflowId)
      .sort((a, b) => a.order - b.order);

    const documents = db.documents.filter((d) => d.requestId === id);

    return {
      ...req,
      documents,
      workflowDetails: workflow ? { ...workflow, steps } : undefined,
    };
  }

  static createRequest(
    payload: {
      type: string;
      title: string;
      description?: string;
      data: Record<string, any>;
      workflowId?: string;
    },
    currentUser: User
  ): RequestItem {
    const now = new Date().toISOString();
    const typeUpper = payload.type.toUpperCase();

    // 1. Locate appropriate active workflow
    let workflow = payload.workflowId
      ? db.workflows.find((w) => w.id === payload.workflowId)
      : db.workflows.find((w) => w.type === typeUpper && w.status === 'ACTIVE');

    if (!workflow) {
      workflow = db.workflows[0];
    }

    const steps = db.workflowSteps
      .filter((s) => s.workflowId === workflow.id)
      .sort((a, b) => a.order - b.order);

    if (steps.length === 0) {
      throw new AppError('No workflow steps configured for this request type', 400);
    }

    const firstStep = steps[0];
    const newId = `REQ-${100 + db.requests.length + 1}`;

    const newRequest: RequestItem = {
      id: newId,
      title: payload.title,
      description: payload.description || null,
      type: typeUpper,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterEmail: currentUser.email,
      requesterRole: currentUser.role,
      departmentName: currentUser.departmentName || 'General',
      workflowId: workflow.id,
      workflowName: workflow.name,
      currentStepId: firstStep.id,
      currentStepName: firstStep.name,
      currentStepOrder: firstStep.order,
      currentStepRole: firstStep.approverRole,
      totalSteps: steps.length,
      status: 'PENDING_APPROVAL',
      version: 1,
      data: payload.data || {},
      documents: [],
      approvals: [],
      createdAt: now,
      updatedAt: now,
    };

    // Evaluate eligible approvers for initial stage
    const initialApprovers = HierarchyService.getEligibleApprovers(newRequest, firstStep);
    if (initialApprovers.length === 0) {
      newRequest.status = 'AWAITING_APPROVER_ASSIGNMENT';
    }

    db.requests.unshift(newRequest);

    // Audit log
    AuditService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'REQUEST_SUBMITTED',
      'Request',
      newId,
      {
        type: typeUpper,
        title: payload.title,
        assignedRole: firstStep.approverRole,
        stepName: firstStep.name,
        status: newRequest.status,
      }
    );

    // Notify initial step approvers or alert admin if assignment is missing
    if (newRequest.status === 'AWAITING_APPROVER_ASSIGNMENT') {
      NotificationService.createNotification(
        'user-admin',
        'Approver Assignment Required',
        `Request "${payload.title}" (${newId}) has no eligible approver configured and is awaiting administrator assignment.`,
        'ASSIGNMENT_REQUIRED',
        '/requests'
      );
    } else {
      for (const approver of initialApprovers) {
        NotificationService.createNotification(
          approver.id,
          'Approval Required',
          `${currentUser.name} submitted "${payload.title}" awaiting your review.`,
          'APPROVAL_REQUIRED',
          '/approvals'
        );
      }
    }

    // Persist store to disk
    db.save();

    return newRequest;
  }

  static assignApprover(
    requestId: string,
    approverId: string,
    currentUser: User
  ): RequestItem {
    if (currentUser.role !== 'ADMIN') {
      throw new AppError('Only System Administrators can assign approvers', 403);
    }

    const req = db.requests.find((r) => r.id === requestId);
    if (!req) {
      throw new AppError('Request not found', 404);
    }

    if (approverId === req.requesterId) {
      throw new AppError('Self-approval violation: Requester cannot be assigned as their own approver.', 400);
    }

    const targetUser = db.users.find((u) => u.id === approverId);
    if (!targetUser) {
      throw new AppError('Target approver user not found', 404);
    }

    req.assignedApproverId = targetUser.id;
    req.assignedApproverName = targetUser.name;
    req.status = 'PENDING_APPROVAL';
    req.updatedAt = new Date().toISOString();

    AuditService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'APPROVER_ASSIGNED',
      'Request',
      req.id,
      { assignedTo: targetUser.name, assignedId: targetUser.id }
    );

    NotificationService.createNotification(
      targetUser.id,
      'Task Assigned',
      `You were assigned as designated approver for request "${req.title}".`,
      'APPROVAL_REQUIRED',
      '/approvals'
    );

    db.save();
    return req;
  }

  static resubmitRequest(
    id: string,
    payload: {
      title?: string;
      description?: string;
      data?: Record<string, any>;
    },
    currentUser: User
  ): RequestItem {
    const req = db.requests.find((r) => r.id === id);
    if (!req) {
      throw new AppError('Request not found', 404);
    }

    if (req.requesterId !== currentUser.id) {
      throw new AppError('Only the original requester can resubmit this request', 403);
    }

    if (req.status !== 'RETURNED_FOR_CORRECTION') {
      throw new AppError(`Can only resubmit requests in RETURNED_FOR_CORRECTION status (current: ${req.status})`, 400);
    }

    if (payload.title) req.title = payload.title;
    if (payload.description !== undefined) req.description = payload.description;
    if (payload.data) req.data = { ...req.data, ...payload.data };

    req.status = 'PENDING_APPROVAL';
    req.updatedAt = new Date().toISOString();

    AuditService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'REQUEST_RESUBMITTED',
      'Request',
      id,
      { changes: payload }
    );

    // Notify current step approver
    const currentStep = db.workflowSteps.find((s) => s.id === req.currentStepId);
    if (currentStep) {
      if (currentStep.useDirectManager) {
        const manager = HierarchyService.getReportingManager(currentUser.id);
        if (manager) {
          NotificationService.createNotification(
            manager.id,
            'Request Resubmitted',
            `${currentUser.name} corrected and resubmitted "${req.title}".`,
            'APPROVAL_REQUIRED',
            '/approvals'
          );
        }
      } else if (currentStep.approverId) {
        NotificationService.createNotification(
          currentStep.approverId,
          'Request Resubmitted',
          `Request "${req.title}" was corrected and resubmitted for your review.`,
          'APPROVAL_REQUIRED',
          '/approvals'
        );
      }
    }

    // Persist store to disk
    db.save();

    return req;
  }

  static cancelRequest(id: string, currentUser: User): RequestItem {
    const req = db.requests.find((r) => r.id === id);
    if (!req) {
      throw new AppError('Request not found', 404);
    }

    if (req.requesterId !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw new AppError('You do not have permission to cancel this request', 403);
    }

    if (req.status === 'COMPLETED' || req.status === 'REJECTED') {
      throw new AppError(`Cannot cancel request with status ${req.status}`, 400);
    }

    req.status = 'CANCELLED';
    req.updatedAt = new Date().toISOString();

    AuditService.logAction(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'REQUEST_CANCELLED',
      'Request',
      id,
      { previousStatus: req.status }
    );

    // Persist store to disk
    db.save();

    return req;
  }
}

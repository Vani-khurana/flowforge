import { db } from '../db/store';
import { Approval, ApprovalAction, RequestItem, User } from '../types';
import { AppError } from '../middleware/errorHandler';
import { AuditService } from './audit.service';
import { HierarchyService } from './hierarchy.service';
import { NotificationService } from './notification.service';

export class ApprovalService {
  /**
   * Return requests currently pending approval that the current user is legally authorized to decide.
   * Respects reporting hierarchy, verification gating, specific assignments, and no-self-approval.
   */
  static async getPendingApprovals(currentUser: User): Promise<RequestItem[]> {
    await db.syncFromDb();
    return db.requests
      .filter((request) => {
        if (request.status !== 'PENDING_APPROVAL') return false;
        if (!request.currentStepId) return false;

        const currentStep = db.workflowSteps.find((s) => s.id === request.currentStepId);
        if (!currentStep) return false;

        // Requester cannot approve their own request
        if (currentUser.id === request.requesterId) return false;

        // Check if current user is an eligible approver for this step
        const eligibleApprovers = HierarchyService.getEligibleApprovers(request, currentStep);
        return eligibleApprovers.some((u) => u.id === currentUser.id);
      })
      .map((request) => ({
        ...request,
        documents: db.documents.filter((d) => d.requestId === request.id),
      }));
  }

  /**
   * Process an approval action (APPROVED, REJECTED, RETURNED_FOR_CORRECTION)
   * with full concurrency validation, hierarchy verification, gating checks, and audit logging.
   */
  static async processAction(
    requestId: string,
    action: ApprovalAction,
    comment: string | undefined,
    currentUser: User
  ): Promise<{ request: RequestItem; approval: Approval }> {
    await db.syncFromDb();
    const request = db.requests.find((r) => r.id === requestId);
    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'PENDING_APPROVAL') {
      throw new AppError(`Cannot act on request in ${request.status} status`, 400);
    }

    const currentStep = db.workflowSteps.find((s) => s.id === request.currentStepId);
    if (!currentStep) {
      throw new AppError('Invalid workflow state: current step not found', 500);
    }

    // 1. Rigorous enterprise authorization check
    const authCheck = HierarchyService.canUserApprove(currentUser, request, currentStep);
    if (!authCheck.allowed) {
      throw new AppError(authCheck.reason || 'Unauthorized to approve this step', 403);
    }

    // 2. Concurrency and duplicate approval protection
    const alreadyApprovedInStep = request.approvals.some(
      (a) =>
        a.stepId === currentStep.id &&
        a.action === 'APPROVED' &&
        new Date(a.createdAt).getTime() >= new Date(request.updatedAt).getTime() - 2000
    );
    if (alreadyApprovedInStep) {
      throw new AppError('This workflow stage has already been approved.', 409);
    }

    // 3. Action specific validations
    if (action === 'REJECTED' && (!comment || comment.trim().length === 0)) {
      throw new AppError('A reason/comment is required when rejecting a request', 422);
    }

    if (action === 'RETURNED_FOR_CORRECTION' && (!comment || comment.trim().length === 0)) {
      throw new AppError('Explanation of required corrections is required when returning a request', 422);
    }

    const now = new Date().toISOString();
    const currentStepName = currentStep.name || 'Approval Step';

    // 4. Record immutable Approval entity
    const approval: Approval = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      requestId: request.id,
      stepId: currentStep.id,
      stepName: currentStepName,
      approverId: currentUser.id,
      approverName: currentUser.name,
      approverRole: currentUser.role,
      action,
      comment: comment ? comment.trim() : null,
      createdAt: now,
    };

    request.approvals.push(approval);
    db.approvals.push(approval);
    request.version = (request.version || 1) + 1;

    // 5. State Machine Transitions & Notification Triggers
    if (action === 'REJECTED') {
      request.status = 'REJECTED';
      request.updatedAt = now;

      AuditService.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'REQUEST_REJECTED',
        'Request',
        request.id,
        {
          step: currentStepName,
          comment: comment?.trim(),
        }
      );

      NotificationService.createNotification(
        request.requesterId,
        'Request Rejected',
        `Your request "${request.title}" was rejected at ${currentStepName} by ${currentUser.name}: ${comment?.trim()}`,
        'REQUEST_REJECTED',
        '/requests'
      );
    } else if (action === 'RETURNED_FOR_CORRECTION') {
      request.status = 'RETURNED_FOR_CORRECTION';
      request.updatedAt = now;

      AuditService.logAction(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        'REQUEST_RETURNED_FOR_CORRECTION',
        'Request',
        request.id,
        {
          step: currentStepName,
          comment: comment?.trim(),
        }
      );

      NotificationService.createNotification(
        request.requesterId,
        'Request Returned for Correction',
        `Your request "${request.title}" requires revisions: ${comment?.trim()}`,
        'RETURNED_FOR_CORRECTION',
        '/requests'
      );
    } else {
      // APPROVED -> Evaluate Multi-Stage Pipeline and Threshold Routing
      const workflow = db.workflows.find((w) => w.id === request.workflowId);
      const allSteps = db.workflowSteps
        .filter((s) => s.workflowId === request.workflowId)
        .sort((a, b) => a.order - b.order);

      const currentIndex = allSteps.findIndex((s) => s.id === currentStep.id);
      let nextStep = allSteps[currentIndex + 1];

      // Threshold routing check:
      // If workflow has amountThreshold, and next step is DEPARTMENT_HEAD, but amount is within threshold:
      // skip to the step after (Finance)
      if (nextStep && nextStep.approverRole === 'DEPARTMENT_HEAD' && workflow?.amountThreshold) {
        const amount = Number(request.data?.amount || 0);
        if (amount < workflow.amountThreshold) {
          nextStep = allSteps[currentIndex + 2];
        }
      }

      if (nextStep) {
        // Advance to next pipeline stage
        request.currentStepId = nextStep.id;
        request.currentStepName = nextStep.name;
        request.currentStepOrder = nextStep.order;
        request.currentStepRole = nextStep.approverRole;
        request.updatedAt = now;

        // Check if next step has eligible approvers configured
        const nextEligible = HierarchyService.getEligibleApprovers(request, nextStep);

        if (nextEligible.length === 0) {
          request.status = 'AWAITING_APPROVER_ASSIGNMENT';

          AuditService.logAction(
            currentUser.id,
            currentUser.name,
            currentUser.role,
            'AWAITING_APPROVER_ASSIGNMENT',
            'Request',
            request.id,
            {
              completedStep: currentStepName,
              nextStep: nextStep.name,
              reason: 'No eligible approver configured for stage.',
            }
          );

          NotificationService.createNotification(
            'user-admin',
            'Approver Assignment Required',
            `Request "${request.title}" (${request.id}) stage "${nextStep.name}" has no eligible approver and is awaiting assignment.`,
            'ASSIGNMENT_REQUIRED',
            '/requests'
          );
        } else {
          request.status = 'PENDING_APPROVAL';

          AuditService.logAction(
            currentUser.id,
            currentUser.name,
            currentUser.role,
            'REQUEST_APPROVED',
            'Request',
            request.id,
            {
              completedStep: currentStepName,
              nextStep: nextStep.name,
              nextRole: nextStep.approverRole,
            }
          );

          // Notify next approver(s)
          this.notifyNextApprovers(request, nextStep);
        }
      } else {
        // No further stages -> Request Workflow is COMPLETED
        request.currentStepId = null;
        request.currentStepName = 'Completed';
        request.status = 'COMPLETED';
        request.updatedAt = now;

        AuditService.logAction(
          currentUser.id,
          currentUser.name,
          currentUser.role,
          'REQUEST_COMPLETED',
          'Request',
          request.id,
          {
            finalStep: currentStepName,
            totalSteps: request.totalSteps,
          }
        );

        NotificationService.createNotification(
          request.requesterId,
          'Request Fully Approved',
          `Your request "${request.title}" has been successfully approved across all stages and is now complete!`,
          'REQUEST_COMPLETED',
          '/requests'
        );
      }
    }

    // Persist store to database and disk
    await db.saveToDb();

    return { request, approval };
  }

  private static notifyNextApprovers(request: RequestItem, nextStep: any) {
    const approvers = HierarchyService.getEligibleApprovers(request, nextStep);
    for (const approver of approvers) {
      NotificationService.createNotification(
        approver.id,
        'Approval Required',
        `${request.requesterName} submitted request "${request.title}" awaiting your review.`,
        'APPROVAL_REQUIRED',
        '/approvals'
      );
    }
  }
}

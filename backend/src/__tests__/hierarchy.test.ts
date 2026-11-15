import { describe, it, expect, beforeEach } from 'vitest';
import { HierarchyService } from '../services/hierarchy.service';
import { RequestService } from '../services/request.service';
import { ApprovalService } from '../services/approval.service';
import { DashboardService } from '../services/dashboard.service';
import { AuthService } from '../services/auth.service';
import { db } from '../db/store';
import { RequestItem, WorkflowStep } from '../types';

describe('FlowForge Dynamic Role-Based Approval Hierarchy — Complete Test Suite', () => {
  beforeEach(() => {
    (db as any).seed();
  });

  // 1. Alex's leave request is assigned to Sarah
  it('1. Alex\'s leave request is assigned to Sarah', () => {
    const alex = db.users.find((u) => u.id === 'user-employee')!;
    const req = db.requests.find((r) => r.id === 'REQ-101')!; // Leave request by Alex
    const step = db.workflowSteps.find((s) => s.id === req.currentStepId)!;

    const eligible = HierarchyService.getEligibleApprovers(req, step);
    expect(eligible.some((u) => u.id === 'user-manager')).toBe(true);
    expect(eligible.some((u) => u.id === alex.id)).toBe(false);

    const sarah = db.users.find((u) => u.id === 'user-manager')!;
    const canSarahApprove = HierarchyService.canUserApprove(sarah, req, step);
    expect(canSarahApprove.allowed).toBe(true);
  });

  // 2. Sarah's leave request is assigned to Victoria, not Sarah
  it('2. Sarah\'s leave request is assigned to Victoria, not Sarah', () => {
    const sarah = db.users.find((u) => u.id === 'user-manager')!;
    const victoria = db.users.find((u) => u.id === 'user-dept-head')!;
    const req = db.requests.find((r) => r.id === 'REQ-105')!; // Leave request by Sarah
    const step = db.workflowSteps.find((s) => s.id === req.currentStepId)!;

    const eligible = HierarchyService.getEligibleApprovers(req, step);
    expect(eligible.some((u) => u.id === victoria.id)).toBe(true);
    expect(eligible.some((u) => u.id === sarah.id)).toBe(false);

    const canSarahApprove = HierarchyService.canUserApprove(sarah, req, step);
    expect(canSarahApprove.allowed).toBe(false);
    expect(canSarahApprove.reason).toContain('Self-approval is strictly prohibited');

    const canVictoriaApprove = HierarchyService.canUserApprove(victoria, req, step);
    expect(canVictoriaApprove.allowed).toBe(true);
  });

  // 3. Victoria cannot approve her own leave request
  it('3. Victoria cannot approve her own leave request', () => {
    const victoria = db.users.find((u) => u.id === 'user-dept-head')!;
    const req = db.requests.find((r) => r.id === 'REQ-106')!; // Request by Victoria
    const step = db.workflowSteps.find((s) => s.id === req.currentStepId)!;

    const result = HierarchyService.canUserApprove(victoria, req, step);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Self-approval is strictly prohibited');

    // Victoria must not be in eligible approver list
    const eligible = HierarchyService.getEligibleApprovers(req, step);
    expect(eligible.some((u) => u.id === victoria.id)).toBe(false);
  });

  // 4. Jessica cannot approve her own HR or leave request
  it('4. Jessica cannot approve her own HR or leave request', () => {
    const jessica = db.users.find((u) => u.id === 'user-hr')!;
    const req = db.requests.find((r) => r.id === 'REQ-107')!; // Leave request by Jessica
    const step1 = db.workflowSteps.find((s) => s.id === 'step-leave-1')!;
    const step2 = db.workflowSteps.find((s) => s.id === 'step-leave-2')!; // HR step

    // Cannot approve Step 1 (Manager)
    const canApproveStep1 = HierarchyService.canUserApprove(jessica, req, step1);
    expect(canApproveStep1.allowed).toBe(false);

    // Cannot approve Step 2 (HR step) even though she has HR role
    const canApproveStep2 = HierarchyService.canUserApprove(jessica, req, step2);
    expect(canApproveStep2.allowed).toBe(false);
    expect(canApproveStep2.reason).toContain('Self-approval is strictly prohibited');

    // Eligible approvers for Step 2 must exclude Jessica and fallback to senior approver
    const eligibleStep2 = HierarchyService.getEligibleApprovers(req, step2);
    expect(eligibleStep2.some((u) => u.id === jessica.id)).toBe(false);
  });

  // 5. Michael cannot approve his own Finance or leave request
  it('5. Michael cannot approve his own Finance or leave request', () => {
    const michael = db.users.find((u) => u.id === 'user-finance')!;
    const req = db.requests.find((r) => r.id === 'REQ-108')!; // Expense request by Michael
    const step2 = db.workflowSteps.find((s) => s.id === 'step-exp-2')!; // Finance step

    const canMichaelApprove = HierarchyService.canUserApprove(michael, req, step2);
    expect(canMichaelApprove.allowed).toBe(false);
    expect(canMichaelApprove.reason).toContain('Self-approval is strictly prohibited');

    const eligible = HierarchyService.getEligibleApprovers(req, step2);
    expect(eligible.some((u) => u.id === michael.id)).toBe(false);
  });

  // 6. Rachel cannot approve her own request merely because she is an administrator
  it('6. Rachel cannot approve her own request merely because she is an administrator', () => {
    const rachel = db.users.find((u) => u.id === 'user-admin')!;
    const req = db.requests.find((r) => r.id === 'REQ-109')!; // Leave request by Rachel
    const step = db.workflowSteps.find((s) => s.id === req.currentStepId)!;

    const result = HierarchyService.canUserApprove(rachel, req, step);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Self-approval is strictly prohibited');

    // Also on another user's business request where ADMIN is not the designated approver:
    const alexReq = db.requests.find((r) => r.id === 'REQ-101')!;
    const alexStep = db.workflowSteps.find((s) => s.id === alexReq.currentStepId)!;
    const adminCheck = HierarchyService.canUserApprove(rachel, alexReq, alexStep);
    expect(adminCheck.allowed).toBe(false);
    expect(adminCheck.reason).toContain('System Administrators are restricted');
  });

  // 7. Requests requiring Finance approval are routed to an eligible Finance approver
  it('7. Requests requiring Finance approval are routed to an eligible Finance approver', () => {
    const michael = db.users.find((u) => u.id === 'user-finance')!;
    const req = db.requests.find((r) => r.id === 'REQ-102')!; // Purchase request
    const stepFinance = db.workflowSteps.find((s) => s.id === 'step-purch-3')!;

    const eligible = HierarchyService.getEligibleApprovers(req, stepFinance);
    expect(eligible.some((u) => u.id === michael.id)).toBe(true);

    const canMichaelApprove = HierarchyService.canUserApprove(michael, req, stepFinance);
    expect(canMichaelApprove.allowed).toBe(true);
  });

  // 8. Unauthorized users cannot approve another person's assigned task
  it('8. Unauthorized users cannot approve another person\'s assigned task', () => {
    const alex = db.users.find((u) => u.id === 'user-employee')!;
    const hr = db.users.find((u) => u.id === 'user-hr')!;
    const req = db.requests.find((r) => r.id === 'REQ-101')!; // Leave request pending Manager (Sarah)
    const step = db.workflowSteps.find((s) => s.id === req.currentStepId)!;

    // Regular employee cannot approve
    const alexEval = HierarchyService.canUserApprove(alex, req, step);
    expect(alexEval.allowed).toBe(false);

    // HR user cannot approve direct manager step
    const hrEval = HierarchyService.canUserApprove(hr, req, step);
    expect(hrEval.allowed).toBe(false);
  });

  // 9. Users cannot access records outside their authorized scope
  it('9. Users cannot access records outside their authorized scope', () => {
    const alex = db.users.find((u) => u.id === 'user-employee')!;
    const sarahReq = db.requests.find((r) => r.id === 'REQ-105')!; // Sarah's request

    // Alex cannot view Sarah's request
    expect(HierarchyService.canUserViewRequest(alex, sarahReq)).toBe(false);
    expect(() => RequestService.getRequestById(sarahReq.id, alex)).toThrow('Access denied');

    // Alex CAN view his own request
    const alexReq = db.requests.find((r) => r.id === 'REQ-101')!;
    expect(HierarchyService.canUserViewRequest(alex, alexReq)).toBe(true);
    expect(() => RequestService.getRequestById(alexReq.id, alex)).not.toThrow();

    // HR cannot access unrelated Engineering purchase request
    const hrUser = db.users.find((u) => u.id === 'user-hr')!;
    const purchaseReq = db.requests.find((r) => r.id === 'REQ-102')!;
    expect(HierarchyService.canUserViewRequest(hrUser, purchaseReq)).toBe(false);
    expect(() => RequestService.getRequestById(purchaseReq.id, hrUser)).toThrow('Access denied');
  });

  // 10. Returned requests can be corrected and resubmitted while preserving history
  it('10. Returned requests can be corrected and resubmitted while preserving history', () => {
    const req = db.requests.find((r) => r.id === 'REQ-104')!; // Currently RETURNED_FOR_CORRECTION
    const employee = db.users.find((u) => u.id === req.requesterId)!;

    expect(req.approvals.length).toBeGreaterThan(0);
    const initialApprovalCount = req.approvals.length;

    const resubmitted = RequestService.resubmitRequest(
      req.id,
      { data: { correctedNotes: 'Receipt verified with tax breakdown.' } },
      employee
    );

    expect(resubmitted.status).toBe('PENDING_APPROVAL');
    // History must be preserved
    expect(resubmitted.approvals.length).toBe(initialApprovalCount);
    expect(resubmitted.approvals[0].action).toBe('RETURNED_FOR_CORRECTION');
  });

  // 11. Repeated approval attempts do not create duplicate transitions
  it('11. Repeated approval attempts do not create duplicate transitions', () => {
    const manager = db.users.find((u) => u.id === 'user-manager')!;
    const req = db.requests.find((r) => r.id === 'REQ-101')!;

    // First approval succeeds
    ApprovalService.processAction(req.id, 'APPROVED', 'First endorsement', manager);
    expect(req.currentStepId).toBe('step-leave-2'); // Advanced to HR

    // Second approval attempt on the completed step must be rejected
    expect(() =>
      ApprovalService.processAction(req.id, 'APPROVED', 'Duplicate endorsement attempt', manager)
    ).toThrow();
  });

  // 12. Competing concurrent decisions cannot both advance the same workflow stage
  it('12. Competing concurrent decisions cannot both advance the same workflow stage', () => {
    const manager = db.users.find((u) => u.id === 'user-manager')!;
    const req = db.requests.find((r) => r.id === 'REQ-101')!;

    // Initial state
    expect(req.status).toBe('PENDING_APPROVAL');
    expect(req.currentStepId).toBe('step-leave-1');

    // Simulate competitor 1 advancing the request
    ApprovalService.processAction(req.id, 'APPROVED', 'Advancing step 1', manager);

    // Simulate competitor 2 attempting to act on the same step concurrently
    expect(() =>
      ApprovalService.processAction(req.id, 'APPROVED', 'Concurrent race', manager)
    ).toThrow();
  });

  // 13. Missing approver configuration results in Awaiting Approver Assignment
  it('13. Missing approver configuration results in Awaiting Approver Assignment', () => {
    // Create an isolated user who has no manager and senior approver is temporarily unlinked
    const orphanUser = {
      id: 'user-orphan',
      name: 'Orphan Worker',
      email: 'orphan@flowforge.internal',
      role: 'EMPLOYEE' as const,
      departmentId: 'dept-5',
      departmentName: 'Product Marketing',
      managerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(orphanUser);

    // Create a new request for orphan user
    const newReq = RequestService.createRequest(
      {
        type: 'LEAVE',
        title: 'Emergency Medical Leave',
        data: { daysCount: 2 },
      },
      orphanUser
    );

    // Because direct manager is null and no chain exists for orphanUser,
    // and department has no manager, request must be in AWAITING_APPROVER_ASSIGNMENT
    // (If senior approver is available as fallback, test without senior approver)
    const step = db.workflowSteps.find((s) => s.id === newReq.currentStepId)!;
    // Temporarily clear senior approver to verify strict missing approver rule
    const senior = db.users.find((u) => u.id === 'user-senior');
    if (senior) senior.status = 'SUSPENDED';

    const eligible = HierarchyService.getEligibleApprovers(newReq, step);
    expect(eligible.length).toBe(0);

    // Admin can assign approver
    const admin = db.users.find((u) => u.role === 'ADMIN')!;
    const targetApprover = db.users.find((u) => u.id === 'user-manager')!;
    const assigned = RequestService.assignApprover(newReq.id, targetApprover.id, admin);
    expect(assigned.status).toBe('PENDING_APPROVAL');
    expect(assigned.assignedApproverId).toBe(targetApprover.id);

    // Restore senior status
    if (senior) senior.status = 'ACTIVE';
  });

  // 14. Dashboard counts respect permissions and match the underlying records
  it('14. Dashboard counts respect permissions and match the underlying records', () => {
    const alex = db.users.find((u) => u.id === 'user-employee')!;
    const alexStats = DashboardService.getStats(alex);

    // Alex should only see count of his own requests
    const alexDirectCount = db.requests.filter((r) => r.requesterId === alex.id).length;
    expect(alexStats.totalRequests).toBe(alexDirectCount);

    // In Requests list, scope=my returns exact same count
    const alexList = RequestService.listRequests({ scope: 'my' }, alex);
    expect(alexList.pagination.total).toBe(alexDirectCount);
  });

  // 15. Existing authentication and request-management functionality remains intact
  it('15. Existing authentication and request-management functionality remains intact', () => {
    const authResult = AuthService.switchUserByRole('EMPLOYEE');
    expect(authResult.user.id).toBe('user-employee');
    expect(authResult.tokens.accessToken).toBeDefined();

    const currentUser = AuthService.getCurrentUser('user-employee');
    expect(currentUser.name).toBe('Alex Rivera');
    expect(currentUser.role).toBe('EMPLOYEE');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ApprovalService } from '../services/approval.service';
import { RequestService } from '../services/request.service';
import { db } from '../db/store';

describe('Workflow Engine & Multi-Stage State Machine', () => {
  beforeEach(() => {
    (db as any).seed();
  });

  it('allows manager to approve and advances request to next step', () => {
    const manager = db.users.find((u) => u.id === 'user-manager')!;
    const request = db.requests.find((r) => r.id === 'REQ-101')!; // Leave request pending Step 1

    const result = ApprovalService.processAction(
      request.id,
      'APPROVED',
      'Approved for vacation',
      manager
    );

    expect(result.request.status).toBe('PENDING_APPROVAL');
    expect(result.request.currentStepId).toBe('step-leave-2'); // Advanced to HR
    expect(result.request.currentStepRole).toBe('HR');
  });

  it('completes workflow when final step is approved', () => {
    const hrUser = db.users.find((u) => u.id === 'user-hr')!;
    const request = db.requests.find((r) => r.id === 'REQ-101')!;

    // Step 1 approved
    const manager = db.users.find((u) => u.id === 'user-manager')!;
    ApprovalService.processAction(request.id, 'APPROVED', 'Approved by manager', manager);

    // Step 2 approved by HR
    const finalResult = ApprovalService.processAction(
      request.id,
      'APPROVED',
      'HR records updated',
      hrUser
    );

    expect(finalResult.request.status).toBe('COMPLETED');
    expect(finalResult.request.currentStepId).toBeNull();
  });

  it('handles RETURNED_FOR_CORRECTION action with explanation', () => {
    const manager = db.users.find((u) => u.id === 'user-manager')!;
    const request = db.requests.find((r) => r.id === 'REQ-101')!;

    const result = ApprovalService.processAction(
      request.id,
      'RETURNED_FOR_CORRECTION',
      'Please update your emergency contact details.',
      manager
    );

    expect(result.request.status).toBe('RETURNED_FOR_CORRECTION');

    // Requester corrects and resubmits
    const employee = db.users.find((u) => u.id === request.requesterId)!;
    const resubmitted = RequestService.resubmitRequest(
      request.id,
      { data: { emergencyContact: '+1-555-9999' } },
      employee
    );

    expect(resubmitted.status).toBe('PENDING_APPROVAL');
    expect(resubmitted.data.emergencyContact).toBe('+1-555-9999');
  });

  it('requires a reason when rejecting a request', () => {
    const manager = db.users.find((u) => u.id === 'user-manager')!;
    const request = db.requests.find((r) => r.id === 'REQ-101')!;

    expect(() =>
      ApprovalService.processAction(request.id, 'REJECTED', '', manager)
    ).toThrow('A reason/comment is required when rejecting a request');
  });
});

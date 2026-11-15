import { db } from '../db/store';
import { User, RequestItem, WorkflowStep } from '../types';

export class HierarchyService {
  /**
   * Find the direct reporting manager for a given user.
   */
  static getReportingManager(userId: string): User | null {
    const user = db.users.find((u) => u.id === userId);
    if (!user || !user.managerId) {
      return null;
    }
    return db.users.find((u) => u.id === user.managerId) || null;
  }

  /**
   * Traverse the reporting chain upward from employee to department head/executive.
   * Uses a Set to prevent infinite loops in cyclic graph configurations.
   */
  static getReportingChain(userId: string): User[] {
    const chain: User[] = [];
    const visited = new Set<string>();
    let currentId: string | null | undefined = userId;

    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const currentUser = db.users.find((u) => u.id === currentId);
      if (!currentUser || !currentUser.managerId) break;

      const manager = db.users.find((u) => u.id === currentUser.managerId);
      if (manager) {
        chain.push(manager);
        currentId = manager.id;
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Check whether `potentialManagerId` is either the direct manager or in the upward reporting chain of `employeeId`.
   */
  static isManagerOf(potentialManagerId: string, employeeId: string): boolean {
    if (!potentialManagerId || !employeeId) return false;
    if (potentialManagerId === employeeId) return false; // Self is not manager

    const chain = this.getReportingChain(employeeId);
    return chain.some((m) => m.id === potentialManagerId);
  }

  /**
   * Get all direct and indirect subordinates under a manager.
   */
  static getSubordinates(managerId: string): User[] {
    const subordinates: User[] = [];
    const queue: string[] = [managerId];
    const visited = new Set<string>([managerId]);

    while (queue.length > 0) {
      const currentManagerId = queue.shift()!;
      const directReports = db.users.filter((u) => u.managerId === currentManagerId);

      for (const report of directReports) {
        if (!visited.has(report.id)) {
          visited.add(report.id);
          subordinates.push(report);
          queue.push(report.id);
        }
      }
    }

    return subordinates;
  }

  /**
   * Get the Department Head for a given department.
   */
  static getDepartmentHead(departmentId: string): User | null {
    const dept = db.departments.find((d) => d.id === departmentId);
    if (!dept) return null;

    if (dept.managerId) {
      const head = db.users.find((u) => u.id === dept.managerId);
      if (head) return head;
    }

    return db.users.find((u) => u.departmentId === departmentId && u.role === 'DEPARTMENT_HEAD') || null;
  }

  /**
   * Get the designated Senior / Executive Approver.
   * Fallback for executive escalation or when designated approvers are requesters.
   */
  static getSeniorApprover(): User | null {
    return (
      db.users.find((u) => u.id === 'user-senior' && u.status !== 'SUSPENDED') ||
      db.users.find((u) => u.departmentId === 'dept-exec' && u.status !== 'SUSPENDED') ||
      null
    );
  }

  /**
   * Determine the list of eligible approvers for a given request and workflow step.
   * Strictly enforces:
   * 1. Self-approval exclusion (requesterId is NEVER eligible)
   * 2. Direct manager dynamic routing
   * 3. Specific approver assignment (with self-exclusion fallback)
   * 4. Role segregation of duties (HR self-leave, Finance self-expense, Dept Head self-purchase)
   * 5. Fallback escalation to Senior Approver when eligible approver would otherwise be empty.
   */
  static getEligibleApprovers(request: RequestItem, step: WorkflowStep): User[] {
    const requesterId = request.requesterId;
    const seniorApprover = this.getSeniorApprover();

    // 1. Direct Manager step
    if (step.useDirectManager) {
      const directManager = this.getReportingManager(requesterId);
      if (directManager && directManager.id !== requesterId) {
        return [directManager];
      }
      // If direct manager is missing or is self, traverse upward reporting chain
      const chain = this.getReportingChain(requesterId);
      const higherManager = chain.find((m) => m.id !== requesterId);
      if (higherManager) {
        return [higherManager];
      }
      // Fallback to Senior Approver if configured and not requester
      if (seniorApprover && seniorApprover.id !== requesterId) {
        return [seniorApprover];
      }
      return [];
    }

    // 2. Specific Approver ID
    if (step.approverId) {
      if (step.approverId !== requesterId) {
        const designated = db.users.find((u) => u.id === step.approverId && u.status !== 'SUSPENDED');
        if (designated) return [designated];
      }
      // If designated approver is the requester, self-approval is forbidden!
      // Provide senior approver / independent escalation
      if (seniorApprover && seniorApprover.id !== requesterId) {
        return [seniorApprover];
      }
      return [];
    }

    // 3. Approver Role matching
    if (step.approverRole) {
      // Find candidate users with that role, excluding requester and suspended
      const candidates = db.users.filter(
        (u) => u.role === step.approverRole && u.id !== requesterId && u.status !== 'SUSPENDED'
      );

      // Role-specific refinement:
      if (step.approverRole === 'DEPARTMENT_HEAD') {
        const requester = db.users.find((u) => u.id === requesterId);
        const deptHead = candidates.find((u) => u.departmentId === requester?.departmentId);
        if (deptHead) return [deptHead];
        // If requester is the department head (e.g. Victoria Chase), fallback to Senior Approver
        if (seniorApprover && seniorApprover.id !== requesterId) {
          return [seniorApprover];
        }
        return candidates;
      }

      if (step.approverRole === 'HR') {
        if (candidates.length > 0) return candidates;
        // If Jessica Pearson is requester, no other HR exists -> Senior Approver
        if (seniorApprover && seniorApprover.id !== requesterId) {
          return [seniorApprover];
        }
      }

      if (step.approverRole === 'FINANCE') {
        if (candidates.length > 0) return candidates;
        // If Michael Scott is requester, no other Finance exists -> Senior Approver
        if (seniorApprover && seniorApprover.id !== requesterId) {
          return [seniorApprover];
        }
      }

      if (step.approverRole === 'MANAGER') {
        const chain = this.getReportingChain(requesterId);
        const managerInChain = chain.find((m) => m.id !== requesterId);
        if (managerInChain) return [managerInChain];
        if (candidates.length > 0) return candidates;
        if (seniorApprover && seniorApprover.id !== requesterId) {
          return [seniorApprover];
        }
      }

      return candidates;
    }

    return [];
  }

  /**
   * Comprehensive enterprise approval permission evaluator.
   * Enforces:
   * 1. Self-approval prohibition
   * 2. ADMIN != Approver separation of concerns
   * 3. Dynamic direct manager hierarchy matching
   * 4. Designated approver identification
   * 5. Role-based step authority
   * 6. Document evidence verification prerequisite gating
   */
  static canUserApprove(
    user: User,
    request: RequestItem,
    step: WorkflowStep
  ): { allowed: boolean; reason?: string } {
    // 1. Strictly prohibit self-approval under all circumstances
    if (user.id === request.requesterId) {
      return {
        allowed: false,
        reason: 'Self-approval is strictly prohibited by corporate governance policies.',
      };
    }

    // 2. ADMIN ≠ APPROVER rule:
    // Administrators cannot approve business requests unless the step explicitly designates ADMIN role or specific approverId
    if (user.role === 'ADMIN') {
      const explicitlyAssigned =
        step.approverId === user.id || step.approverRole === 'ADMIN';
      if (!explicitlyAssigned) {
        return {
          allowed: false,
          reason:
            'System Administrators are restricted from approving operational requests unless explicitly designated as the step approver.',
        };
      }
    }

    // 3. Document verification gating check
    if (step.requiresVerificationPassed) {
      const reqDocs = request.documents || db.documents.filter((d) => d.requestId === request.id);
      if (reqDocs.length > 0) {
        const unverified = reqDocs.filter(
          (d) => d.status === 'PROCESSING' || d.status === 'VERIFICATION_FAILED' || d.status === 'REJECTED'
        );
        if (unverified.length > 0) {
          return {
            allowed: false,
            reason:
              'Document verification gating: attached evidence documents have not successfully passed automated verification or compliance checks.',
          };
        }

        const reviewRequired = reqDocs.filter(
          (d) => d.status === 'REVIEW_REQUIRED' && !d.reviewerId
        );
        if (reviewRequired.length > 0) {
          return {
            allowed: false,
            reason:
              'Document verification gating: one or more documents require human compliance review before approval can proceed.',
          };
        }
      }
    }

    // 4. Eligible approvers evaluation
    const eligibleApprovers = this.getEligibleApprovers(request, step);
    const isEligible = eligibleApprovers.some((u) => u.id === user.id);

    if (!isEligible) {
      return {
        allowed: false,
        reason: 'User is not an authorized approver for this workflow stage.',
      };
    }

    return { allowed: true };
  }

  /**
   * Record-scope security evaluator.
   * Prevents unauthorized access to request details via URL or API payload ID tampering.
   */
  static canUserViewRequest(user: User, request: RequestItem): boolean {
    if (!user || !request) return false;

    // 1. Requester can always view their own request
    if (user.id === request.requesterId) return true;

    // 2. System Administrator can view all records for operational management & audit
    if (user.role === 'ADMIN') return true;

    // 3. Regular Employees are strictly confined to their own requests
    if (user.role === 'EMPLOYEE') return false;

    // 4. If user is currently an eligible approver for the active step
    if (request.currentStepId) {
      const currentStep = db.workflowSteps.find((s) => s.id === request.currentStepId);
      if (currentStep) {
        const eligible = this.getEligibleApprovers(request, currentStep);
        if (eligible.some((u) => u.id === user.id)) return true;
      }
    }

    // 5. Managers can view their own requests and direct/indirect subordinates
    if (user.role === 'MANAGER') {
      return this.isManagerOf(user.id, request.requesterId);
    }

    // 6. Department Heads can view requests within their department or reporting chain
    if (user.role === 'DEPARTMENT_HEAD') {
      const requester = db.users.find((u) => u.id === request.requesterId);
      if (requester && requester.departmentId === user.departmentId) return true;
      return this.isManagerOf(user.id, request.requesterId);
    }

    // 7. HR can view LEAVE requests and requests from Human Resources department
    if (user.role === 'HR') {
      if (request.type === 'LEAVE') return true;
      const requester = db.users.find((u) => u.id === request.requesterId);
      return requester?.departmentId === user.departmentId;
    }

    // 8. Finance can view PURCHASE & EXPENSE requests and requests from Finance department
    if (user.role === 'FINANCE') {
      if (request.type === 'PURCHASE' || request.type === 'EXPENSE') return true;
      const requester = db.users.find((u) => u.id === request.requesterId);
      return requester?.departmentId === user.departmentId;
    }

    return false;
  }
}

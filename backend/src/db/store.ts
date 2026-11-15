import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import {
  Department,
  User,
  Workflow,
  WorkflowStep,
  RequestItem,
  RequestDocument,
  Approval,
  Notification,
  AuditLog,
  Role,
} from '../types';

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export class DataStore {
  departments: Department[] = [];
  users: User[] = [];
  workflows: Workflow[] = [];
  workflowSteps: WorkflowStep[] = [];
  requests: RequestItem[] = [];
  documents: RequestDocument[] = [];
  approvals: Approval[] = [];
  notifications: Notification[] = [];
  sessions: SessionRecord[] = [];
  auditLogs: AuditLog[] = [];

  constructor() {
    this.seed();
    this.loadFromDisk();
  }

  private getPersistencePath(): string {
    const baseDir = path.resolve(__dirname, '..', '..');
    const candidates = [
      path.join(baseDir, 'data'),
      path.resolve(process.cwd(), 'backend', 'data'),
      path.resolve(process.cwd(), 'data'),
    ];
    const dataDir = candidates.find((d) => fs.existsSync(d)) || candidates[0];
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    return path.join(dataDir, 'store.json');
  }

  public save() {
    try {
      const filePath = this.getPersistencePath();
      const payload = {
        departments: this.departments,
        users: this.users,
        workflows: this.workflows,
        workflowSteps: this.workflowSteps,
        requests: this.requests,
        documents: this.documents,
        approvals: this.approvals,
        notifications: this.notifications,
        sessions: this.sessions,
        auditLogs: this.auditLogs,
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DataStore] Failed to save store to disk:', err);
    }
  }

  public loadFromDisk() {
    try {
      const filePath = this.getPersistencePath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          const hasSenior = Array.isArray(data.users) && data.users.some((u: any) => u.id === 'user-senior');
          if (hasSenior) {
            if (Array.isArray(data.departments) && data.departments.length > 0) this.departments = data.departments;
            if (Array.isArray(data.users) && data.users.length > 0) this.users = data.users;
            if (Array.isArray(data.workflows) && data.workflows.length > 0) this.workflows = data.workflows;
            if (Array.isArray(data.workflowSteps) && data.workflowSteps.length > 0) this.workflowSteps = data.workflowSteps;
            if (Array.isArray(data.requests) && data.requests.length > 0) this.requests = data.requests;
            if (Array.isArray(data.documents) && data.documents.length > 0) this.documents = data.documents;
            if (Array.isArray(data.approvals) && data.approvals.length > 0) this.approvals = data.approvals;
            if (Array.isArray(data.notifications) && data.notifications.length > 0) this.notifications = data.notifications;
            if (Array.isArray(data.sessions) && data.sessions.length > 0) this.sessions = data.sessions;
            if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) this.auditLogs = data.auditLogs;
          } else {
            this.save();
          }
        }
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('[DataStore] Could not load persisted data, using seed fixtures:', err);
    }
  }

  private seed() {
    const now = new Date().toISOString();
    // Pre-calculate hash for seed passwords (Password123!)
    const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

    // 1. Departments
    this.departments = [
      { id: 'dept-1', name: 'Engineering', code: 'ENG', managerId: 'user-dept-head', createdAt: now, updatedAt: now },
      { id: 'dept-2', name: 'Human Resources', code: 'HR', managerId: 'user-hr', createdAt: now, updatedAt: now },
      { id: 'dept-3', name: 'Finance & Accounts', code: 'FIN', managerId: 'user-finance', createdAt: now, updatedAt: now },
      { id: 'dept-4', name: 'Operations', code: 'OPS', managerId: 'user-admin', createdAt: now, updatedAt: now },
      { id: 'dept-5', name: 'Product Marketing', code: 'MKT', managerId: null, createdAt: now, updatedAt: now },
      { id: 'dept-exec', name: 'Executive Leadership', code: 'EXEC', managerId: 'user-senior', createdAt: now, updatedAt: now },
    ];

    // 2. Users with Strict Organizational Hierarchy
    // Hierarchy:
    // - Executive Director / Senior Approver: Dr. Arthur Bell (DEPARTMENT_HEAD) [Executive Leadership]
    //   -> Operations: Rachel Zane (ADMIN) [managerId: user-senior]
    //   -> Engineering Head: Victoria Chase (DEPARTMENT_HEAD) [managerId: user-senior]
    //      -> Engineering Manager: Sarah Connor (MANAGER) [managerId: user-dept-head]
    //         -> Software Engineer: Alex Rivera (EMPLOYEE) [managerId: user-manager]
    //   -> HR Specialist: Jessica Pearson (HR) [managerId: user-senior]
    //   -> Finance Lead: Michael Scott (FINANCE) [managerId: user-senior]
    this.users = [
      {
        id: 'user-senior',
        name: 'Dr. Arthur Bell',
        email: 'senior.approver@flowforge.internal',
        passwordHash: defaultPasswordHash,
        role: 'DEPARTMENT_HEAD',
        status: 'ACTIVE',
        departmentId: 'dept-exec',
        departmentName: 'Executive Leadership',
        managerId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-admin',
        name: 'Rachel Zane',
        email: 'admin@flowforge.internal',
        passwordHash: defaultPasswordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        departmentId: 'dept-4',
        departmentName: 'Operations',
        managerId: 'user-senior',
        managerName: 'Dr. Arthur Bell',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-dept-head',
        name: 'Victoria Chase',
        email: 'head.eng@flowforge.internal',
        passwordHash: defaultPasswordHash,
        role: 'DEPARTMENT_HEAD',
        status: 'ACTIVE',
        departmentId: 'dept-1',
        departmentName: 'Engineering',
        managerId: 'user-senior',
        managerName: 'Dr. Arthur Bell',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-manager',
        name: 'Sarah Connor',
        email: 'manager@flowforge.internal',
        passwordHash: defaultPasswordHash,
        role: 'MANAGER',
        status: 'ACTIVE',
        departmentId: 'dept-1',
        departmentName: 'Engineering',
        managerId: 'user-dept-head',
        managerName: 'Victoria Chase',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-employee',
        name: 'Alex Rivera',
        email: 'employee@flowforge.internal',
        passwordHash: defaultPasswordHash,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        departmentId: 'dept-1',
        departmentName: 'Engineering',
        managerId: 'user-manager',
        managerName: 'Sarah Connor',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-hr',
        name: 'Jessica Pearson',
        email: 'hr@flowforge.internal',
        passwordHash: defaultPasswordHash,
        role: 'HR',
        status: 'ACTIVE',
        departmentId: 'dept-2',
        departmentName: 'Human Resources',
        managerId: 'user-senior',
        managerName: 'Dr. Arthur Bell',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'user-finance',
        name: 'Michael Scott',
        email: 'finance@flowforge.internal',
        passwordHash: defaultPasswordHash,
        role: 'FINANCE',
        status: 'ACTIVE',
        departmentId: 'dept-3',
        departmentName: 'Finance & Accounts',
        managerId: 'user-senior',
        managerName: 'Dr. Arthur Bell',
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 3. Workflows & Multi-stage Steps
    const wfLeaveId = 'wf-leave';
    const wfPurchaseId = 'wf-purchase';
    const wfExpenseId = 'wf-expense';

    // Leave Workflow: Step 1 = Direct Manager (Dynamic), Step 2 = HR
    const stepLeave1: WorkflowStep = {
      id: 'step-leave-1',
      workflowId: wfLeaveId,
      name: 'Direct Manager Approval',
      order: 1,
      approverRole: 'MANAGER',
      approverId: null,
      useDirectManager: true,
      requiresVerificationPassed: false,
      createdAt: now,
      updatedAt: now,
    };
    const stepLeave2: WorkflowStep = {
      id: 'step-leave-2',
      workflowId: wfLeaveId,
      name: 'HR Final Sign-Off',
      order: 2,
      approverRole: 'HR',
      approverId: 'user-hr',
      useDirectManager: false,
      requiresVerificationPassed: false,
      createdAt: now,
      updatedAt: now,
    };

    // Purchase Workflow:
    // Step 1: Direct Manager (Verification Required)
    // Step 2: Department Head (Threshold > $1000)
    // Step 3: Finance Disbursement
    const stepPurch1: WorkflowStep = {
      id: 'step-purch-1',
      workflowId: wfPurchaseId,
      name: 'Direct Manager Endorsement',
      order: 1,
      approverRole: 'MANAGER',
      approverId: null,
      useDirectManager: true,
      requiresVerificationPassed: true,
      createdAt: now,
      updatedAt: now,
    };
    const stepPurch2: WorkflowStep = {
      id: 'step-purch-2',
      workflowId: wfPurchaseId,
      name: 'Department Head Authorization',
      order: 2,
      approverRole: 'DEPARTMENT_HEAD',
      approverId: 'user-dept-head',
      useDirectManager: false,
      requiresVerificationPassed: false,
      createdAt: now,
      updatedAt: now,
    };
    const stepPurch3: WorkflowStep = {
      id: 'step-purch-3',
      workflowId: wfPurchaseId,
      name: 'Finance Budget Clearance',
      order: 3,
      approverRole: 'FINANCE',
      approverId: 'user-finance',
      useDirectManager: false,
      requiresVerificationPassed: false,
      createdAt: now,
      updatedAt: now,
    };

    // Expense Workflow: Step 1: Direct Manager (Verification Required), Step 2: Finance
    const stepExp1: WorkflowStep = {
      id: 'step-exp-1',
      workflowId: wfExpenseId,
      name: 'Manager Review & Evidence Audit',
      order: 1,
      approverRole: 'MANAGER',
      approverId: null,
      useDirectManager: true,
      requiresVerificationPassed: true,
      createdAt: now,
      updatedAt: now,
    };
    const stepExp2: WorkflowStep = {
      id: 'step-exp-2',
      workflowId: wfExpenseId,
      name: 'Finance Reimbursement',
      order: 2,
      approverRole: 'FINANCE',
      approverId: 'user-finance',
      useDirectManager: false,
      requiresVerificationPassed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.workflowSteps = [
      stepLeave1,
      stepLeave2,
      stepPurch1,
      stepPurch2,
      stepPurch3,
      stepExp1,
      stepExp2,
    ];

    this.workflows = [
      {
        id: wfLeaveId,
        name: 'Employee Leave Request',
        description: 'Multi-stage approval for personal, annual, and medical leave.',
        type: 'LEAVE',
        status: 'ACTIVE',
        createdById: 'user-admin',
        requiresDocuments: false,
        requiredDocumentTypes: [],
        steps: [stepLeave1, stepLeave2],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: wfPurchaseId,
        name: 'Capital & Equipment Purchase',
        description: 'Hardware, software licenses, and capital expenditures with threshold routing.',
        type: 'PURCHASE',
        status: 'ACTIVE',
        createdById: 'user-admin',
        requiresDocuments: true,
        requiredDocumentTypes: ['INVOICE', 'QUOTE'],
        amountThreshold: 1000,
        steps: [stepPurch1, stepPurch2, stepPurch3],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: wfExpenseId,
        name: 'Travel & Expense Reimbursement',
        description: 'Employee travel, meals, and authorized operational reimbursements.',
        type: 'EXPENSE',
        status: 'ACTIVE',
        createdById: 'user-admin',
        requiresDocuments: true,
        requiredDocumentTypes: ['RECEIPT'],
        steps: [stepExp1, stepExp2],
        createdAt: now,
        updatedAt: now,
      },
    ];

    // 4. Sample Documents
    const doc1: RequestDocument = {
      id: 'doc-001',
      requestId: 'REQ-102',
      uploaderId: 'user-employee',
      uploaderName: 'Alex Rivera',
      fileName: 'NVIDIA_RTX5090_Invoice_Quote.pdf',
      storagePath: 'uploads/NVIDIA_RTX5090_Invoice_Quote.pdf',
      fileSize: 184500,
      mimeType: 'application/pdf',
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      documentType: 'QUOTE',
      status: 'VERIFIED',
      ocrConfidence: 0.97,
      ocrExtracted: {
        vendor: 'NVIDIA Authorized Partner',
        amount: 2850,
        currency: 'USD',
        date: '2026-10-10',
        lineItems: ['NVIDIA RTX 5090 32GB PCIe workstation GPU'],
      },
      verificationChecks: {
        mimeMatch: true,
        sha256Unique: true,
        amountMatch: true,
        vendorVerified: true,
        antiTamperPassed: true,
      },
      warnings: [],
      reviewerId: 'user-finance',
      reviewerName: 'Michael Scott',
      reviewerNotes: 'Verified against OEM enterprise channel pricing.',
      reviewedAt: now,
      createdAt: new Date(Date.now() - 3600000 * 47).toISOString(),
      updatedAt: now,
    };

    const doc2: RequestDocument = {
      id: 'doc-002',
      requestId: 'REQ-103',
      uploaderId: 'user-employee',
      uploaderName: 'Alex Rivera',
      fileName: 'DevOps_Hotel_Receipt.png',
      storagePath: 'uploads/DevOps_Hotel_Receipt.png',
      fileSize: 421000,
      mimeType: 'image/png',
      fileHash: '4a6b29d89fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b888',
      documentType: 'RECEIPT',
      status: 'VERIFIED',
      ocrConfidence: 0.94,
      ocrExtracted: {
        vendor: 'Hilton Chicago O\'Hare',
        amount: 640,
        currency: 'USD',
        date: '2026-09-15',
      },
      verificationChecks: {
        mimeMatch: true,
        sha256Unique: true,
        amountMatch: true,
        vendorVerified: true,
        antiTamperPassed: true,
      },
      warnings: [],
      reviewerId: 'user-manager',
      reviewerName: 'Sarah Connor',
      reviewerNotes: 'Official conference room folio verified.',
      reviewedAt: new Date(Date.now() - 3600000 * 39).toISOString(),
      createdAt: new Date(Date.now() - 3600000 * 71).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 39).toISOString(),
    };

    const doc3: RequestDocument = {
      id: 'doc-003',
      requestId: 'REQ-104',
      uploaderId: 'user-employee',
      uploaderName: 'Alex Rivera',
      fileName: 'Keyboard_Purchase_Receipt_Damaged.jpg',
      storagePath: 'uploads/Keyboard_Purchase_Receipt_Damaged.jpg',
      fileSize: 89000,
      mimeType: 'image/jpeg',
      fileHash: '98fa201b9fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b777',
      documentType: 'RECEIPT',
      status: 'REVIEW_REQUIRED',
      ocrConfidence: 0.62,
      ocrExtracted: {
        vendor: 'TechRetail Store',
        amount: 195,
        currency: 'USD',
      },
      verificationChecks: {
        mimeMatch: true,
        sha256Unique: true,
        amountMatch: false,
        vendorVerified: true,
        antiTamperPassed: false,
      },
      warnings: [
        'Image DPI below optimal OCR threshold (150 DPI)',
        'Extracted total amount (195.00) differs from tax subtotal breakdown',
        'Human compliance officer review mandated before stage clearance',
      ],
      reviewerId: null,
      reviewerNotes: null,
      reviewedAt: null,
      createdAt: new Date(Date.now() - 3600000 * 29).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 29).toISOString(),
    };

    this.documents = [doc1, doc2, doc3];

    // 5. Sample Requests & Approvals
    // Request 1: Leave - Pending Step 1 (Manager: Sarah Connor)
    const req1: RequestItem = {
      id: 'REQ-101',
      title: 'Annual Vacation Leave (5 Days)',
      description: 'Family vacation trip during national holiday week.',
      type: 'LEAVE',
      requesterId: 'user-employee',
      requesterName: 'Alex Rivera',
      requesterEmail: 'employee@flowforge.internal',
      requesterRole: 'EMPLOYEE',
      departmentName: 'Engineering',
      workflowId: wfLeaveId,
      workflowName: 'Employee Leave Request',
      currentStepId: 'step-leave-1',
      currentStepName: 'Direct Manager Approval',
      currentStepOrder: 1,
      currentStepRole: 'MANAGER',
      totalSteps: 2,
      status: 'PENDING_APPROVAL',
      data: {
        leaveType: 'Annual',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        daysCount: 5,
        emergencyContact: '+1-555-0192',
      },
      documents: [],
      approvals: [],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    };

    // Request 2: Purchase - Step 1 Approved, Pending Step 2 (Dept Head: Victoria Chase)
    const app2_1: Approval = {
      id: 'app-2-1',
      requestId: 'REQ-102',
      stepId: 'step-purch-1',
      stepName: 'Direct Manager Endorsement',
      approverId: 'user-manager',
      approverName: 'Sarah Connor',
      approverRole: 'MANAGER',
      action: 'APPROVED',
      comment: 'Approved. Essential tooling upgrade for Q4 deliverables.',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    };

    const req2: RequestItem = {
      id: 'REQ-102',
      title: 'High-Performance GPU Workstation Requisition',
      description: 'AI model fine-tuning workstation for local workflow benchmarking.',
      type: 'PURCHASE',
      requesterId: 'user-employee',
      requesterName: 'Alex Rivera',
      requesterEmail: 'employee@flowforge.internal',
      requesterRole: 'EMPLOYEE',
      departmentName: 'Engineering',
      workflowId: wfPurchaseId,
      workflowName: 'Capital & Equipment Purchase',
      currentStepId: 'step-purch-2',
      currentStepName: 'Department Head Authorization',
      currentStepOrder: 2,
      currentStepRole: 'DEPARTMENT_HEAD',
      totalSteps: 3,
      status: 'PENDING_APPROVAL',
      data: {
        item: 'NVIDIA RTX 5090 Deep Learning Node',
        amount: 2850,
        currency: 'USD',
        vendor: 'NVIDIA Authorized Partner',
        requiredDate: '2026-10-25',
        justification: 'Accelerate enterprise AI workflow pipelines without external cloud latency.',
      },
      documents: [doc1],
      approvals: [app2_1],
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    };

    // Request 3: Expense - Completed (Approved by Manager & Finance)
    const app3_1: Approval = {
      id: 'app-3-1',
      requestId: 'REQ-103',
      stepId: 'step-exp-1',
      stepName: 'Manager Review & Evidence Audit',
      approverId: 'user-manager',
      approverName: 'Sarah Connor',
      approverRole: 'MANAGER',
      action: 'APPROVED',
      comment: 'Verified against travel itinerary and hotel invoice.',
      createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    };
    const app3_2: Approval = {
      id: 'app-3-2',
      requestId: 'REQ-103',
      stepId: 'step-exp-2',
      stepName: 'Finance Reimbursement',
      approverId: 'user-finance',
      approverName: 'Michael Scott',
      approverRole: 'FINANCE',
      action: 'APPROVED',
      comment: 'Cleared for direct deposit disbursement.',
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    };

    const req3: RequestItem = {
      id: 'REQ-103',
      title: 'DevOps Summit Conference & Accommodations',
      description: 'Flight tickets, registration fee, and accommodation receipts.',
      type: 'EXPENSE',
      requesterId: 'user-employee',
      requesterName: 'Alex Rivera',
      requesterEmail: 'employee@flowforge.internal',
      requesterRole: 'EMPLOYEE',
      departmentName: 'Engineering',
      workflowId: wfExpenseId,
      workflowName: 'Travel & Expense Reimbursement',
      currentStepId: null,
      currentStepName: 'Completed',
      currentStepOrder: 2,
      currentStepRole: undefined,
      totalSteps: 2,
      status: 'COMPLETED',
      data: {
        category: 'Travel & Accommodation',
        amount: 640,
        currency: 'USD',
        date: '2026-09-15',
        description: 'Attended International DevOps Summit 2026',
      },
      documents: [doc2],
      approvals: [app3_1, app3_2],
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    };

    // Request 4: Expense - Returned for Correction by Manager
    const app4_1: Approval = {
      id: 'app-4-1',
      requestId: 'REQ-104',
      stepId: 'step-exp-1',
      stepName: 'Manager Review & Evidence Audit',
      approverId: 'user-manager',
      approverName: 'Sarah Connor',
      approverRole: 'MANAGER',
      action: 'RETURNED_FOR_CORRECTION',
      comment: 'The receipt scan is low-resolution and tax subtotal does not balance. Please upload a clear scan or high-res photo.',
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    };

    const req4: RequestItem = {
      id: 'REQ-104',
      title: 'Unitemized Office Supplies Reimbursement',
      description: 'Purchased mechanical keyboard and monitor stand.',
      type: 'EXPENSE',
      requesterId: 'user-employee',
      requesterName: 'Alex Rivera',
      requesterEmail: 'employee@flowforge.internal',
      requesterRole: 'EMPLOYEE',
      departmentName: 'Engineering',
      workflowId: wfExpenseId,
      workflowName: 'Travel & Expense Reimbursement',
      currentStepId: 'step-exp-1',
      currentStepName: 'Manager Review & Evidence Audit',
      currentStepOrder: 1,
      currentStepRole: 'MANAGER',
      totalSteps: 2,
      status: 'RETURNED_FOR_CORRECTION',
      data: {
        category: 'Office Supplies',
        amount: 195,
        currency: 'USD',
        date: '2026-09-18',
        description: 'Peripherals reimbursement',
      },
      documents: [doc3],
      approvals: [app4_1],
      createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    };

    // Request 5: Manager Leave (Sarah Connor) - Pending Victoria Chase (Dept Head)
    const req5: RequestItem = {
      id: 'REQ-105',
      title: 'Leadership Strategy Offsite Leave (3 Days)',
      description: 'Offsite strategic planning conference and leadership leave.',
      type: 'LEAVE',
      requesterId: 'user-manager',
      requesterName: 'Sarah Connor',
      requesterEmail: 'manager@flowforge.internal',
      requesterRole: 'MANAGER',
      departmentName: 'Engineering',
      workflowId: wfLeaveId,
      workflowName: 'Employee Leave Request',
      currentStepId: 'step-leave-1',
      currentStepName: 'Direct Manager Approval',
      currentStepOrder: 1,
      currentStepRole: 'MANAGER',
      totalSteps: 2,
      status: 'PENDING_APPROVAL',
      data: {
        leaveType: 'Professional Development',
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        daysCount: 3,
      },
      documents: [],
      approvals: [],
      createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    };

    // Request 6: Dept Head Purchase (Victoria Chase) - Engineering Cloud Server Cluster
    const req6: RequestItem = {
      id: 'REQ-106',
      title: 'Engineering Core Cloud Build Cluster Licenses',
      description: 'Annual enterprise multi-node CI/CD compute runner subscription.',
      type: 'PURCHASE',
      requesterId: 'user-dept-head',
      requesterName: 'Victoria Chase',
      requesterEmail: 'head.eng@flowforge.internal',
      requesterRole: 'DEPARTMENT_HEAD',
      departmentName: 'Engineering',
      workflowId: wfPurchaseId,
      workflowName: 'Capital & Equipment Purchase',
      currentStepId: 'step-purch-1',
      currentStepName: 'Direct Manager Endorsement',
      currentStepOrder: 1,
      currentStepRole: 'MANAGER',
      totalSteps: 3,
      status: 'PENDING_APPROVAL',
      data: {
        item: 'Enterprise CI/CD Cloud Runner Cluster',
        amount: 4500,
        currency: 'USD',
        vendor: 'CloudScale Infrastructure Inc',
        requiredDate: '2026-11-01',
      },
      documents: [],
      approvals: [],
      createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    };

    // Request 7: HR Leave (Jessica Pearson)
    const req7: RequestItem = {
      id: 'REQ-107',
      title: 'HR Compliance Conference Leave (2 Days)',
      description: 'Attending annual National HR Employment Law convention.',
      type: 'LEAVE',
      requesterId: 'user-hr',
      requesterName: 'Jessica Pearson',
      requesterEmail: 'hr@flowforge.internal',
      requesterRole: 'HR',
      departmentName: 'Human Resources',
      workflowId: wfLeaveId,
      workflowName: 'Employee Leave Request',
      currentStepId: 'step-leave-1',
      currentStepName: 'Direct Manager Approval',
      currentStepOrder: 1,
      currentStepRole: 'MANAGER',
      totalSteps: 2,
      status: 'PENDING_APPROVAL',
      data: {
        leaveType: 'Training',
        startDate: '2026-11-18',
        endDate: '2026-11-19',
        daysCount: 2,
      },
      documents: [],
      approvals: [],
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    };

    // Request 8: Finance Expense (Michael Scott)
    const req8: RequestItem = {
      id: 'REQ-108',
      title: 'Quarterly Corporate Tax Advisory Retainer Expense',
      description: 'CPA corporate filing audit fee and tax consultation reimbursement.',
      type: 'EXPENSE',
      requesterId: 'user-finance',
      requesterName: 'Michael Scott',
      requesterEmail: 'finance@flowforge.internal',
      requesterRole: 'FINANCE',
      departmentName: 'Finance & Accounts',
      workflowId: wfExpenseId,
      workflowName: 'Travel & Expense Reimbursement',
      currentStepId: 'step-exp-1',
      currentStepName: 'Manager Review & Evidence Audit',
      currentStepOrder: 1,
      currentStepRole: 'MANAGER',
      totalSteps: 2,
      status: 'PENDING_APPROVAL',
      data: {
        category: 'Professional Services',
        amount: 850,
        currency: 'USD',
        date: '2026-10-15',
      },
      documents: [],
      approvals: [],
      createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    };

    // Request 9: Admin Leave (Rachel Zane)
    const req9: RequestItem = {
      id: 'REQ-109',
      title: 'Operations System Governance Audit Leave (4 Days)',
      description: 'Operations policy revision and personal leave.',
      type: 'LEAVE',
      requesterId: 'user-admin',
      requesterName: 'Rachel Zane',
      requesterEmail: 'admin@flowforge.internal',
      requesterRole: 'ADMIN',
      departmentName: 'Operations',
      workflowId: wfLeaveId,
      workflowName: 'Employee Leave Request',
      currentStepId: 'step-leave-1',
      currentStepName: 'Direct Manager Approval',
      currentStepOrder: 1,
      currentStepRole: 'MANAGER',
      totalSteps: 2,
      status: 'PENDING_APPROVAL',
      data: {
        leaveType: 'Annual',
        startDate: '2026-11-25',
        endDate: '2026-11-28',
        daysCount: 4,
      },
      documents: [],
      approvals: [],
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    };

    this.requests = [req1, req2, req3, req4, req5, req6, req7, req8, req9];
    this.approvals = [app2_1, app3_1, app3_2, app4_1];

    // 6. Notifications
    this.notifications = [
      {
        id: 'notif-1',
        userId: 'user-manager',
        title: 'New Leave Request Submitted',
        message: 'Alex Rivera submitted Leave Request #REQ-101 for your review.',
        type: 'APPROVAL_REQUIRED',
        link: '/approvals',
        isRead: false,
        createdAt: req1.createdAt,
      },
      {
        id: 'notif-2',
        userId: 'user-dept-head',
        title: 'Department Head Approval Required',
        message: 'Purchase request #REQ-102 ($2,850.00) exceeds threshold and is awaiting your sign-off.',
        type: 'APPROVAL_REQUIRED',
        link: '/approvals',
        isRead: false,
        createdAt: app2_1.createdAt,
      },
      {
        id: 'notif-3',
        userId: 'user-employee',
        title: 'Request Returned for Correction',
        message: 'Sarah Connor returned your expense claim #REQ-104 with comments.',
        type: 'RETURNED_FOR_CORRECTION',
        link: '/requests',
        isRead: false,
        createdAt: app4_1.createdAt,
      },
    ];

    // 7. Audit Logs
    this.auditLogs = [
      {
        id: 'audit-1',
        userId: 'user-employee',
        userName: 'Alex Rivera',
        userRole: 'EMPLOYEE',
        action: 'REQUEST_SUBMITTED',
        entity: 'Request',
        entityId: 'REQ-101',
        details: { type: 'LEAVE', title: req1.title, initialStep: 'step-leave-1' },
        createdAt: req1.createdAt,
      },
      {
        id: 'audit-2',
        userId: 'user-employee',
        userName: 'Alex Rivera',
        userRole: 'EMPLOYEE',
        action: 'REQUEST_SUBMITTED',
        entity: 'Request',
        entityId: 'REQ-102',
        details: { type: 'PURCHASE', amount: 2850 },
        createdAt: req2.createdAt,
      },
      {
        id: 'audit-3',
        userId: 'user-employee',
        userName: 'Alex Rivera',
        userRole: 'EMPLOYEE',
        action: 'DOCUMENT_UPLOADED',
        entity: 'Document',
        entityId: 'doc-001',
        details: { fileName: 'NVIDIA_RTX5090_Invoice_Quote.pdf', status: 'VERIFIED', confidence: 0.97 },
        createdAt: doc1.createdAt,
      },
      {
        id: 'audit-4',
        userId: 'user-manager',
        userName: 'Sarah Connor',
        userRole: 'MANAGER',
        action: 'REQUEST_APPROVED',
        entity: 'Request',
        entityId: 'REQ-102',
        details: { step: 'Direct Manager Endorsement', nextStep: 'Department Head Authorization' },
        createdAt: app2_1.createdAt,
      },
      {
        id: 'audit-5',
        userId: 'user-manager',
        userName: 'Sarah Connor',
        userRole: 'MANAGER',
        action: 'REQUEST_RETURNED_FOR_CORRECTION',
        entity: 'Request',
        entityId: 'REQ-104',
        details: { reason: 'Receipt scan is low-resolution and tax subtotal does not balance' },
        createdAt: app4_1.createdAt,
      },
    ];
  }
}

export const db = new DataStore();

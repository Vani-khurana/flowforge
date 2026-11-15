export type Role = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | 'HR' | 'FINANCE' | 'DEPARTMENT_HEAD';

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED_FOR_CORRECTION'
  | 'AWAITING_APPROVER_ASSIGNMENT';

export type WorkflowStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';

export type ApprovalAction = 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_CORRECTION';

export type DocumentStatus =
  | 'PROCESSING'
  | 'VERIFIED'
  | 'REVIEW_REQUIRED'
  | 'VERIFICATION_FAILED'
  | 'REJECTED';

export interface Department {
  id: string;
  name: string;
  code: string;
  managerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: Role;
  status?: 'ACTIVE' | 'SUSPENDED';
  departmentId: string | null;
  departmentName?: string;
  managerId?: string | null;
  managerName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  workflowId: string;
  name: string;
  order: number;
  approverRole: Role;
  approverId: string | null;
  useDirectManager?: boolean;
  requiresVerificationPassed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  type: string; // 'LEAVE' | 'PURCHASE' | 'EXPENSE'
  status: WorkflowStatus;
  departmentId?: string | null;
  requiresDocuments?: boolean;
  requiredDocumentTypes?: string[];
  amountThreshold?: number | null;
  createdById: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestDocument {
  id: string;
  requestId: string;
  uploaderId: string;
  uploaderName?: string;
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  fileHash: string; // SHA-256
  documentType: string; // e.g. "RECEIPT", "INVOICE", "MEDICAL_CERTIFICATE"
  status: DocumentStatus;
  ocrExtracted?: Record<string, any> | null;
  ocrConfidence?: number | null;
  verificationChecks?: Record<string, any> | null;
  warnings?: string[] | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewerNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  requestId: string;
  stepId: string;
  stepName?: string;
  approverId: string;
  approverName?: string;
  approverRole?: Role;
  action: ApprovalAction;
  comment: string | null;
  createdAt: string;
}

export interface RequestItem {
  id: string;
  title: string;
  description: string | null;
  type: string; // 'LEAVE' | 'PURCHASE' | 'EXPENSE'
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterRole?: Role;
  departmentName?: string;
  workflowId: string;
  workflowName?: string;
  currentStepId: string | null;
  currentStepName?: string;
  currentStepOrder?: number;
  currentStepRole?: Role;
  totalSteps?: number;
  status: RequestStatus;
  assignedApproverId?: string | null;
  assignedApproverName?: string | null;
  version?: number;
  data: Record<string, any>;
  documents?: RequestDocument[];
  approvals: Approval[];
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  userName?: string;
  userRole?: Role;
  action: string;
  entity: string;
  entityId: string;
  details: Record<string, any> | null;
  createdAt: string;
}

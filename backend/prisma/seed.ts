import { PrismaClient, Role, RequestStatus, DocumentStatus, WorkflowStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FlowForge Enterprise Database...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.auditLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.requestDocument.deleteMany();
  await prisma.request.deleteMany();
  await prisma.workflowStep.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const defaultPassword = await bcrypt.hash('Password123!', 10);
  const now = new Date();

  // 2. Seed Departments
  const deptEng = await prisma.department.create({
    data: { id: 'dept-1', name: 'Engineering', code: 'ENG' },
  });
  const deptHr = await prisma.department.create({
    data: { id: 'dept-2', name: 'Human Resources', code: 'HR' },
  });
  const deptFin = await prisma.department.create({
    data: { id: 'dept-3', name: 'Finance & Accounts', code: 'FIN' },
  });
  const deptOps = await prisma.department.create({
    data: { id: 'dept-4', name: 'Operations', code: 'OPS' },
  });
  const deptMkt = await prisma.department.create({
    data: { id: 'dept-5', name: 'Product Marketing', code: 'MKT' },
  });
  const deptExec = await prisma.department.create({
    data: { id: 'dept-exec', name: 'Executive Leadership', code: 'EXEC' },
  });

  // 3. Seed Users with Strict Organizational Hierarchy
  // Hierarchy:
  // Senior Approver / Executive: Dr. Arthur Bell (Executive Leadership)
  // Admin: Rachel Zane (Operations) -> reports to Dr. Arthur Bell
  // Department Head: Victoria Chase (Engineering Head) -> reports to Dr. Arthur Bell
  // Manager: Sarah Connor (Engineering Manager) -> reports to Victoria Chase
  // Employee: Alex Rivera (Software Engineer) -> reports to Sarah Connor
  // HR: Jessica Pearson (HR Specialist) -> reports to Dr. Arthur Bell
  // Finance: Michael Scott (Finance Lead) -> reports to Dr. Arthur Bell

  const seniorUser = await prisma.user.create({
    data: {
      id: 'user-senior',
      name: 'Dr. Arthur Bell',
      email: 'senior.approver@flowforge.internal',
      passwordHash: defaultPassword,
      role: Role.DEPARTMENT_HEAD,
      departmentId: deptExec.id,
      status: 'ACTIVE',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      id: 'user-admin',
      name: 'Rachel Zane',
      email: 'admin@flowforge.internal',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      departmentId: deptOps.id,
      managerId: seniorUser.id,
      status: 'ACTIVE',
    },
  });

  const deptHeadUser = await prisma.user.create({
    data: {
      id: 'user-dept-head',
      name: 'Victoria Chase',
      email: 'head.eng@flowforge.internal',
      passwordHash: defaultPassword,
      role: Role.DEPARTMENT_HEAD,
      departmentId: deptEng.id,
      managerId: seniorUser.id,
      status: 'ACTIVE',
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      id: 'user-manager',
      name: 'Sarah Connor',
      email: 'manager@flowforge.internal',
      passwordHash: defaultPassword,
      role: Role.MANAGER,
      departmentId: deptEng.id,
      managerId: deptHeadUser.id,
      status: 'ACTIVE',
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      id: 'user-employee',
      name: 'Alex Rivera',
      email: 'employee@flowforge.internal',
      passwordHash: defaultPassword,
      role: Role.EMPLOYEE,
      departmentId: deptEng.id,
      managerId: managerUser.id,
      status: 'ACTIVE',
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      id: 'user-hr',
      name: 'Jessica Pearson',
      email: 'hr@flowforge.internal',
      passwordHash: defaultPassword,
      role: Role.HR,
      departmentId: deptHr.id,
      managerId: seniorUser.id,
      status: 'ACTIVE',
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      id: 'user-finance',
      name: 'Michael Scott',
      email: 'finance@flowforge.internal',
      passwordHash: defaultPassword,
      role: Role.FINANCE,
      departmentId: deptFin.id,
      managerId: seniorUser.id,
      status: 'ACTIVE',
    },
  });

  // Assign department managers
  await prisma.department.update({
    where: { id: deptEng.id },
    data: { managerId: deptHeadUser.id },
  });
  await prisma.department.update({
    where: { id: deptHr.id },
    data: { managerId: hrUser.id },
  });
  await prisma.department.update({
    where: { id: deptFin.id },
    data: { managerId: financeUser.id },
  });
  await prisma.department.update({
    where: { id: deptExec.id },
    data: { managerId: seniorUser.id },
  });

  // 4. Seed Workflows & Multi-stage Steps
  // Workflow 1: Leave Request (2 steps: Direct Manager -> HR)
  const wfLeave = await prisma.workflow.create({
    data: {
      id: 'wf-leave',
      name: 'Employee Leave Request',
      description: 'Standard vacation, medical, and personal leave approval process',
      type: 'LEAVE',
      status: WorkflowStatus.ACTIVE,
      createdById: adminUser.id,
      requiresDocuments: false,
      steps: {
        create: [
          {
            id: 'step-leave-1',
            name: 'Direct Manager Approval',
            order: 1,
            approverRole: Role.MANAGER,
            useDirectManager: true,
          },
          {
            id: 'step-leave-2',
            name: 'HR Verification & Approval',
            order: 2,
            approverRole: Role.HR,
            approverId: hrUser.id,
            useDirectManager: false,
          },
        ],
      },
    },
  });

  // Workflow 2: Equipment & Software Purchase (3 steps: Manager -> Dept Head -> Finance)
  // Amount threshold routing: > $1000 requires Dept Head
  const wfPurchase = await prisma.workflow.create({
    data: {
      id: 'wf-purchase',
      name: 'Capital & Equipment Purchase',
      description: 'Hardware, software licenses, and capital expenditures above threshold',
      type: 'PURCHASE',
      status: WorkflowStatus.ACTIVE,
      createdById: adminUser.id,
      requiresDocuments: true,
      requiredDocumentTypes: ['INVOICE', 'QUOTE'],
      amountThreshold: 1000,
      steps: {
        create: [
          {
            id: 'step-purchase-1',
            name: 'Direct Manager Endorsement',
            order: 1,
            approverRole: Role.MANAGER,
            useDirectManager: true,
            requiresVerificationPassed: true,
          },
          {
            id: 'step-purchase-2',
            name: 'Department Head Authorization',
            order: 2,
            approverRole: Role.DEPARTMENT_HEAD,
            approverId: deptHeadUser.id,
            useDirectManager: false,
          },
          {
            id: 'step-purchase-3',
            name: 'Finance Disbursement Review',
            order: 3,
            approverRole: Role.FINANCE,
            approverId: financeUser.id,
            useDirectManager: false,
          },
        ],
      },
    },
  });

  // Workflow 3: Travel & Meal Expense Reimbursement (2 steps: Manager -> Finance)
  const wfExpense = await prisma.workflow.create({
    data: {
      id: 'wf-expense',
      name: 'Travel & Expense Reimbursement',
      description: 'Business travel, meals, and incidental operational expense claims',
      type: 'EXPENSE',
      status: WorkflowStatus.ACTIVE,
      createdById: adminUser.id,
      requiresDocuments: true,
      requiredDocumentTypes: ['RECEIPT'],
      steps: {
        create: [
          {
            id: 'step-expense-1',
            name: 'Manager Review & Evidence Audit',
            order: 1,
            approverRole: Role.MANAGER,
            useDirectManager: true,
            requiresVerificationPassed: true,
          },
          {
            id: 'step-expense-2',
            name: 'Finance Audit & Payment',
            order: 2,
            approverRole: Role.FINANCE,
            approverId: financeUser.id,
            useDirectManager: false,
          },
        ],
      },
    },
  });

  // 5. Seed Sample Requests with Real Evidence Documents
  const req1 = await prisma.request.create({
    data: {
      id: 'req-001',
      title: 'Annual Paid Time Off — 5 Days',
      description: 'Family vacation travel scheduled across end of month.',
      type: 'LEAVE',
      requesterId: employeeUser.id,
      workflowId: wfLeave.id,
      currentStepId: 'step-leave-1',
      status: RequestStatus.PENDING_APPROVAL,
      data: {
        leaveType: 'Annual Leave',
        startDate: '2026-11-01',
        endDate: '2026-11-05',
        daysCount: 5,
        emergencyContact: '+1-555-0192',
      },
    },
  });

  const req2 = await prisma.request.create({
    data: {
      id: 'req-002',
      title: 'Dev Team MacBook Pro M3 Max Upgrade',
      description: 'High-performance engineering workstations for localized LLM compiling and mobile builds.',
      type: 'PURCHASE',
      requesterId: employeeUser.id,
      workflowId: wfPurchase.id,
      currentStepId: 'step-purchase-1',
      status: RequestStatus.PENDING_APPROVAL,
      data: {
        item: 'MacBook Pro 16" M3 Max 64GB',
        vendor: 'Apple Business Direct',
        amount: 3499.0,
        currency: 'USD',
        justification: 'Current development hardware paging on LLM fine-tuning runs.',
      },
    },
  });

  // Seed Evidence Document for Request 2
  await prisma.requestDocument.create({
    data: {
      id: 'doc-001',
      requestId: req2.id,
      uploaderId: employeeUser.id,
      fileName: 'Apple_Quote_INV99281.pdf',
      storagePath: 'uploads/Apple_Quote_INV99281.pdf',
      fileSize: 148200,
      mimeType: 'application/pdf',
      fileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      documentType: 'QUOTE',
      status: DocumentStatus.VERIFIED,
      ocrConfidence: 0.96,
      ocrExtracted: {
        vendor: 'Apple Business Direct',
        amount: 3499.0,
        currency: 'USD',
        date: '2026-10-15',
        taxId: 'US-942404110',
      },
      verificationChecks: {
        mimeTypeMatch: true,
        hashUnique: true,
        amountMatch: true,
        vendorMatch: true,
        metadataClean: true,
      },
      warnings: [],
      reviewerId: financeUser.id,
      reviewerNotes: 'Official Apple enterprise quote verified against corporate master discount program.',
      reviewedAt: now,
    },
  });

  // Request 3: Expense Reimbursement with Review Required Flag
  const req3 = await prisma.request.create({
    data: {
      id: 'req-003',
      title: 'Q3 AWS Cloud Architecture Summit Travel Reimbursement',
      description: 'Flight tickets and accommodation for attending cloud engineering summit.',
      type: 'EXPENSE',
      requesterId: employeeUser.id,
      workflowId: wfExpense.id,
      currentStepId: 'step-expense-1',
      status: RequestStatus.PENDING_APPROVAL,
      data: {
        category: 'Travel & Lodging',
        amount: 840.5,
        currency: 'USD',
        conference: 'AWS Summit Chicago',
      },
    },
  });

  await prisma.requestDocument.create({
    data: {
      id: 'doc-002',
      requestId: req3.id,
      uploaderId: employeeUser.id,
      fileName: 'Hotel_Receipt_Clarion.png',
      storagePath: 'uploads/Hotel_Receipt_Clarion.png',
      fileSize: 452100,
      mimeType: 'image/png',
      fileHash: 'c4f2e34589fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899',
      documentType: 'RECEIPT',
      status: DocumentStatus.REVIEW_REQUIRED,
      ocrConfidence: 0.78,
      ocrExtracted: {
        vendor: 'Clarion Suites Downtown',
        amount: 840.5,
        currency: 'USD',
        date: '2026-09-28',
      },
      verificationChecks: {
        mimeTypeMatch: true,
        hashUnique: true,
        amountMatch: true,
        vendorMatch: true,
        metadataClean: false,
      },
      warnings: [
        'Document image has low resolution in footer section',
        'Human reviewer confirmation recommended for tax line calculation',
      ],
    },
  });

  // Seed Notifications
  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      title: 'New Leave Request Submitted',
      message: 'Alex Rivera submitted Leave Request #req-001 for your approval.',
      type: 'APPROVAL_REQUIRED',
      link: '/approvals',
    },
  });

  await prisma.notification.create({
    data: {
      userId: managerUser.id,
      title: 'Equipment Purchase Requiring Evidence Review',
      message: 'Purchase request #req-002 submitted with verified quote attached.',
      type: 'APPROVAL_REQUIRED',
      link: '/approvals',
    },
  });

  // Seed Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: employeeUser.id,
      requestId: req1.id,
      action: 'REQUEST_SUBMITTED',
      entity: 'REQUEST',
      entityId: req1.id,
      details: { title: req1.title, type: req1.type },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: employeeUser.id,
      requestId: req2.id,
      action: 'DOCUMENT_UPLOADED',
      entity: 'DOCUMENT',
      entityId: 'doc-001',
      details: { fileName: 'Apple_Quote_INV99281.pdf', status: 'VERIFIED' },
    },
  });

  console.log('Seed completed successfully!');
  process.exit(0);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

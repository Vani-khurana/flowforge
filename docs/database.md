# FlowForge Database Design (Phase 1)

## Database Engine
- **PostgreSQL 16** via **Prisma ORM**.

## Entities
- **User**: Authentication, role, department association.
- **Department**: Organizational business units (Engineering, HR, Finance, etc.).
- **Workflow**: Definition templates for business processes (Leave, Purchase, Expense).
- **WorkflowStep**: Ordered approval stages linked to approver roles or specific users.
- **Request**: Business process submissions with status machine and dynamic data payload.
- **Approval**: Record of every decision (APPROVED/REJECTED) with mandatory reject comments.
- **AuditLog**: Immutable trace of all security and workflow events.

## Extensibility (Phase 2)
The schema is designed to directly support future entities (`WorkflowVersion`, `Comment`, `Attachment`, `Notification`, `KnowledgeDocument`) without breaking changes.

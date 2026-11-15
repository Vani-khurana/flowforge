# FlowForge Workflow Lifecycle

```text
[Employee creates request] 
            │
            ▼
       (SUBMITTED)
            │  Workflow Engine assigns Step 1 approver
            ▼
   (PENDING_APPROVAL)
      │            │
      │ Approver   │ Approver
      │ rejects    │ approves
      ▼            ▼
 (REJECTED)    [Is there a next step?]
 [Terminal]     ├── YES ──► Advance currentStepId ──► (PENDING_APPROVAL)
                └── NO  ──► Status set to (COMPLETED) / (APPROVED)
```

## Atomic Guarantees
All state transitions execute in an isolated database transaction:
1. Validate approver authority for current step.
2. Insert `Approval` record with timestamp and comment.
3. Advance `Request.currentStepId` and update status.
4. Record immutable `AuditLog` entry.
If any step fails, the transaction rolls back cleanly.

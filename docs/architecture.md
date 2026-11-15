# FlowForge Architecture (Phase 1)

## Overview
FlowForge is an enterprise workflow automation and approval platform.
Phase 1 implements 50% of the platform: Core Workflow Foundation.
Phase 2 will integrate AI/LLM assistants, RAG, WebSockets, dynamic forms, notifications, and advanced reporting.

## Architectural Layers
1. **Frontend**: Single Page Application built with React, Vite, TypeScript, Tailwind CSS, TanStack Query, and React Hook Form.
2. **API Layer**: Express.js REST API with Helmet security, CORS policy, rate limiting, and structured JSON responses.
3. **Controller Layer**: HTTP request/response handling, parameter parsing, and delegating to services.
4. **Service Layer**: Business logic, workflow state transitions, approval validation, transaction orchestration, and audit logging.
5. **Data Access Layer**: Prisma ORM with PostgreSQL, enforcing referential integrity and type safety.
6. **Future-Proofing Extension Points**:
   - `Request.data` JSON payload for dynamic custom fields without schema changes.
   - Decoupled `AuditService` and `ApprovalService` allowing Phase 2 AI and Notification event hooks.

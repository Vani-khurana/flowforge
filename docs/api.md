# FlowForge API Specification

All endpoints follow standard REST conventions with unified JSON envelopes:
- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "success": false, "message": "Error description", "errors": [ ... ] }`

Authentication: All protected endpoints require standard HTTP header:
`Authorization: Bearer <access_token>`
*(Note: Passing tokens via URL query parameter is prohibited for security).*

---

## 1. Authentication Routes (`/api/auth`)
- `POST /api/auth/register`: Public registration (assigns `EMPLOYEE` role only).
- `POST /api/auth/login`: Mandatory email and bcrypt password verification. Returns JWT access token, refresh token, and user profile. Generic 401 on bad credentials.
- `POST /api/auth/refresh`: Issues a refreshed access token using valid refresh token.
- `POST /api/auth/logout`: Revokes active user session.
- `GET /api/auth/me`: Returns profile of the authenticated user.
- `POST /api/auth/switch-role`: Dev/Demo environment only (`ENABLE_DEMO_ROLE_SWITCH=true`). Returns 403 Forbidden in production.

---

## 2. Request Management Routes (`/api/requests`)
- `GET /api/requests`: Lists user requests with filtering (`type`, `status`, `search`) and pagination (`page`, `limit`).
- `POST /api/requests`: Submits a new workflow request (Leave, Purchase, Expense). Dynamically routes to initial approver.
- `GET /api/requests/:id`: Fetches complete request details including steps, history, and attached document metadata.
- `POST /api/requests/:id/resubmit`: Resubmits a request previously returned for correction.

---

## 3. Approvals Routes (`/api/approvals`)
- `GET /api/approvals/pending`: Returns pending approval requests for current authenticated user based on role, department, and reporting hierarchy.
- `POST /api/approvals/:id/action`: Submits an approval decision (`APPROVED`, `REJECTED`, or `RETURNED_FOR_CORRECTION`). Mandatory comments required for rejections and returns.

---

## 4. Document Verification Routes (`/api/documents`)
- `POST /api/documents/upload`: Multipart upload with magic byte validation, cryptographic SHA-256 duplicate detection, OCR parsing (`pdf-parse` / `tesseract.js`), and request consistency check.
- `POST /api/documents/pre-screen`: Real-time pre-submission verification advisory for employees before submitting requests.
- `GET /api/documents/:id/download`: Authenticated document retrieval. Returns file binary stream.
- `GET /api/documents/review-queue`: Lists documents requiring human review or flagged for inspection.
- `POST /api/documents/:id/review`: Human compliance officer adjudication (`status`: `VERIFIED` or `REJECTED`) with mandatory justification.

---

## 5. System, Organization & Metrics
- `GET /api/dashboard/stats`: Returns role-scoped dashboard metrics, pending counts, and approval ratios.
- `GET /api/dashboard/metrics`: Comprehensive metrics and activity trends.
- `GET /api/users`: User management & hierarchy lookup.
- `GET /api/departments`: Department directory.
- `GET /api/workflows`: Workflow template definitions and step routing.
- `GET /api/notifications`: Retrieves user notifications.
- `PATCH /api/notifications/:id/read`: Marks notification as read.
- `PATCH /api/notifications/mark-all-read`: Marks all unread notifications as read.
- `GET /api/audit`: Immutable audit trail for compliance.
- `GET /api/health`: Health status and database/datastore connectivity check.

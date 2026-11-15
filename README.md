# FlowForge — Enterprise Workflow Automation & Proof Verification Platform

> **FlowForge** is an enterprise-grade multi-stage workflow automation, approval, and AI-assisted proof verification platform built with React, Node.js, TypeScript, Express, and Prisma ORM.

---

## 🌟 Key Capabilities & Enterprise Architecture

### 1. Production Authentication & Session Lifecycle
- **Bcrypt Password Security**: Passwords hashed with 10 salt rounds.
- **JWT Access & Refresh Token Rotation**: Ephemeral access tokens paired with cryptographic session tokens tracked in `Session` table.
- **Strict Account Gating**: Suspended account enforcement and removal of default-user fallbacks.

### 2. Strict Organizational Hierarchy
- **Reporting Hierarchy Chains**: Users report to designated managers via `managerId`, with cyclic graph detection to prevent infinite loops.
- **Department Head Authorization**: Escalation paths for organizational heads.
- **ADMIN ≠ APPROVER Rule**: System administrators cannot approve business requests unless explicitly designated as the step approver.
- **No Self-Approval**: Strict corporate governance rule preventing employees from endorsing their own submissions.

### 3. Configurable Multi-Stage Workflow Engine
- **Multi-Stage Sequential Pipelines**: Configurable step ordering across manager, department head, HR, and finance stakeholders.
- **Dynamic Manager Routing**: `useDirectManager` dynamically maps approvals to the requester's direct manager.
- **Amount Threshold Branching**: Requests above thresholds (e.g. $1,000) automatically route to executive authorizers.
- **State Machine Actions**:
  - `APPROVED`: Advances pipeline stage or marks request `COMPLETED`.
  - `REJECTED`: Terminates workflow with mandatory reason.
  - `RETURNED_FOR_CORRECTION`: Sends request back to employee for revision with required feedback notes.
  - `RESUBMITTED`: Allows employee to revise information and return request to active approval sequence.

### 4. AI-Assisted Evidence & Proof Verification
- **Secure File Intake**: Validates file types and inspects file header magic bytes (`%PDF`, PNG, JPEG, WebP) to prevent MIME spoofing.
- **Cryptographic Duplicate Detection**: Computes SHA-256 hashes of attached files to catch re-used receipts and duplicate expense claims across different requests.
- **OCR Structured Extraction**: Parses and extracts vendor, nominal amount, currency, invoice date, and line items.
- **Request Consistency Cross-Check**: Checks extracted data against requested amounts, flagging mismatches > 5%.
- **Forensic Heuristics**: Analyzes resolution DPI and metadata anomalies.
- **Honest Verification States**: `PROCESSING`, `VERIFIED`, `REVIEW_REQUIRED`, `VERIFICATION_FAILED`, `REJECTED`.
- **Compliance Reviewer Interface**: Dedicated human review queue (`/documents/review`) allowing authorized compliance officers to review and override flagged proof with mandatory audit trails.
- **Verification Gating**: Approvals can be configured (`requiresVerificationPassed: true`) to lock stage advancement until all attached evidence is verified.

### 5. Persistent In-App Notifications & Audit Trail
- Real-time in-app notification bell with unread counters and navigation shortcuts.
- Event triggers for submissions, stage advances, returns, approvals, rejections, and evidence flags.
- Immutable, append-only audit trail capturing user identities, timestamps, and structured metadata.

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 / Vite / TypeScript
- **Routing**: React Router 6
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS with enterprise glassmorphism tokens
- **Icons**: Lucide React
- **HTTP Client**: Axios with JWT Bearer interceptor

### Backend
- **Runtime**: Node.js v20+ / TypeScript
- **Server Framework**: Express.js
- **ORM & Database**: Prisma ORM with PostgreSQL (or resilient DataStore)
- **File Processing**: Multer memory storage + SHA-256 cryptographic hashing
- **Security**: JWT, bcrypt, Helmet, CORS, express-rate-limit
- **Testing**: Vitest test runner

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20+ or v24 LTS
- **npm**: v10+

### 2. Running Backend
```bash
cd backend
npm install
npm test            # Run 20 automated unit & integration tests
npm run build       # Verify TypeScript compilation
npm run dev         # Starts backend dev server on http://localhost:5000
```

### 3. Running Frontend
```bash
cd frontend
npm install
npm run build       # Verify Vite bundle compilation
npm run dev         # Starts Vite dev server on http://localhost:5173
```

---

## 👥 Seed Accounts & Demo Personas

| Role | Name | Email | Default Password | Department | Reporting Manager |
|---|---|---|---|---|---|
| **EMPLOYEE** | Alex Rivera | `employee@flowforge.internal` | `Password123!` | Engineering | Sarah Connor (Manager) |
| **MANAGER** | Sarah Connor | `manager@flowforge.internal` | `Password123!` | Engineering | Victoria Chase (Dept Head) |
| **DEPARTMENT_HEAD** | Victoria Chase | `head.eng@flowforge.internal` | `Password123!` | Engineering | Executive |
| **HR** | Jessica Pearson | `hr@flowforge.internal` | `Password123!` | Human Resources | Executive |
| **FINANCE** | Michael Scott | `finance@flowforge.internal` | `Password123!` | Finance & Accounts | Executive |
| **ADMIN** | Rachel Zane | `admin@flowforge.internal` | `Password123!` | Operations | Executive |

---

## 🧪 Automated Test Suite

FlowForge includes comprehensive unit and integration tests under `backend/src/__tests__/`:
```bash
cd backend
npm test
```

### Test Coverage (20 / 20 Passing Tests):
1. **`auth.test.ts` (5 tests)**: Bcrypt password comparison, 401 rejection on wrong credentials, user registration with hashed storage, JWT token refresh and session rotation, session revocation on logout.
2. **`hierarchy.test.ts` (7 tests)**: Direct manager resolution, cyclic hierarchy loop prevention, self-approval prohibition, ADMIN ≠ APPROVER rule, direct manager step routing, unrelated manager rejection, verification gating enforcement.
3. **`workflow.test.ts` (4 tests)**: Multi-stage pipeline advancement, final step completion, return for correction lifecycle with employee resubmission, rejection with mandatory comment.
4. **`documentVerification.test.ts` (4 tests)**: Authentic PDF magic bytes validation (`%PDF`), SHA-256 duplicate detection across different requests, compliance reviewer adjudication, mandatory audit notes verification.

---

## 📁 Repository Structure

```
FlowForge/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Enterprise Prisma PostgreSQL schema
│   │   └── seed.ts             # Database seed script with hashed passwords
│   ├── src/
│   │   ├── controllers/        # Request, Approval, Document, Notification, Auth controllers
│   │   ├── services/           # Hierarchy, Verification, Approval, Request, Notification services
│   │   ├── middleware/         # JWT Authenticate, requireRole, errorHandler
│   │   ├── db/                 # Prisma singleton & DataStore
│   │   ├── routes/             # REST API routers
│   │   ├── __tests__/          # Vitest automated test suites
│   │   └── app.ts              # Express application setup
├── frontend/
│   ├── src/
│   │   ├── pages/              # Login, DocumentReview, Dashboard, Requests, Approvals, Workflows...
│   │   ├── components/         # Modals, Navbar, Sidebar, Badges
│   │   ├── context/            # AuthContext, ToastContext
│   │   └── services/           # Axios API client
├── docs/
│   ├── IMPLEMENTATION_AUDIT.md            # Comprehensive architecture & security audit
│   ├── SECURITY_AND_AI_LIMITATIONS.md     # AI boundaries & fraud prevention policy
│   └── IMPLEMENTATION_STATUS.md           # Milestone & progress tracker
└── README.md
```

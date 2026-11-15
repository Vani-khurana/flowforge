# FlowForge — Security Architecture & AI Verification Limitations

## 1. Core Principle: Evidence Verification, Not Employee Judgment

FlowForge's AI-assisted document verification module evaluates uploaded documentary evidence (receipts, medical certificates, tax invoices, purchase quotations). It is designed as an **evidence-verification assistant**, not an automated judge of employee honesty.

### Key Operational Rules:
1. **No Automatic Fraud Accusations**: A low confidence score or mismatched optical character recognition (OCR) result indicates that the document requires scrutiny or re-upload, never that the user committed fraud. Documents are never declared fraudulent based on filenames, keywords, or heuristic risk scores.
2. **AI Cannot Independently Reject Business Requests**: A negative verification finding routes the file to an authorized human reviewer (`NEEDS_REVIEW` or `REVIEW_REQUIRED`) or flags technical incompatibility (`FAILED_CHECKS`). It never automatically terminates or rejects the employee's business request. Final decisions remain with human managers, compliance officers, and department heads.
3. **No Automatic Approvals**: A clean verification check (`VERIFIED`) confirms only that the document satisfies technical and textual checks (valid file signature, non-duplicate SHA-256 hash, readable content, and consistent figures). The authorized manager and department head still evaluate business necessity and budget approval.

---

## 2. Evidence Verification Engine Architecture

FlowForge uses genuine, local optical character recognition and parsing pipelines:
- **PDF Documents**: Parsed using `pdf-parse` for text layer extraction and structure analysis.
- **Images (PNG, JPEG, WebP)**: Processed using `tesseract.js` OCR engine with English linguistic training.
- **Header Signature Verification**: File magic bytes are inspected to prevent MIME-type spoofing before invoking OCR or downstream analysis.
- **SHA-256 Cryptographic Hashing**: Every uploaded evidence file is cryptographically hashed to detect duplicate file submissions across requests instantly.

### Structured Field Extraction & Field Confidence
Extracted fields (Vendor, Amount, Currency, Invoice Number, Document Date, Tax ID) are scored with transparent field confidence levels:
- `HIGH`: Multiple matching patterns and consistent contextual labels.
- `MEDIUM`: Single match or partially ambiguous format.
- `LOW`: Low OCR character confidence or atypical structure.
- `NOT_FOUND`: Field was not detected in the document text. The system never fabricates or simulates missing data.

### Verification Outcome States
1. `VERIFIED`: Magic bytes valid, non-duplicate, legible text extracted, and claim amount matches document amount within 5% tolerance.
2. `NEEDS_REVIEW`: OCR text extracted but amount discrepancy detected, low text density, or potential non-document media detected (requires human reviewer inspection).
3. `FAILED_CHECKS`: Technical failure such as invalid file signature/mime mismatch, corrupt archive, or exact duplicate SHA-256 file already submitted.

---

## 3. Platform Security Architecture

### A. Authentication & Password Security
- **Mandatory Passwords**: All logins require email and password. Passwords are verified using `bcrypt.compare` against hashed credentials.
- **Generic Errors**: Failed authentication attempts return a generic `Invalid email or password` (HTTP 401) to prevent user enumeration.
- **Account Suspension Enforcement**: Suspended accounts are immediately blocked from authentication and API access.

### B. Role-Based Access Control & Privilege Escalation Prevention
- **Fixed Public Registration**: Public registration `/api/auth/register` strictly assigns the `EMPLOYEE` role. Client-supplied roles and manager IDs in public registration requests are discarded. Role assignments and reporting managers can only be configured by authorized Administrators.
- **Restricted Role Switching**: The demo role switcher endpoint `/api/auth/switch-role` is strictly locked to non-production environments with `ENABLE_DEMO_ROLE_SWITCH=true`. In production environments, this endpoint returns HTTP 403 Forbidden.

### C. Authentication Middleware & Token Handling
- **Strict Bearer Tokens**: All protected API endpoints require an `Authorization: Bearer <token>` header. Token extraction via URL query parameters (`?token=...`) is strictly forbidden to prevent credential leakage in browser history, server access logs, and referrer headers.
- **Secure File Delivery**: Frontend document previews fetch protected document blobs via authenticated Axios calls (`Authorization: Bearer`) and instantiate local `blob:` object URLs, avoiding query string token exposure.

### D. CORS & Origin Protection
- **Explicit Whitelist**: Cross-Origin Resource Sharing (CORS) enforces an explicit whitelist containing configured production domains (`CLIENT_URL`), local development URLs (`localhost:5173`, `127.0.0.1:5173`), and authorized cloud deployments (`.vercel.app`, `.onrender.com`). Unauthorized origins receive an HTTP 403 response.

---

## 4. Human Oversight & Appeal Protocol

1. **Reviewer Segregation of Duties**:
   - Reviewers inspect the original document preview, extracted fields side-by-side with claim fields, and specific risk flags.
   - Overrides require an explicit privilege, mandatory explanatory notes, and an immutable audit log entry.
2. **Privacy & Least Privilege**:
   - Sensitive medical certificates or identification proofs are restricted to authorized HR/Compliance roles and not accessible across general management.

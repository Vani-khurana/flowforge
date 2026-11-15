# FlowForge 100% Free Full-Stack Production Deployment Guide

A complete, foolproof, step-by-step guide to deploying **FlowForge** to the cloud using 100% free hosting tiers:

| Tier / Component | Cloud Provider | Free Tier Specification |
|---|---|---|
| **Cloud Database** | **[Neon](https://neon.tech)** | Serverless PostgreSQL (0.5 GB storage, autoscaling, SSL secured) |
| **Backend API** | **[Render](https://render.com)** | Free Web Service (Node.js runtime, automatic HTTPS, continuous Git deploy) |
| **Frontend UI** | **[Vercel](https://vercel.com)** | Free Hobby Tier (Fast global Edge CDN, automatic Vite SPA routing) |

---

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Client Tier (Browser)"]
        User["User Browser / Desktop & Mobile"]
    end

    subgraph VercelCDN ["Vercel Edge Platform"]
        VercelApp["Vite + React SPA<br/>https://flowforge.vercel.app<br/>(SPA Rewrites via vercel.json)"]
    end

    subgraph RenderPlatform ["Render Cloud Platform"]
        RenderAPI["Express + TypeScript REST API<br/>https://flowforge-api.onrender.com<br/>• JWT Authentication & Rate Limiting<br/>• AI Document Pre-Screening Engine<br/>• Workflow State Machine"]
    end

    subgraph DataStorage ["Persistence Layer"]
        NeonDB[("Neon Serverless PostgreSQL<br/>Users, Workflows, Requests, Approvals")]
        FallbackStore[("Local DataStore Fallback<br/>(store.json auto-sync)")]
    end

    User -->|"1. HTTPS Web Traffic"| VercelApp
    User -->|"2. Direct API Calls (Bearer JWT)"| RenderAPI
    RenderAPI -->|"Prisma ORM (SSL: require)"| NeonDB
    RenderAPI -.->|"Offline / Migration Fallback"| FallbackStore
```

---

## Pre-Flight Status (Already Verified)

Before starting, both halves of FlowForge have been verified and built:

- **Frontend Build**: Verified with Vite 5.4.21 & TypeScript (`npm run build` exits code 0).
- **Backend Build**: Verified with TypeScript (`npm run build` exits code 0).
- **Automated Test Suites**: All 31 backend integration tests passing (Auth, Hierarchy, Workflow Engine, Document AI Forensics).
- **SPA Routing**: `frontend/vercel.json` rewrite configuration is pre-configured.
- **CORS & Cross-Origin Asset Policy**: Helmet configured to permit cross-origin image/PDF document inspection from Vercel.

---

## Step 1: Push FlowForge to Your GitHub Repository

Both Render and Vercel deploy automatically from your GitHub repository.

### 1.1 Create a new repository on GitHub
1. Open [github.com/new](https://github.com/new).
2. Set **Repository name** to: `flowforge` (or any name you prefer).
3. Select **Public** or **Private** (both work with Render & Vercel free tiers).
4. Leave *"Initialize this repository with a README, .gitignore or license"* **unchecked** (we already have local files).
5. Click **Create repository**.

### 1.2 Initialize Git and Push Locally
Open your terminal (PowerShell or Bash) in `d:\Downloads\Flowforge-v\FlowForge` and run:

```bash
# 1. Initialize Git tracking
git init

# 2. Stage all project files (our .gitignore automatically excludes node_modules and sensitive temp files)
git add .

# 3. Create your initial commit
git commit -m "feat: complete FlowForge full-stack enterprise release"

# 4. Rename default branch to main
git branch -M main

# 5. Link your GitHub repository (replace <your-github-username> with your actual username)
git remote add origin https://github.com/<your-github-username>/flowforge.git

# 6. Push your code to GitHub
git push -u origin main
```

> [!TIP]
> If Git prompts you for authentication on Windows, log in via your browser or paste a GitHub Personal Access Token (PAT).

---

## Step 2: Set Up Free Cloud PostgreSQL Database (Neon)

FlowForge supports hosted PostgreSQL via Prisma ORM.

### 2.1 Create Free Neon Database
1. Go to **[neon.tech](https://neon.tech)** and click **Sign Up** (or log in with GitHub).
2. Click **Create Project**.
3. Enter Project Name: `flowforge-db`.
4. Leave Region at default (or choose whichever is closest to you).
5. Click **Create Project**.

### 2.2 Copy the Connection String
In the Neon Console Dashboard, locate the **Connection Details** box:
1. Make sure the toggle is set to **Prisma** or **Postgres**.
2. Copy the full connection string. It will look like this:
   ```text
   postgresql://flowforge_owner:npg_xY12AbCdEf@ep-silent-wave-123456.us-east-2.aws.neon.tech/flowforge-db?sslmode=require
   ```

### 2.3 Push Database Schema & Seed Initial Accounts
You can run the initial schema creation and data seeder directly from your local machine to populate the cloud database:

```bash
# Navigate to backend directory
cd backend

# Temporarily set your DATABASE_URL in PowerShell:
$env:DATABASE_URL="postgresql://flowforge_owner:npg_xY12AbCdEf@ep-silent-wave-123456.us-east-2.aws.neon.tech/flowforge-db?sslmode=require"

# (Or in Bash / macOS / Linux: export DATABASE_URL="postgresql://...")

# Push Prisma schema to your Neon cloud database:
npx prisma db push

# Seed the database with organizational hierarchy, departments, workflows, and demo accounts:
npm run seed
```

> [!NOTE]
> Even if you don't connect Neon immediately, FlowForge automatically falls back to its built-in disk DataStore (`backend/data/store.json`), meaning the system continues running seamlessly in all environments.

---

## Step 3: Deploy Backend on Render (100% Free)

Render hosts the Node.js / Express API with free automated SSL certificates.

### 3.1 Create Render Web Service
1. Go to **[render.com](https://render.com)** and sign in with GitHub.
2. Click the blue **New +** button in the top bar and select **Web Service**.
3. Select **Build and deploy from a Git repository** and click **Next**.
4. Find your `flowforge` repository in the list and click **Connect**.

### 3.2 Configure Service Settings
Fill in the deployment form with the exact settings below:

| Field | Value | Notes |
|---|---|---|
| **Name** | `flowforge-api` | Will produce `https://flowforge-api.onrender.com` |
| **Region** | *Closest to your users* | e.g. Frankfurt, Oregon, Singapore |
| **Branch** | `main` | Deploys on git push |
| **Root Directory** | `backend` | **CRITICAL**: Do not leave blank |
| **Runtime** | `Node` | Standard Node.js environment |
| **Build Command** | `npm install && npx prisma generate && npm run build` | Installs deps, builds Prisma client, compiles TS |
| **Start Command** | `npm start` | Runs `node dist/server.js` |
| **Instance Type** | `Free` | Free tier ($0.00 / month) |

### 3.3 Set Environment Variables
Scroll down to **Environment Variables** and add the following keys:

| Environment Variable | Recommended Value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations |
| `JWT_SECRET` | `flowforge-super-secure-production-jwt-key-2026-xyz` | Secret key for signing authorization tokens |
| `CLIENT_URL` | `*` | Allows cross-origin requests from your Vercel frontend |
| `DATABASE_URL` | *(Paste your Neon connection string from Step 2)* | Connects backend to Neon Cloud Postgres |

4. Click **Create Web Service**.
5. Render will begin building. In ~2 minutes, the log will show:
   ```text
   🚀 FlowForge API running on port 10000 [production]
   ==> Your service is live at https://flowforge-api.onrender.com
   ```

### 3.4 Verify Backend Health
Open a new browser tab and navigate to:
```text
https://flowforge-api.onrender.com/api/health
```
You should see:
```json
{
  "status": "ok",
  "timestamp": "2026-11-15T13:40:00.000Z",
  "environment": "production",
  "database": "connected"
}
```

> [!IMPORTANT]
> **Render Free Tier Spin-down Note:**  
> Free Render web services go to sleep after 15 minutes of inactivity. When you open the application after it has been idle, the first request will take ~30–45 seconds to wake up the server. Subsequent requests will be fast.

---

## Step 4: Deploy Frontend on Vercel (100% Free)

Vercel provides instant global deployment for the React + Vite frontend.

### 4.1 Import Project to Vercel
1. Go to **[vercel.com](https://vercel.com)** and log in with GitHub.
2. Click **Add New…** > **Project**.
3. Locate your `flowforge` repository and click **Import**.

### 4.2 Configure Build & Output Settings
1. Set **Framework Preset**: `Vite` (Vercel will usually auto-detect this).
2. **Root Directory**: Click **Edit** and choose `frontend`. **(CRITICAL)**.
3. Leave **Build Command** as `npm run build` and **Output Directory** as `dist`.

### 4.3 Add Environment Variables
Under the **Environment Variables** section, add:

| Key | Value | Example |
|---|---|---|
| `VITE_API_BASE_URL` | `https://<YOUR-RENDER-SERVICE-NAME>.onrender.com/api` | `https://flowforge-api.onrender.com/api` |

> [!WARNING]
> Ensure you include the `/api` suffix at the end of `VITE_API_BASE_URL` (e.g. `https://flowforge-api.onrender.com/api`, NOT just the root domain).

4. Click **Deploy**.
5. Vercel will build the frontend in ~20 seconds. Once completed, it will present your live public URL:
   ```text
   https://flowforge.vercel.app
   ```

---

## Step 5: Test & Validate in Production

### 5.1 Pre-Seeded Production User Credentials
FlowForge includes a full role hierarchy pre-configured for instant demonstration:

| Role | Email | Password | Access Capabilities |
|---|---|---|---|
| **Admin** | `admin@flowforge.internal` | `Admin@123` | Full system access, users, departments, SLA policies |
| **Manager** | `manager@flowforge.internal` | `Manager@123` | Approves team requests, reviews document evidence |
| **Department Head** | `depthead@flowforge.internal` | `DeptHead@123` | Approves high-value purchases (> $1,000) |
| **Finance** | `finance@flowforge.internal` | `Finance@123` | Approves budget expenditures (> $5,000) & reimbursement |
| **HR Partner** | `hr@flowforge.internal` | `Hr@123` | Leave request approvals, department transfers |
| **Employee** | `john.doe@flowforge.internal` | `Employee@123` | Submits leave, expense, and purchase requests |

### 5.2 Verification Checklist

1. **Sign In**:
   - Open your Vercel URL `https://flowforge.vercel.app`.
   - Sign in as `john.doe@flowforge.internal` / `Employee@123`.
2. **Pre-Submission AI Insights Verification**:
   - Click **+ New Request** > Select **Expense** or **Purchase**.
   - Attach an image (e.g. test receipt or artwork).
   - Watch the **AI Forensic Pre-Screening Engine** analyze the file in real-time.
   - Observe the **AI Generation Risk %** (e.g., 94% on non-document graphics), **Authenticity Score %**, and the **AI Reconsideration Advisory**.
   - Submit the request.
3. **Manager Approval & Inline Document Inspection**:
   - Sign in as `manager@flowforge.internal` / `Manager@123`.
   - Open **Approval Queue** (`/approvals`).
   - Click the submitted request.
   - Observe the **Document Evidence Card** showing the embedded preview directly inside the modal with Zoom, Rotate, Fullscreen, and SHA-256 integrity hash.
   - Click **Approve** or **Reject** with comments.
4. **Direct URL Refresh Check**:
   - Navigate to `/requests` or `/users` and press **F5 / Refresh**.
   - The page should reload without a 404 (handled by `vercel.json`).

---

## Common Troubleshooting & FAQ

### Q1: My API calls fail with Network Error or 404
- Check `VITE_API_BASE_URL` in Vercel settings. It must end with `/api` (e.g. `https://flowforge-api.onrender.com/api`).
- If you change an environment variable in Vercel, you must go to **Deployments** > click the three dots on the latest deployment > **Redeploy**.

### Q2: The backend is taking 40 seconds on the first login
- This is normal on the free Render tier. When a service is inactive for 15 minutes, Render spins down the container. The initial request starts the container. Subsequent requests respond in milliseconds.

### Q3: How are uploaded files stored online?
- FlowForge stores document metadata, forensic analysis, OCR line items, and file hashes directly in the database.
- Files uploaded to Render's free tier are accessible during the container session; for permanent enterprise asset storage across infinite container re-spins, you can connect an S3 or Cloudinary bucket, or use the database binary preservation already built into FlowForge.

### Q4: How do I deploy code updates in the future?
Whenever you make changes to your code, simply commit and push to GitHub:
```bash
git add .
git commit -m "feat: my update"
git push origin main
```
Both Render and Vercel will automatically detect the push, rebuild, and deploy without any downtime!


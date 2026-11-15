# FlowForge — Connecting an Online Hosted Database (PostgreSQL)

FlowForge is architected with **Prisma ORM**, meaning you can transition from local development to an online, hosted cloud database (such as **Neon**, **Supabase**, **Railway**, or **Aiven**) in less than 2 minutes.

Once connected, all user records, corporate hierarchies, multi-stage workflows, requests, uploaded proof metadata, and immutable audit logs will be permanently managed by your online cloud database.

---

## 🚀 Recommended Free Cloud PostgreSQL Providers

| Provider | Setup Time | Free Tier Details | Recommended For |
|---|---|---|---|
| **Neon** ([neon.tech](https://neon.tech)) | ~60 seconds | 0.5 GB storage, serverless, instant branches | **(Recommended)** Easiest setup, auto-scaling, requires zero credit card. |
| **Supabase** ([supabase.com](https://supabase.com)) | ~2 minutes | 500 MB database, visual table editor | Great if you want a web-based database table inspector. |
| **Railway** ([railway.app](https://railway.app)) | ~2 minutes | $5 trial credit, 1-click Postgres plugin | Great for unified deployment. |

---

## 🛠 Step-by-Step Connection Instructions

### Step 1: Create Your Online PostgreSQL Database
1. Go to [neon.tech](https://neon.tech) (or [supabase.com](https://supabase.com)) and sign up for a free account.
2. Click **Create Project** (Name it `flowforge-db`).
3. Copy your connection string. It will look like this:
   ```text
   postgresql://flowforge_owner:npg_xY12345Abc@ep-weathered-hill-a5qxyz.us-east-2.aws.neon.tech/flowforge?sslmode=require
   ```

### Step 2: Update Backend Environment Configuration
Open [`backend/.env`](file:///d:/Downloads/Flowforge-v/FlowForge/backend/.env) and replace the `DATABASE_URL` line:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Paste your online hosted PostgreSQL connection string here:
DATABASE_URL="postgresql://flowforge_owner:npg_xY12345Abc@ep-weathered-hill-a5qxyz.us-east-2.aws.neon.tech/flowforge?sslmode=require"

JWT_SECRET=super-secret-flowforge-jwt-token-key-change-in-production
JWT_EXPIRES_IN=7d
```

### Step 3: Push Schema to the Online Database
Open your terminal in the `backend` directory and push your Prisma schema:

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Push tables and indexes directly to your online database:
npx prisma db push
```

Prisma will create all 9 tables:
- `departments`
- `users`
- `sessions`
- `workflows`
- `workflow_steps`
- `requests`
- `request_documents`
- `approvals`
- `notifications`
- `audit_logs`

### Step 4: Seed Initial Enterprise Personas & Workflows
Populate your online cloud database with default departments, reporting hierarchies, and enterprise workflows:

```bash
npm run seed
```

### Step 5: Verify Online Connectivity
Start or restart your backend server:
```bash
npm run dev
```

Visit `http://localhost:5000/api/health`. You will see:
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "provider": "postgresql",
    "latencyMs": 42
  }
}
```

---

## 🛡 Hybrid Resilient Fallback Mode
FlowForge is built with failover resilience:
- If `DATABASE_URL` is configured and reachable, FlowForge communicates with PostgreSQL.
- If PostgreSQL is temporarily offline or unreachable, FlowForge operates on its auto-persisting `DataStore` with disk sync in `backend/data/store.json`, ensuring your application never crashes during network interruptions.

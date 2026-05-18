# Production Deployment Guide: Render (Docker Backend) & Vercel (Frontend)

This guide provides the exact production deployment instructions for the **NCC Exam Portal** based on your architecture:
*   **Frontend:** Already hosted on **Vercel** (Global CDN, 0s Cold Starts).
*   **Backend:** Containerized Express API deployed as a **Docker Web Service** on **Render (Free Tier)**.
*   **Database:** Serverless PostgreSQL on **Neon**.
*   **Cache & Queue:** Redis on **Upstash**.

---

## 1. Architectural Flow

```
┌────────────────────────────────────────────────────────┐
│                   PRODUCTION FLOW                      │
└────────────────────────────────────────────────────────┘
            │                                 │
            ▼ (Edge CDN)                      ▼ (Docker Web Service)
┌───────────────────────┐         ┌───────────────────────┐
│   VERCEL FRONTEND     │ ──────> │   RENDER DOCKER API   │
│   • ncc-exam.vercel.app   │  CORS   │  • ncc-api.onrender.com│
│   • Always Active (0s)│  Proxy  │  • Sleeps after 15m   │
└───────────────────────┘         └───────────────────────┘
                                              │
                                              ▼ (External Clouds)
                                  ┌───────────────────────┐
                                  │   Neon DB + Upstash   │
                                  └───────────────────────┘
```

By hosting your frontend on Vercel and your backend on Render, you have the ideal setup:
1.  ** Cadet-Facing Performance:** Since Vercel serves the static React bundle from an edge CDN, the exam interface loads instantly. Only the initial login/load requests will wait for the Render backend if it is waking up from a sleep cycle.
2.  **Stateless Efficiency:** All uploads, database sessions, and cache structures are completely external (Google Drive, Neon, Upstash), making the Render container 100% stateless and robust against restarts.

---

## 2. Dockerfile & Port Verification

Your clean [backend/Dockerfile](file:///c:/College%20Projects/ncc-exam-portal/backend/Dockerfile) is completely ready:
*   It exposes port `3000`.
*   It installs compilation tools (`python3`, `make`, `g++`) to build any native modules securely on Alpine.
*   It automatically runs `npx prisma generate` during container build to build the client libraries.
*   Render automatically overrides the runtime port using the `PORT` environment variable, which your server handles dynamically via `process.env.PORT || 3000`.

---

## 3. Step-by-Step Backend Deployment on Render

Follow these exact steps to host the Docker backend on Render's Free Tier:

### Step 1: Create the Render Web Service
1.  Go to the [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
2.  Connect your GitHub repository.
3.  Configure the following deployment fields:
    *   **Name:** `ncc-exam-backend` (or a name of your choice)
    *   **Region:** Select the region physically closest to you (e.g., `Singapore` if in India, or `Oregon` in the US).
    *   **Branch:** `main` (or your production-ready branch).
    *   **Root Directory:** `backend` *(Crucial: This tells Render to run the docker build context specifically inside the backend subfolder!)*
    *   **Runtime:** `Docker`
    *   **Instance Type:** `Free`

---

### Step 2: Configure Safe Migrations & Pre-deploy Commands
To ensure your database schemas on Neon are automatically updated and kept in sync with code updates, expand the **Advanced** section:
*   **Pre-deploy Command:** `npm run db:migrate:deploy` (or `npx prisma migrate deploy`)

> [!TIP]
> **Why this matters:** The Pre-deploy command spins up a temporary container to execute your database migrations *before* routing traffic to the new server version. If a database migration fails, Render aborts the deployment, ensuring your live server never breaks!

---

### Step 3: Configure Environment Variables
Add the following key-value pairs in the **Environment Variables** section:

| Environment Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Optimizes Express logging, performance, and security. |
| `PORT` | `3000` | Tells Render which port our container will listen on. |
| `DATABASE_URL` | *Your Neon Connection String* | Ensure optimal connection limits: `postgresql://...aws.neon.tech/neondb?sslmode=require&connection_limit=10&pgbouncer=true` |
| `REDIS_URL` | *Your Upstash Redis Connection String* | The secure Redis URL (e.g. `rediss://default:...@logical-wasp-126894.upstash.io:6379`) |
| `JWT_SECRET` | *A highly secure, random string* | Used to encrypt student and admin auth tokens. |
| `CLIENT_URL` | `https://your-app.vercel.app` | **Your Vercel deployment URL** (e.g., `https://ncc-exam-portal.vercel.app`). *Must not end with a slash.* |
| `CLIENT_URLS` | `https://your-app.vercel.app` | Explicitly allows Vercel requests past CORS validation. |

*Click **Create Web Service** to start the build and deployment process.*

---

## 4. Update Vercel Environment Variables (Frontend)

To connect your Vercel frontend to the new Render API, configure your Vercel project environment variables:

1.  Open your project dashboard on Vercel.
2.  Go to **Settings** > **Environment Variables**.
3.  Add/Update the following variables:
    *   **`VITE_API_URL`**: `https://ncc-exam-backend.onrender.com` *(Replace with your exact Render Web Service URL)*
    *   **`VITE_API_PREFIX`**: `/api`
    *   **`VITE_COOKIE_AUTH`**: `true`
4.  Trigger a new deployment on Vercel (or redeploy the latest commit) to compile Vite with these updated environment variables.

---

## 5. Pro-Tips for Production Scale (3,000+ Concurrent Users)

To ensure high availability during active exams when hosted on Render's free tier:

### 1. Configure DB Connection Pools 🔌
Your Neon Database is running on a serverless tier. Naive database connections will instantly hit Neon's limit during high-load exam sessions.
*   By appending `&connection_limit=10&pgbouncer=true` to your `DATABASE_URL`, Prisma queues concurrent queries and limits total connections, preventing `DB_001` outages under spike load.

### 2. Keep the Backend Awake (Active Exam Windows) ⏰
On Render's Free Tier, services sleep after 15 minutes of inactivity. Booting up takes ~50 seconds, which will delay logins when an exam starts.
*   **The Sleep Bypass:** Register a free task on [cron-job.org](https://cron-job.org/) that pings your backend's `/health` endpoint every 12 minutes. Run this ping schedule during scheduled exam windows to keep your Render container permanently warm and active!

### 3. Graceful Health Monitor 🩺
Render regularly pings `/health` to verify service health. Your Express router has an unauthenticated `GET /health` route fully prepared for this. Render uses this to perform smooth rolling deployments with zero cadet downtime!

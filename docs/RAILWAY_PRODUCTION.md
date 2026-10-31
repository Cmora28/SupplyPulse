# Deploying to Production on Railway

The **Next.js app runs on Vercel**. Railway is used for **PostgreSQL**, **Redis**, and the **background worker** only. This guide covers creating the database and Redis, then deploying the worker so it connects using the same public URLs you add to Vercel.

---

## 1. Create the database and Redis first

You need the **public connection URLs** before starting the web app or worker.

### 1.1 Create a new Railway project (or use existing)

- Go to [railway.app](https://railway.app) → **New Project**.

### 1.2 Add PostgreSQL

- In the project, click **+ New** → **Database** → **PostgreSQL**.
- Wait until the service is provisioned.
- Open the PostgreSQL service → **Variables** (or **Connect** tab).
- Copy **`DATABASE_URL`** (or the connection string shown).  
  It should look like:  
  `postgresql://postgres:PASSWORD@HOST:PORT/railway`  
  and use a **public** host (e.g. `*.proxy.rlwy.net`).  
- If you only see a private URL, check the service **Settings** and enable **Public Networking** so your app (e.g. on Vercel) can reach it.

### 1.3 Add Redis

- In the same project, click **+ New** → **Database** → **Redis**.
- Wait until the service is provisioned.
- Open the Redis service → **Variables** (or **Connect** tab).
- Copy **`REDIS_URL`** (or the URL shown).  
  It should look like:  
  `redis://default:PASSWORD@HOST:PORT`  
  and use a **public** host.  
- Enable **Public Networking** for Redis if needed so the worker (and any app on Vercel that uses Redis) can connect.

You now have:

- `DATABASE_URL` – PostgreSQL public URL  
- `REDIS_URL` – Redis public URL  

Add these same URLs to **Vercel** (Project → Settings → Environment Variables) so the app can connect to the production database and Redis.

---

## 2. Run the worker on Railway (recommended)

The worker runs the scheduler and report jobs. It must have the same env vars as the app (database, Redis, Perplexity, Resend, etc.).

### 2.1 New service for the worker

- In the same Railway project, click **+ New** → **GitHub Repo** (or **Empty Service** and connect repo later).
- Select your **SupplyPulse** repo and branch (e.g. `master`).

### 2.2 Configure the worker service

- Open the new service → **Settings** (or **Variables**).
- **Build**
  - **Build Command:** `npm install && npx prisma generate`  
    (No Next.js build needed for the worker.)
  - **Output Directory:** leave empty or `.`
- **Deploy**
  - **Start Command:** `npm run worker:start`  
    (Runs `npx tsx src/worker.ts`.)
- **Root Directory:** leave default (repo root).

### 2.3 Variables for the worker

In **Variables**, set (or **Reference** from other services if you prefer):

- `DATABASE_URL` – from the PostgreSQL service (public URL).
- `REDIS_URL` – from the Redis service (public URL).
- `PERPLEXITY_API_KEY`
- `RESEND_API_KEY`
- `JEV_API_KEY` – TypeSafe classifier for daily supplier alerts. Worker only. If unset, news is still collected and weekly reports still run; mid-week alerts are not sent. See `docs/DAILY_SUPPLIER_ALERTS.md`.
- `NEXT_PUBLIC_APP_URL` – e.g. `https://supplypulse.net` (used in emails/links).
- `EMAIL_FROM` – (optional) e.g. `Supply Pulse <reports@supplypulse.net>`
- `ADMIN_EMAIL` – server-only bootstrap. On startup the worker sets `User.isAdmin` for this existing account so the current admin is not locked out. This is not a public env var. See `docs/ADMIN_ACCESS.md`.

You do **not** need `NEXTAUTH_SECRET` or `NEXTAUTH_URL` for the worker.  
Do **not** set `NEXT_PUBLIC_ADMIN_EMAIL`. Add any other env vars your worker code reads (e.g. from `.env.example`).

### 2.4 Deploy

- Push to the connected branch or click **Deploy**.
- Check **Deployments** and **Logs** to confirm the worker starts and the scheduler runs (e.g. “Setup Distributed scheduler cron set: every 15 minutes” and “Daily supplier news cron set: 06:00 UTC”).
- The worker applies every idempotent script in `src/lib/apply-sql.ts` on startup, before it accepts jobs: the news tables, the news audit tables, and `prisma/sql/20261031_user_is_admin.sql`. It then grants `isAdmin` to `ADMIN_EMAIL` when that user exists. Deploy the worker before the Vercel app so the column exists. Steps are in `docs/ADMIN_ACCESS.md`. News cadence and cost notes are in `docs/DAILY_SUPPLIER_ALERTS.md`.

---

## 3. Add the same URLs to Vercel

In your Vercel project → **Settings** → **Environment Variables**, set (for Production):

- `DATABASE_URL` – same value as on Railway (PostgreSQL public URL)
- `REDIS_URL` – same value as on Railway (Redis public URL)
- `NEXTAUTH_URL` – `https://supplypulse.net` (or your Vercel domain)
- `NEXT_PUBLIC_APP_URL` – `https://supplypulse.net`
- Plus all other app env vars (NEXTAUTH_SECRET, Polar, Resend, Perplexity, etc.)
- Remove `NEXT_PUBLIC_ADMIN_EMAIL` if it is set. Admin checks do not read it.
- `ADMIN_EMAIL` on Vercel is optional. It does not authorize requests. If set, a Node server grants that existing user `isAdmin` once the column exists. The Railway worker is the bootstrap that must run first. See `docs/ADMIN_ACCESS.md`.

Redeploy the app after changing variables so it uses the production DB and Redis. Deploy the Railway worker before this app so `User.isAdmin` exists.

---

## 4. Summary: what runs where

| Component   | Where it runs | Needs |
|------------|----------------|--------|
| PostgreSQL | Railway        | Public `DATABASE_URL` |
| Redis      | Railway        | Public `REDIS_URL` |
| Worker     | Railway        | `DATABASE_URL`, `REDIS_URL`, Perplexity, Resend, `JEV_API_KEY`, `ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL` |
| Next.js app| **Vercel**     | Same `DATABASE_URL`, `REDIS_URL`, NextAuth, Polar, Resend, etc. |

Create **PostgreSQL and Redis on Railway first**, copy their **public** URLs, add them to **Vercel** and to the **Railway worker** service, then deploy the worker.

# Bank CRM — React, Node and Neon PostgreSQL

A fresh multi-bank CRM for marketers and their management hierarchy, built with React, Node.js and Neon PostgreSQL. This is a new installation.

## Included scope

Institution login, server-enforced bank and management scope, branches, staff hierarchy, leads and follow-ups, customer records, opportunities, count-based targets, product catalogue, scoped dashboards, audit events and synthetic demonstration setup. A Won sales status is manually entered and **does not verify a deposit, disbursement, account activation or financial outcome**. Future integrations and production controls are documented under `docs/`.

## Local Windows / Laragon setup

Use Node.js 24 LTS or supported Node 22. Laragon can remain your terminal and project directory; MySQL is not used by this version. You need a Neon PostgreSQL database connection. The browser runs at localhost while its Node API connects to Neon.

Extract the ZIP so this README and package.json are directly inside `C:\laragon\www\bank-crm-neon`. Open Laragon Terminal. Run each command separately:

```bat
cd C:\laragon\www\bank-crm-neon
node --version
npm --version
npm ci
npm run setup
```

Open root `.env` in your editor. Replace `DATABASE_URL` with the connection string copied from your Neon project’s Connect dialog. Use a dedicated development branch/database for initial tests. Keep the password and connection string private. Do not paste them into chats, screenshots, commits or client code. Never create a `VITE_DATABASE_URL` variable.

```dotenv
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_NEON_HOST/YOUR_DATABASE?sslmode=require
APP_ORIGIN=http://localhost:5173
PORT=4000
NODE_ENV=development
SEED_DEMO=false
DEMO_PASSWORD=
```

The server verifies hosted PostgreSQL TLS certificates. Then run:

```bat
npm run db:setup
```

Optionally set `DATABASE_URL_DIRECT` to the direct Neon connection string for schema setup; normal API requests use `DATABASE_URL`.

Schema setup is additive and transactional, with no DROP or TRUNCATE. It creates absent tables but is not a general upgrade/migration tool for incompatible existing schemas. Database connection failures are failures; no local substitute database is silently selected.

### Option A: synthetic demonstration

On a **fresh development database**, change `SEED_DEMO=true` and choose your own `DEMO_PASSWORD` of at least 12 characters. Run:

```bat
npm run db:seed
npm run dev
```

Open http://localhost:5173. Institution code is `NORTH` or `SOUTH`. Emails follow `ROLE@north.example` or `ROLE@south.example`, with these roles: `marketer`, `team_leader`, `branch_manager`, `regional_manager`, `head_of_sales`, `executive`, `bank_admin`. For example, use `bank_admin@north.example` to configure the demonstration bank. All demonstration accounts use the password you supplied. The seed prints account identifiers but never the password.

Seeding rejects an existing NORTH or SOUTH code and rolls back the transaction. It never resets passwords. It is disabled in production. After seeding, return `SEED_DEMO=false` and remove `DEMO_PASSWORD` from `.env`. Demo records are fictional; do not put real customer data in a demo.

### Option B: create a bank without demo data

Add these variables to root `.env` with your own values:

```dotenv
BANK_CODE=YOURBANK
BANK_NAME=Your Bank Name
BANK_CURRENCY=USD
BANK_TIMEZONE=UTC
BANK_ADMIN_NAME=Your Administrator
BANK_ADMIN_EMAIL=administrator@example.com
BANK_ADMIN_PASSWORD=YOUR_UNIQUE_12_OR_MORE_CHARACTER_PASSWORD
```

Run:

```bat
npm run bank:create
npm run dev
```

The bootstrap creates a new bank and bank administrator. Existing bank codes are rejected. Remove `BANK_ADMIN_PASSWORD` afterward. Sign in, create branches, then create management accounts from the top down so reporting relationships can be selected. Assign branch managers to a branch. This command has database authority and is an operator tool, not public bank registration.

### Daily start and stop

```bat
cd C:\laragon\www\bank-crm-neon
npm run dev
```

Keep the terminal open. Stop with Ctrl+C. If 4000 or 5173 is already in use, stop the other process. The web proxy expects API port 4000. Changes to environment configuration require restarting the server. This ZIP excludes `node_modules`, `.env` and generated browser output; `npm ci` installs the locked dependencies.

## Verification

```bat
npm test
npm run build
```

Automated integration tests use an isolated embedded PostgreSQL engine (PGlite) rather than Neon. They do not contact or validate your actual Neon instance. Optional browser tests require installed Playwright Chromium:

```bat
npx playwright install chromium
npm run test:browser
```

Browser-test configuration defines its test fixture and server startup. Check `docs/VERIFICATION.md` for this candidate's actual results; do not treat instructions as evidence that commands ran. No GitHub push or Vercel deployment is implied by local tests.

## GitHub Desktop

1. Create or clone your own repository using GitHub Desktop.
2. Copy the extracted project contents into that repository folder. Keep `.git` intact.
3. Check the Changes list. `.env`, dependency folders and local test output must not appear. Commit source, SQL, docs, configuration and `package-lock.json`.
4. Publish to your selected repository only when you approve the reviewed changes. Do not include passwords or production customer data.

## Vercel preparation

This repository includes a Node API function at `api/index.js` and a Vite static build at `web/dist`. These are configuration files, **not evidence of deployment**.

1. Import the approved GitHub repository into Vercel. Use the repository root as Root Directory, not `web/`.
2. Select the Other framework preset if automatic detection conflicts with the included configuration. Build command is `npm run build`; output is `web/dist`; install uses the lockfile.
3. Set server-side `DATABASE_URL`, `NODE_ENV=production`, and `APP_ORIGIN` to the exact final HTTPS application origin. Do not prefix secrets with `VITE_`. Do not configure demonstration seed passwords in Vercel.
4. Apply `npm run db:setup` from your trusted local terminal against the intended Neon database before first use. Creating schema is not a deployment build step. Review the target connection carefully.
5. Use `npm run bank:create` locally for the initial bank administrator; keep credentials out of build logs.
6. Review and approve publishing. After deployment, verify API routing, login/cookies/CSRF, permission isolation, reads/writes, and browser navigation against the actual deployed URL. Record the commit and deployment evidence.

Preview deployments need an origin setting matching their exact URL and should use a separate development database. Keep production and preview credentials separate. Serverless PostgreSQL pools are capped per instance; capacity and connection pooling need deployment-specific review.

## Troubleshooting

- API unavailable: ensure Node is running; check the terminal and `/api/health`.
- DATABASE_CONFIG: replace example root `.env` connection values and restart.
- Database unavailable: confirm Neon hostname, credentials, branch/database, network reachability and TLS settings. Do not disable TLS verification.
- Invalid login: check institution code and email; use your supplied password. Repeated failures are throttled.
- Forbidden changes: verify role and scope. Executives are read-only; staff/branch administration belongs to bank administrators.
- No records: your role may only see assigned records or descendants. Sign in with the intended bank and account.
- Existing demo bank: choose a fresh development database rather than deleting or resetting existing records.

See `docs/USER-GUIDE.md` for roles and daily workflows, and `docs/COMMAND-CENTER.md`, `docs/SECURITY.md` and `docs/LIMITATIONS.md` for ownership, review gates and remaining work.

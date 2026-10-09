# Interface redesign — candidate v2

CEO direction, 9 October 2026: improve the application's interface and design details substantially. Authorized scope is the reviewable local redesign and ZIP; no production deployment or database changes are included.

## Design and acceptance criteria

Use a coherent enterprise banking workspace with navy navigation, a light neutral canvas and restrained blue accents. Improve information hierarchy, spacing, typography, form clarity and role context. Navigation groups separate daily relationship work from management and institution administration. Dashboard summaries use actual scoped API data only; no invented trends, money totals or bank outcomes. Product-development milestones belong in documentation, outside staff's daily navigation.

Desktop navigation remains readily available; small screens gain an explicit menu with dismissal and understandable current location. Forms retain keyboard access, readable labels and their existing validation/error behavior. Lead details foreground ownership, stage, contact information and next actions. Opportunity estimates remain labelled as estimates.

Protect current sessions, CSRF checks, bank isolation, hierarchy rules and executive read-only behavior. Retain existing API contracts and existing PostgreSQL schema. Preserve the CEO's existing administrator, Head Office branch and any staff records by deploying UI source without running provisioning again.

## Actual department ownership

- Command Center: root integrates the candidate, verifies package and prepares the handoff.
- Interface/frontend: neon_frontend owns main.jsx and interaction changes.
- Visual design/frontend: frontend owns styles.css and responsive presentation.
- Independent QA/security: security_qa owns interaction tests and QA-REDESIGN.md, tests the integrated candidate against the criteria.

## Upgrade preparation

Review this full ZIP in a separate folder first. Keep your existing private .env and Git repository. The application source is cumulative; after review, replace source/configuration with this candidate while preserving .env and .git. Install dependencies using npm ci and build with npm run build. Do not run db:setup, bank:create or db:seed for this UI upgrade. No schema or account setup is needed.

Review GitHub changes before committing; secrets and node_modules must remain excluded. A Vercel deployment is a separate release decision. The existing bank-crm-seven.vercel.app URL is known from user screenshots; this redesign has not been uploaded there.

Rollback: restore the previous source revision and redeploy it. Since this candidate does not change database objects or records, rollback has no database migration step.

## Integrated evidence and limits

Functional suite: 15 passing tests on the final candidate, including the desktop-resize regression. Production build passes for the final styled source. Dependency audit reports zero known advisories. Four Playwright cases are discoverable. Chromium and its headless shell both failed to download with invalid/truncated ZIP archives; actual browser, screenshot and responsive layout checks remain unverified. Independent QA report records the separate review and precise scope of DOM checks.

Latest usability refinements: local system typography, readable input/body/table sizing, larger control spacing, descriptive form labels, visible focus outlines, announced modal titles, navigation focus trapping and desktop-resize release. The source files remain formatted with explanatory comments for future corrections.

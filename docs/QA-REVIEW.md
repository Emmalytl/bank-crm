# Independent QA and security review

Reviewed candidate: React/Node/PostgreSQL CRM, 7 October 2026. This is a development candidate, not an approved banking production release.

## Checks independently executed

`node --test server/test/unit.test.mjs server/test/integration.test.mjs server/test/seed.test.mjs`

Result: **11 tests passed, 0 failed**. The integration fixture uses PGlite, an actual PostgreSQL engine running in WebAssembly in this workspace. It does **not** connect to Neon.

Coverage includes:

- Salted password verification, session parsing, CSRF comparisons, strict payload validation and calendar validation.
- PostgreSQL parameter bindings, INTEGER identifier bounds and hosted TLS configuration.
- API authentication, CSRF rejection and forbidden-origin rejection.
- Bank isolation and own-record restrictions, plus actual team, branch and regional visibility against another team/branch.
- Executive write denial and administrator-only actions.
- Lead update preserving omitted fields, scheduled reminder completion, idempotent customer conversion and rejection of unsafe converted-lead ownership transfer.
- Customer/opportunity scoping, decimal amount preservation and direct cross-bank foreign-key rejection.
- Product permissions, scoped targets, target progress from recorded opportunity status, audit visibility and logout.
- Persisted failed-login throttling: twenty invalid attempts are rejected and the next returns 429.
- Schema rerun preserves records. Demo setup creates two synthetic banks and fourteen role accounts, refuses reseeding without resetting passwords, and is disabled in production.

## Source review

Inspected tenant scopes, audited transactions, PostgreSQL constraints, configuration, schema/provisioning/demo scripts and serverless API URL normalization. Reported issues concerning default-injecting updates, identifier overflow, allowed origins, successful-login throttling, converted-lead ownership and unknown-role behavior were addressed in the candidate source. No unresolved release-blocking issue was found within the tested development scope.

## Limits and outstanding production work

- No Neon connection or deployment was independently verified. Hosted TLS settings were tested as configuration, not a live handshake.
- No GitHub upload or Vercel build/deployment result is claimed.
- These tests are local API/database checks. They do not establish real-browser graphical QA, mobile accessibility, load performance, or every concurrency scenario.
- General API rate limiting remains process-local; persistent account login throttling is database-backed. Hosting-level protection remains necessary before production.
- Opportunity values/statuses and target counts are manually entered sales records, not independently confirmed banking transactions or deposits.
- Production requires institution-approved identity, data residency, retention, audit policies, backup restoration checks, and integrations with authoritative bank systems.

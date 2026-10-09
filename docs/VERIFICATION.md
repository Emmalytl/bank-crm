# Current interface candidate

For v2 / package 1.1.0 (9 October 2026), see `QA-REDESIGN.md` and `REDESIGN-v2.md`. The original foundation verification below is retained as historical evidence.

# Candidate verification — 7 October 2026

Environment: local Linux workspace, Node 24.19.0, React 19, Vite 7.3.7. No user database credentials or customer data were used.

| Check | Observed result |
| --- | --- |
| Node unit/API/database/seed/entrypoint/React DOM tests | 15 passed, 0 failed |
| Production React build | Passed; 1573 modules; JS about 255 kB, gzip about 79 kB |
| npm audit, entire dependency tree | 0 known vulnerabilities at verification time |
| Playwright discovery | 3 tests discovered |
| Test-server fixture startup | Passed |
| Real Chromium/browser/layout tests | Not executed; Chromium download failed with truncated ZIP archive errors |
| Actual Neon connection and TLS handshake | Not verified; no account connection supplied |
| GitHub push / Actions run | Not performed |
| Vercel build / deployed application | Not performed |

The PostgreSQL tests use PGlite, a PostgreSQL engine in WebAssembly. They exercise SQL, constraints, transactions and HTTP API behavior, but not Neon networking or its pooler. React DOM tests use jsdom, actual API calls and that database; they cover interaction behavior but not rendering/layout in a real browser.

Independent QA/security executed 11 tests; the integrated suite additionally includes three entrypoint tests and one React DOM interaction test. See QA-REVIEW.md for the independent verdict and remaining gaps. Detailed assertions are committed in the test source. Browser tests are included and configured in GitHub Actions, but that configuration has not run on GitHub.

The earlier critical development dependency was removed in favour of a direct Node process launcher. Audit results are a point-in-time package advisory check, not a guarantee that all security weaknesses are absent.

## Reproduce

Run each command separately from the project root:

```text
npm ci
npm test
npm run build
npm audit
npx playwright install chromium
npm run test:browser
```

Browser tests use synthetic test accounts and a disposable database, never your Neon connection. Before accepting a hosted candidate, verify the exact deployed commit, health response, authentication, cookies/CSRF, bank isolation and real browser workflows against the intended deployment.

## Provider references used during preparation

- Neon connection guidance: https://neon.com/docs/get-started/connect-neon
- Neon security overview: https://neon.com/docs/security/security-overview
- node-postgres TLS documentation: https://node-postgres.com/features/ssl
- Vercel static configuration: https://vercel.com/docs/project-configuration/vercel-json
- Vercel rewrites: https://vercel.com/docs/routing/rewrites

These references explain supported provider behavior; they are not evidence of an actual deployment.

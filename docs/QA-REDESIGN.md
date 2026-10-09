# Interface redesign: independent QA

Candidate version 1.1.0, reviewed 9 October 2026.

## Independently verified

- `npm test`: 15 passed, 0 failed. Includes the existing PostgreSQL WASM security/API regression suite and rendered React interactions calling that API.
- `npm run build`: successful Vite production build.
- `npx playwright test --list`: four Chromium scenarios discovered; discovery is not a browser execution result.

The React DOM workflow verifies institution login; all visible marketer navigation pages; no delivery-roadmap navigation; header page search navigation and clearing; compact navigation expanded state; background inert state; focus trapping and restoration; Escape/backdrop dismissal; navigation closing the drawer; desktop resize releasing the drawer, background inert state and scroll lock; lead creation and customer conversion; opportunity creation; and executive read-only controls.

JSDOM does not implement visual layout. The focus-trap test supplies button rectangles to exercise keyboard logic; this is not evidence of responsive positioning or rendered browser layout. Tests use synthetic records with a local PostgreSQL engine in WASM, not Neon.

## Review limits

No real Chromium session, screenshot/layout inspection, mobile overflow verification, deployed Neon handshake, GitHub upload, or Vercel deployment is claimed here. Browser scenarios have been maintained for executing those checks when Chromium is available. Existing financial disclosure remains: opportunity amounts and sales outcomes are CRM entries rather than bank-confirmed transactions. No fabricated financial trend was needed for the dashboard redesign.

The backend and schema regression suite passed alongside interface changes. Production banking acceptance and institution-specific controls remain outside this UI delivery.

# Verification and remaining acceptance

## Automated checks for this release

- Strict TypeScript and Vite production build.
- 36 existing marketplace/API assertions: permission checks, seller approval, private orders, server totals, stock reservation/rollback, checkout idempotency, cancellation and eligible reviews.
- 17 password/auth/content tests against an isolated SQLite adapter: scrypt salts/verification, no OAuth routes, registration and reserved admin email, username/email sign-in, admin separation, publication filtering, CBSL sources, null observations, private support, password change/reset revocation, suspension, logout, credential rotation and rate limiting.
- Native Cloudflare workerd integration: real node:crypto scrypt, D1 member registration, super admin login/dashboard and session revocation. This dispatches requests directly to an isolated local Worker, without browser or Cloudflare account writes.
- Worker deployment dry-run and local D1 migration application.

The SQLite tests use actual request handlers and SQL, with the runtime environment substituted. workerd verification tests the native Worker crypto/database path. Neither is a live deployment, production load test or independent security audit.

## Browser and live acceptance still required

Browser/device/screenshot QA was unavailable in this environment. No browser visual or accessibility certification is claimed. Responsive styles, labelled form controls, keyboard-native FAQ details/summary, focus styling and reduced-motion rules are implemented, but should be tested on your devices.

After deploying, verify desktop/mobile layouts; register a fisherman; complete a profile; verify it as admin; upload a genuine photo; publish a catch; place/accept/complete an order; verify cancellation stock; change/reset a password; edit/publish a draft article and FAQ; verify a signed-out visitor cannot reach private data. Check real Worker CPU usage and account limits under expected password traffic.

The CBSL price index returned an access block during research. Initial figures were checked against the user-supplied 15 October 2026 PDF, including visual verification of the market column labels. New report ingestion is manual, not an automated daily feed. Missing values are preserved.

Real weather-provider credentials, operator/legal copy, complete local-language review, public seller data and live account acceptance remain operator setup. Google has been removed; no Google round trip is required or claimed.

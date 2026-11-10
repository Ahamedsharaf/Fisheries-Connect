# Deploy or upgrade on Cloudflare

This application uses Workers with Static Assets, D1 and R2. A static Pages-only upload does not run its API.

## Existing deployment

1. Keep your old project folder as a backup and extract v2 into a new folder.
2. Review wrangler.jsonc. It contains the existing Worker `fisheries-connect`, your D1 ID, R2 bucket, actual URL and selected admin email from the supplied screenshots. There are no secrets in this file.
3. Open PowerShell/Windows Terminal in the new project folder. Install Node 22.13+ if needed.

```bash
npm ci
npx wrangler login
npm run admin:password
npm run deploy
```

Skip `wrangler login` if already logged in. Choose your own new admin application password when prompted. Do not reuse an email-provider password.

The deployment wrapper sets CI=true only for its Wrangler child processes. This avoids the interactive migration prompt crash shown in your screenshot. `--yes` is not used because the pinned migrations command does not support it. Authentication still uses your normal configured Cloudflare authorization.

The command applies only pending migrations. Existing marketplace data is retained. Do not delete the original migrations, rename applied migrations, recreate the database, or use a fresh database ID to upgrade. Migration 0002 adds local password accounts/sessions/rate limits/reset tokens. Migration 0003 inserts the dated price report, two articles and FAQs with fixed IDs; running migrations again does not duplicate them.

Open your actual URL and check /health, /explore, /portal, /prices and /admin. Sign into /admin with ADMIN_EMAIL and the password chosen above. There is no Google client ID, consent screen or callback to configure.

Previous OAuth accounts and sessions are not accepted by v2. Their historical tables are retained only to preserve data and migration history. If an earlier user has marketplace records, do not silently merge a new account merely because it claims the same email. Recover historical ownership through a verified operator workflow. No automatic identity migration is claimed.

If the old GOOGLE_CLIENT_SECRET or ADMIN_GOOGLE_SUB secrets still exist in your Worker, v2 ignores them. Once the new deployment works, you can remove these retired secrets from the Worker Settings dashboard. No new Google secret is needed.

## Fresh installation on a different account

```bash
npm ci
npx wrangler login
npx wrangler d1 create fisheries-connect-db
npx wrangler r2 bucket create fisheries-connect-photos
npm run configure
npm run deploy
npm run admin:password
```

When Wrangler offers to modify configuration while creating resources, decline the automatic edit; `configure` assigns the required `DB` and `BUCKET` bindings. It also repairs duplicates left by the old resource-creation flow.

Find your account workers.dev subdomain in Cloudflare Workers & Pages. The correct format is `https://WORKER.ACCOUNT-SUBDOMAIN.workers.dev`. A name without the account subdomain, or the literal text YOUR-SUBDOMAIN, is not your application URL. You may instead use your configured custom domain.

The fresh-install sequence deploys the app first so `admin:password` can attach its secret to an existing Worker without a creation prompt. Admin access stays closed until the secret has been installed.

## Administration and recovery

`npm run admin:password` replaces the admin password hash in Cloudflare. Rotation immediately invalidates prior admin sessions because sessions are bound to the current hash and admin email. Changing ADMIN_EMAIL also invalidates those sessions. Keep Cloudflare account access available for recovery.

Member password changes are available from My profile. Forgotten member passwords use operator-assisted reset links; /admin → Users & verification → Reset access. Verify the person through your operational process before sharing a link. It expires after 30 minutes, is usable once and revokes old member sessions. There is no email-delivery provider or automatic email verification in this package.

## Local development

```bash
cp .dev.vars.example .dev.vars
npm run build
npm run db:migrate:local
npx wrangler dev
```

Use the Wrangler origin for full account flows. HTTP localhost uses an HttpOnly development cookie; production HTTPS uses a Secure __Host- cookie. For local admin tests add a generated hash to .dev.vars, keeping that file private. `npm run dev` provides frontend hot reload and proxies to Wrangler at 127.0.0.1:8787; avoid mixing different browser hostnames during authentication.

## Operating the deployment

- Back up D1 before upgrades using your Cloudflare database tools. Keep R2 objects and configuration with your backups. Never distribute database dumps containing account information.
- Daily cleanup removes expired sessions, rate-limit windows and reset tokens. Public member sessions last seven days; admin sessions last eight hours.
- Monitor native password-hashing CPU usage and request limits on your chosen Worker plan under realistic concurrency. Do not reduce password hash strength to work around limits. No production load test is claimed.
- Add your licensed weather key with `npx wrangler secret put WEATHER_API_KEY` if needed.
- For a new domain, configure the Worker custom domain in Cloudflare, change APP_URL with `npm run configure`, and redeploy. There is no OAuth redirect URL to update.
- The package is prefilled for this user's resources. If sharing source publicly, replace the account-specific email/resource IDs with your own placeholders first. No secret belongs in wrangler.jsonc or Git.

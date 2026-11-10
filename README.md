# Fisheries Connect · Coastal edition 2.0

The Cloudflare edition of Fisheries Connect, with an Explore gateway, a fishermen portal, a separate super admin login, dated CBSL fish-price comparisons, two coastal articles and an editable FAQ section. Authentication uses an application email/username and password. There is no Google sign-in or OAuth configuration.

## Update your existing Cloudflare deployment

Clone this repository into a new folder and keep a backup of your existing deployment and database.

Deployment settings in `wrangler.jsonc` are placeholders. Run `npm run configure` to enter the existing Worker name, D1 ID, R2 bucket, admin email and Worker URL. Do not commit your configured file to this public repository. No passwords or Cloudflare credentials are included.

```bash
npm ci
npm run configure
npm run deploy
```

Use Node.js 22.13 or newer. If Cloudflare login has expired, run `npx wrangler login` first. For the hidden password prompt on Windows, use PowerShell or Windows Terminal; if Git Bash reports a non-interactive terminal, reopen the same folder in PowerShell.

Run `npm run admin:password` only when setting or rotating the admin password. It asks you for a new 12–128 character application password twice. It uploads only the salted password hash as a Cloudflare secret. No password is printed, saved in a source file or sent through this chat. There is no default password.

`deploy` validates configuration, builds the app, applies pending migrations without the Git Bash confirmation prompt, then deploys. It preserves existing marketplace tables and does not recreate your database or bucket. It applies two NEW migrations on an already-deployed v1 installation: password accounts, then the CBSL report/articles/FAQs.

Open:

- Website: https://fisheries-connect.ahamedsaraf18.workers.dev
- Explore: /explore
- Fishermen login/create account: /portal
- Super admin email/password login: /admin

Sign in at /admin with the ADMIN_EMAIL in wrangler.jsonc and the password you just chose. Member registration cannot create an administrator. The administrator email is reserved for the separate admin login.

To change resource details or the admin email, run `npm run configure`; pressing Enter keeps an existing value. Use the complete real URL, including your account subdomain. Then set the admin password and redeploy.

## Included behavior

- Premium navy header, original ocean hero, two portal gateways, compact red/green price movement cards, two articles and seven FAQs.
- Public seafood market, nearby reviewed sellers, product preparation/weight options, one-seller basket and cash-on-pickup/delivery orders.
- Member registration with name, email, username and application password. Fisherman accounts open their profile after registration.
- Fisherman listings, photo upload, orders, earnings/expense records, weather/advisory views, services, stations and explicit emergency calling/location sharing.
- Super admin dashboard: member verification/suspension, catch moderation, guarded order progression/cancellation, official records, article/FAQ editing and draft/publish controls, private support requests, password reset links and activity history.
- Salted scrypt password hashes, opaque hashed sessions, secure HttpOnly production cookies, origin checks, persistent rate limits and session revocation on password changes.

## Price data

The fish section of the supplied CBSL Daily Price Report, dated 15 October 2026, is transcribed into 21 market/species records for Peliyagoda, Negombo and Narahenpita. Missing observations remain `null` and display “Not reported”; they are never zero. Prices are reference data, not seller quotations or Sainthamaruthu prices. Green means decreased; red means increased. The homepage shows four selected retail observations; See more opens the comparison page.

The report PDF is included at public/reports/cbsl-price-report-2026-10-15.pdf. The CBSL index returned an access block during this update, so the attachment is the dated data source. There is no automatic daily data feed. Add newer reviewed reports through the admin Market prices section and retain source/date information.

## Deployment and verification

Read docs/DEPLOY-CLOUDFLARE.md for fresh installations, docs/ADMIN-GUIDE.md for daily operations and docs/VERIFICATION.md for exact checks and remaining live acceptance tests. Build and backend/runtime tests are supplied; browser/device QA and your live account acceptance checks still need completing after deployment. The repository is based on the supplied production package; verify its version against the live deployment before deploying.

Marine weather still needs your licensed WEATHER_API_KEY. Sample seafood remains clearly marked and cannot be ordered. Genuine seller verification, operational contact details, complete Tamil/Sinhala translations, local policy review and fulfilment arrangements remain operator responsibilities.

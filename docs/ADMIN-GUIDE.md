# Super admin operations

Visit /admin. Sign in with the configured ADMIN_EMAIL and the application password set by `npm run admin:password`. This is independent of the Cloudflare login email. A public member account, a matching email claim, profile role changes and request headers cannot grant admin access.

## Dashboard controls

- Overview: community/order counts, setup status and activity history.
- Users & verification: verify/reset/suspend fishermen. Suspension hides their catches and blocks member writes. Reset access creates a one-time member password reset link; verify ownership before sharing it.
- Products: approve or hide submitted catches. Only verified sellers can have publicly active listings.
- Orders: inspect private fulfilment details, export CSV, advance permitted states or cancel when permitted. Cancellation restores reserved stock once. Changes are audited. This is not a refund/payment processing system.
- Market prices: create/edit/delete dated wholesale/retail references. Leave unreported fields empty; this saves null, not zero. Enter previous values only when reported. CBSL is an accepted official source. A newer report date becomes the public comparison view. The home preview selects four species when those observations are present.
- Official alerts, fishing stations and services: publish reviewed source-backed information. Empty alerts do not imply safe conditions.
- Articles: edit the two supplied stories or create more; manage title, slug, category, excerpt, full text, image and source. Separate paragraphs with a blank line. The homepage shows two published stories. Uncheck Publish to save a draft.
- FAQs: edit questions/answers and their numeric order, publish/draft or delete. Public answers appear in the homepage accordion and /faq.
- Complaints: review support messages, including requests from signed-out members, and mark resolved. Support submissions are stored, not emailed; check the panel regularly.

There is one super admin credential set, managed through Cloudflare secrets. There is no public admin registration and no universal default password. Regular accounts may use Gmail or another email address; these are local application accounts, not Google identities. Seller verification is an operator review, not automatic proof of mailbox ownership or fisheries licensing.

## Price report provenance

Initial values are transcribed from the supplied CBSL Daily Price Report, 15 October 2026, page 2. Seven fish species are listed in three markets. The report PDF is linked from the public price page. Green/red indicators are calculated against reported previous observations. “New report” means the previous observation is unavailable; “Not reported” means the selected current value is unavailable.

These figures are not Sainthamaruthu landing prices, live offers, guaranteed transactions or a predictive price service. Publish each new reference date after checking the report and its market labels. This release does not fetch or parse new PDFs automatically.

## Content and operations

The Sainthamaruthu article is original editorial copy with background source attribution, not a claim of a field interview. Coastal photography is illustrative, not documented as a Sainthamaruthu photograph. Replace with your own location photography when available.

Before inviting customers, complete operator/contact information, delivery/refund procedures, seller review processes, translation review and privacy/retention terms. Populate genuine catches. The illustrative sample products cannot be purchased. Weather and emergency features retain their stated operational limitations.

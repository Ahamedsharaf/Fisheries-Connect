# Configuration

| Setting | Location | Purpose |
| --- | --- | --- |
| name | wrangler.jsonc | Existing Cloudflare Worker name |
| DB | D1 binding | Existing marketplace and account database |
| BUCKET | R2 binding | Catch photos |
| ASSETS | Static Assets binding | Built React app at dist/client |
| APP_URL | vars | Exact real HTTPS application origin |
| ADMIN_EMAIL | vars | Exact email accepted by the separate owner login |
| ADMIN_PASSWORD_HASH | Wrangler secret | Salted scrypt hash set by npm run admin:password |
| WEATHER_API_KEY | Optional Wrangler secret | Licensed Open-Meteo customer API key |

There is no Google OAuth configuration. Old Google secrets are ignored. Never add an unencrypted admin password to this configuration.

`configure` edits nonsecret settings and repairs DB/BUCKET binding names. `admin:password` uses hidden terminal input and uploads the generated hash over the configured Wrangler authorization. `deploy` builds, applies pending D1 migrations and deploys to the same Worker.

The shipped resource settings match the provided screenshots for this deployment. Review the administrator email before setting a password. The website does not send application passwords to an email provider.

Migrations are maintained as SQL files under drizzle/ and applied by Wrangler, in order. The directory name is historical; there is no ORM schema generator dependency. Leave applied SQL files unchanged.

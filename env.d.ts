declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    ASSETS: Fetcher;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD_HASH?: string;
    APP_URL?: string;
    WEATHER_API_KEY?: string;
  }
}

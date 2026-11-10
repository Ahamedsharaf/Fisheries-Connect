import { readFile } from "node:fs/promises";
const c = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
const required = [
  c.name,
  c.d1_databases?.[0]?.database_id,
  c.r2_buckets?.[0]?.bucket_name,
  c.vars?.APP_URL,
  c.vars?.ADMIN_EMAIL,
];
if (required.some((v) => typeof v !== "string" || !v || v.includes("REPLACE_")))
  throw Error(
    "Configuration is incomplete. Run npm run configure before deployment.",
  );
const origin = new URL(c.vars.APP_URL);
if (origin.protocol !== "https:")
  throw Error("APP_URL must use HTTPS in production");
if (
  origin.hostname.includes("your-subdomain") ||
  origin.hostname === "fisheries-connect.workers.dev"
)
  throw Error("Use your actual Worker account subdomain in APP_URL.");
if (
  !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(
    c.d1_databases[0].database_id,
  )
)
  throw Error("Invalid D1 database ID");
if (
  c.d1_databases.length !== 1 ||
  c.d1_databases[0].binding !== "DB" ||
  c.r2_buckets.length !== 1 ||
  c.r2_buckets[0].binding !== "BUCKET"
)
  throw Error("Use DB and BUCKET bindings. Run npm run configure to repair.");
console.log(
  "Configuration checks passed. Set the admin password with npm run admin:password before using /admin.",
);

import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
const r = createInterface({ input: stdin, output: stdout });
try {
  const config = JSON.parse(await readFile("wrangler.jsonc", "utf8"));
  const ask = async (label, current = "") => {
    const v =
      (
        await r.question(
          label +
            (current && !current.includes("REPLACE")
              ? " [" + current + "]"
              : "") +
            ": ",
        )
      ).trim() || (current.includes("REPLACE") ? "" : current);
    if (!v) throw Error("A value is required for " + label);
    return v;
  };
  console.log(
    "Fisheries Connect · Cloudflare setup. This updates configuration, not secrets.",
  );
  const name = await ask(
    "Worker name (lowercase letters, numbers and hyphens)",
    config.name,
  );
  if (!/^[a-z][a-z0-9-]{2,62}$/.test(name)) throw Error("Invalid Worker name");
  config.name = name;
  const db = config.d1_databases?.find((x) => x.binding === "DB") || {};
  const databaseId = await ask(
    "D1 database ID returned by wrangler d1 create",
    db.database_id || "",
  );
  if (!/^[a-f0-9-]{36}$/i.test(databaseId))
    throw Error("Invalid D1 database ID");
  const databaseName = await ask(
    "D1 database name",
    db.database_name || "fisheries-connect-db",
  );
  config.d1_databases = [
    {
      binding: "DB",
      database_id: databaseId,
      database_name: databaseName,
      migrations_dir: "drizzle",
    },
  ];
  const bucket = await ask(
    "R2 bucket name",
    config.r2_buckets?.find((x) => x.binding === "BUCKET")?.bucket_name ||
      "fisheries-connect-photos",
  );
  if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket))
    throw Error("Invalid R2 bucket name");
  config.r2_buckets = [{ binding: "BUCKET", bucket_name: bucket }];
  const origin = new URL(
    await ask(
      "Public application URL (https://...)",
      config.vars?.APP_URL || "",
    ),
  );
  if (origin.protocol !== "https:") throw Error("Public URL must use HTTPS");
  if (
    origin.hostname.includes("your-subdomain") ||
    origin.hostname === "fisheries-connect.workers.dev"
  )
    throw Error("Use the real Worker URL, including your account subdomain.");
  config.vars ||= {};
  config.vars.APP_URL = origin.origin;
  const email = await ask("Admin email address", config.vars.ADMIN_EMAIL || "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw Error("Invalid email");
  config.vars.ADMIN_EMAIL = email;
  delete config.vars.GOOGLE_CLIENT_ID;
  delete config.vars.ADMIN_GOOGLE_SUB;
  await writeFile("wrangler.jsonc", JSON.stringify(config, null, 2) + "\n");
  console.log(
    "\nConfiguration saved.\nNext: npm run admin:password\nThen: npm run deploy\nAdmin login: " +
      origin.origin +
      "/admin",
  );
} finally {
  r.close();
}

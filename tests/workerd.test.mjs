import { test } from "node:test";
import assert from "node:assert/strict";
import { Miniflare } from "miniflare";
import { build } from "esbuild";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

test("Cloudflare runtime executes the real scrypt, D1 registration, admin and logout flows", async () => {
  await build({
    entryPoints: ["worker/index.ts"],
    outfile: ".scratch/workerd-test.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    external: ["cloudflare:workers"],
  });
  // Generate a secret locally, then verify it independently inside workerd.
  const { scryptSync } = await import("node:crypto");
  const salt = "1234567890abcdef1234567890abcdef";
  const hash =
    "scrypt$16384$8$5$" +
    salt +
    "$" +
    scryptSync("Owner integration passphrase 7!", salt, 32, {
      N: 16384,
      r: 8,
      p: 5,
      maxmem: 33554432,
    }).toString("hex");
  const mf = new Miniflare({
    modules: true,
    scriptPath: ".scratch/workerd-test.mjs",
    compatibilityDate: "2026-05-15",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    r2Buckets: ["BUCKET"],
    bindings: { ADMIN_EMAIL: "owner@example.test", ADMIN_PASSWORD_HASH: hash },
  });
  try {
    const db = await mf.getD1Database("DB");
    // SQLite extracts individual SQL statements without naively splitting semicolons in text.
    const source = new DatabaseSync(":memory:");
    for (const f of readdirSync("drizzle")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      source.exec(
        readFileSync("drizzle/" + f, "utf8").replaceAll(
          "--> statement-breakpoint",
          "",
        ),
      );
    for (const row of source
      .prepare(
        "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL AND type='table'",
      )
      .all())
      await db.prepare(row.sql).run();
    for (const row of source.prepare("SELECT * FROM records").all())
      await db
        .prepare("INSERT INTO records VALUES(?,?,?,?)")
        .bind(row.id, row.type, row.data, row.created)
        .run();
    const send = (path, body, cookie = "") =>
      mf.dispatchFetch("https://app.test" + path, {
        method: "POST",
        headers: {
          Origin: "https://app.test",
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
    const registration = await send("/api/auth/register", {
      identity: "crew@example.test",
      username: "crew001",
      name: "Test Crew",
      role: "fisherman",
      password: "A runtime fisherman passphrase!",
    });
    assert.equal(registration.status, 201, await registration.clone().text());
    const login = await send("/api/auth/admin-login", {
      identity: "owner@example.test",
      password: "Owner integration passphrase 7!",
    });
    assert.equal(login.status, 200, await login.clone().text());
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const dashboard = await mf.dispatchFetch(
      "https://app.test/api/app?kind=admin",
      { headers: { Cookie: cookie } },
    );
    assert.equal(dashboard.status, 200);
    assert.ok(
      (await dashboard.json()).records.some((r) => r.type === "article"),
    );
    assert.equal((await send("/api/auth/logout", {}, cookie)).status, 200);
    assert.equal(
      (
        await mf.dispatchFetch("https://app.test/api/app?kind=admin", {
          headers: { Cookie: cookie },
        })
      ).status,
      401,
    );
  } finally {
    await mf.dispose();
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { build } from "esbuild";

const sql = new DatabaseSync(":memory:");
sql.exec("PRAGMA foreign_keys=ON");
for (const name of readdirSync("drizzle")
  .filter((x) => x.endsWith(".sql"))
  .sort())
  sql.exec(
    readFileSync("drizzle/" + name, "utf8").replaceAll(
      "--> statement-breakpoint",
      "",
    ),
  );
class Statement {
  constructor(q, args = []) {
    this.q = q;
    this.args = args;
  }
  bind(...args) {
    return new Statement(this.q, args);
  }
  async first() {
    return sql.prepare(this.q).get(...this.args) || null;
  }
  async all() {
    return { results: sql.prepare(this.q).all(...this.args) };
  }
  async run() {
    return {
      meta: { changes: Number(sql.prepare(this.q).run(...this.args).changes) },
    };
  }
}
const DB = {
  prepare: (q) => new Statement(q),
  batch: async (list) => {
    sql.exec("BEGIN");
    try {
      const r = [];
      for (const s of list) r.push(await s.run());
      sql.exec("COMMIT");
      return r;
    } catch (e) {
      sql.exec("ROLLBACK");
      throw e;
    }
  },
};
globalThis.__passwordEnv = {
  DB,
  ADMIN_EMAIL: "owner@example.test",
  ASSETS: { fetch: () => new Response("static app") },
};
await build({
  entryPoints: ["worker/index.ts", "lib/password.ts"],
  outdir: ".scratch/auth-test",
  bundle: true,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "environment",
      setup(b) {
        b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
          path: "env",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents: "export const env=globalThis.__passwordEnv",
        }));
      },
    },
  ],
});
const worker = (await import("../.scratch/auth-test/worker/index.js")).default;
const { hashPassword, verifyPassword } =
  await import("../.scratch/auth-test/lib/password.js");
let ip = 1;
async function request(path, body = {}, session = "", options = {}) {
  const method = options.method || "POST";
  const r = await worker.fetch(
    new Request("https://app.test" + path, {
      method,
      headers: {
        ...(method === "POST"
          ? {
              "Content-Type": "application/json",
              Origin: options.origin || "https://app.test",
            }
          : {}),
        "CF-Connecting-IP": options.ip || "192.0.2." + ip++,
        ...(session ? { Cookie: session } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
    }),
  );
  let d;
  try {
    d = await r.json();
  } catch {
    d = null;
  }
  return {
    status: r.status,
    data: d,
    cookie: r.headers.get("set-cookie"),
    session: r.headers.get("set-cookie")?.split(";")[0],
    headers: r.headers,
  };
}
let member, admin, accountId;
const password = "A long fishing passphrase 7!";
test("all migrations are additive and initial data is valid", () => {
  assert.equal(
    sql.prepare("SELECT COUNT(*) n FROM records WHERE type='article'").get().n,
    2,
  );
  assert.equal(
    sql.prepare("SELECT COUNT(*) n FROM records WHERE type='faq'").get().n,
    7,
  );
  const rows = sql.prepare("SELECT * FROM records").all();
  for (const row of rows) assert.doesNotThrow(() => JSON.parse(row.data));
  const fish = JSON.parse(
    sql
      .prepare(
        "SELECT data FROM records WHERE id='cbsl-20261015-kelawalla-negombo'",
      )
      .get().data,
  );
  assert.equal(fish.wholesale, 95000);
  assert.equal(fish.retail, 176000);
  assert.equal(fish.previousRetail, 195000);
  assert.equal(
    JSON.parse(
      sql
        .prepare(
          "SELECT data FROM records WHERE id='cbsl-20261015-balaya-negombo'",
        )
        .get().data,
    ).retail,
    null,
  );
});
test("native scrypt uses unique salts, enforces length and verifies safely", async () => {
  const a = await hashPassword(password),
    b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.ok(await verifyPassword(password, a));
  assert.equal(await verifyPassword("wrong password", a), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
  await assert.rejects(hashPassword("short"));
  globalThis.__passwordEnv.ADMIN_PASSWORD_HASH = await hashPassword(
    "Owner private passphrase 99!",
  );
});
test("Google endpoints have been removed and forged identity headers do not grant admin", async () => {
  assert.equal(
    (await request("/auth/login", {}, "", { method: "GET" })).status,
    404,
  );
  assert.equal(
    (await request("/auth/callback", {}, "", { method: "GET" })).status,
    404,
  );
  const r = await worker.fetch(
    new Request("https://app.test/api/app?kind=admin", {
      headers: { "oai-authenticated-email": "owner@example.test" },
    }),
  );
  assert.equal(r.status, 401);
});
test("registration rejects cross-origin writes and weak or reserved credentials", async () => {
  const fields = {
    identity: "fisher@example.test",
    username: "fisher1",
    name: "Local Fisher",
    password,
    role: "fisherman",
  };
  assert.equal(
    (
      await request("/api/auth/register", fields, "", {
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/auth/register", { ...fields, password: "short" }))
      .status,
    400,
  );
  assert.equal(
    (
      await request("/api/auth/register", {
        ...fields,
        identity: "owner@example.test",
      })
    ).status,
    400,
  );
});
test("registration persists a fisherman and creates an opaque secure session", async () => {
  const r = await request("/api/auth/register", {
    identity: "fisher@example.test",
    username: "fisher1",
    name: "Local Fisher",
    password,
    role: "fisherman",
    isAdmin: true,
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.returnTo, "/portal/profile");
  assert.match(r.cookie, /HttpOnly/);
  assert.match(r.cookie, /Secure/);
  assert.match(r.cookie, /SameSite=Lax/);
  member = r.session;
  const account = sql
    .prepare("SELECT * FROM local_accounts WHERE username='fisher1'")
    .get();
  accountId = account.id;
  assert.notEqual(account.password_hash, password);
  const session = sql.prepare("SELECT * FROM local_sessions").get();
  assert.ok(!member.includes(session.token_hash));
  const me = (
    await request("/api/app?kind=bootstrap", {}, member, { method: "GET" })
  ).data.me;
  assert.equal(me.role, "fisherman");
  assert.equal(me.isAdmin, false);
});
test("ordinary sessions cannot read admin or publish articles and duplicate accounts fail", async () => {
  assert.notEqual(
    (await request("/api/app?kind=admin", {}, member, { method: "GET" }))
      .status,
    200,
  );
  assert.notEqual(
    (
      await request(
        "/api/app",
        {
          action: "record",
          type: "faq",
          data: { question: "bad", answer: "not authorized" },
        },
        member,
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/auth/register", {
        identity: "FISHER@example.test",
        username: "another",
        name: "Another Person",
        password,
      })
    ).status,
    400,
  );
});
test("email and username login both work and reject incorrect passwords", async () => {
  assert.equal(
    (
      await request("/api/auth/login", {
        identity: "fisher1",
        password: "incorrect password",
      })
    ).status,
    401,
  );
  const r = await request("/api/auth/login", {
    identity: "FISHER1",
    password,
    returnTo: "https://evil.test",
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.returnTo, "/");
  member = r.session;
  assert.equal(
    (
      await request("/api/auth/login", {
        identity: "fisher@example.test",
        password,
      })
    ).status,
    200,
  );
});
test("only separate owner credentials can establish a super admin session", async () => {
  assert.equal(
    (
      await request("/api/auth/admin-login", {
        identity: "owner@example.test",
        password,
      })
    ).status,
    401,
  );
  const r = await request("/api/auth/admin-login", {
    identity: "OWNER@example.test",
    password: "Owner private passphrase 99!",
  });
  assert.equal(r.status, 200);
  admin = r.session;
  const dashboard = await request("/api/app?kind=admin", {}, admin, {
    method: "GET",
  });
  assert.equal(dashboard.status, 200);
  assert.equal(
    dashboard.data.records.filter((r) => r.type === "price").length,
    21,
  );
});
test("admin can draft and publish articles and FAQs with public filtering", async () => {
  const article = {
    title: "Community story",
    slug: "community-story",
    category: "COAST",
    excerpt: "A brief description for the community.",
    body: "A community story with enough content to test publication.",
    image: "/images/tuna.png",
    source: "",
    published: false,
  };
  assert.equal(
    (
      await request(
        "/api/app",
        { action: "record", id: undefined, type: "article", data: article },
        admin,
      )
    ).status,
    200,
  );
  let rows = (
    await request("/api/app?kind=bootstrap", {}, "", { method: "GET" })
  ).data.records;
  assert.ok(!rows.some((r) => r.data.slug === "community-story"));
  const row = sql
    .prepare(
      "SELECT id FROM records WHERE type='article' AND data LIKE '%community-story%'",
    )
    .get();
  assert.equal(
    (
      await request(
        "/api/app",
        {
          action: "record",
          id: row.id,
          type: "article",
          data: { ...article, published: true },
        },
        admin,
      )
    ).status,
    200,
  );
  rows = (await request("/api/app?kind=bootstrap", {}, "", { method: "GET" }))
    .data.records;
  assert.ok(rows.some((r) => r.data.slug === "community-story"));
  assert.equal(
    (
      await request(
        "/api/app",
        {
          action: "record",
          type: "faq",
          data: {
            question: "A new question?",
            answer: "A complete answer for our visitors.",
            order: 99,
            published: true,
          },
        },
        admin,
      )
    ).status,
    200,
  );
});
test("CBSL is accepted as official source and nullable prices stay unavailable", async () => {
  assert.equal(
    (
      await request(
        "/api/app",
        {
          action: "record",
          type: "price",
          data: {
            name: "Test",
            market: "Negombo",
            wholesale: 10000,
            retail: null,
            date: "2026-10-15",
            source:
              "https://www.cbsl.gov.lk/en/statistics/economic-indicators/price-report",
          },
        },
        admin,
      )
    ).status,
    200,
  );
});
test("support requests work without signing in and remain private", async () => {
  assert.equal(
    (
      await request("/api/auth/help", {
        identity: "help@example.test",
        name: "Lost Access",
        message: "I need help recovering my account.",
      })
    ).status,
    200,
  );
  const rows = (
    await request("/api/app?kind=bootstrap", {}, "", { method: "GET" })
  ).data.records;
  assert.ok(!rows.some((r) => r.type === "complaint"));
});
test("member password changes revoke prior sessions", async () => {
  const old = member;
  const r = await request(
    "/api/auth/change-password",
    { password, newPassword: "A changed fishing passphrase 8!" },
    member,
  );
  assert.equal(r.status, 200);
  member = r.session;
  assert.equal(
    (await request("/api/app?kind=bootstrap", {}, old, { method: "GET" })).data
      .me,
    null,
  );
  assert.ok(
    (await request("/api/app?kind=bootstrap", {}, member, { method: "GET" }))
      .data.me,
  );
});
test("admin-assisted resets are one-time and revoke member sessions", async () => {
  assert.equal(
    (await request("/api/auth/reset-link", { id: accountId }, member)).status,
    403,
  );
  const r = await request("/api/auth/reset-link", { id: accountId }, admin);
  assert.equal(r.status, 200);
  const token = new URLSearchParams(new URL(r.data.url).hash.slice(1)).get(
    "token",
  );
  assert.ok(token);
  assert.notEqual(
    sql.prepare("SELECT token_hash FROM local_password_resets").get()
      .token_hash,
    token,
  );
  assert.equal(
    (
      await request("/api/auth/reset", {
        token,
        password: "A recovered fishing passphrase 9!",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/auth/reset", {
        token,
        password: "A recovered fishing passphrase 9!",
      })
    ).status,
    400,
  );
  assert.equal(
    (await request("/api/app?kind=bootstrap", {}, member, { method: "GET" }))
      .data.me,
    null,
  );
});
test("suspended members cannot log in", async () => {
  sql
    .prepare("UPDATE profiles SET verification='suspended' WHERE id=?")
    .run(accountId);
  assert.equal(
    (
      await request("/api/auth/login", {
        identity: "fisher1",
        password: "A recovered fishing passphrase 9!",
      })
    ).status,
    403,
  );
});
test("logout is POST-only with origin protection and revokes the session", async () => {
  assert.equal(
    (await request("/api/auth/logout", {}, admin, { method: "GET" })).status,
    405,
  );
  assert.equal(
    (
      await request("/api/auth/logout", {}, admin, {
        origin: "https://evil.test",
      })
    ).status,
    403,
  );
  assert.equal((await request("/api/auth/logout", {}, admin)).status, 200);
  assert.equal(
    (await request("/api/app?kind=bootstrap", {}, admin, { method: "GET" }))
      .data.me,
    null,
  );
});
test("rotating admin credentials invalidates existing owner sessions", async () => {
  const r = await request("/api/auth/admin-login", {
    identity: "owner@example.test",
    password: "Owner private passphrase 99!",
  });
  globalThis.__passwordEnv.ADMIN_PASSWORD_HASH = await hashPassword(
    "A new owner passphrase 100!",
  );
  assert.equal(
    (await request("/api/app?kind=bootstrap", {}, r.session, { method: "GET" }))
      .data.me,
    null,
  );
});
test("persistent rate limiting prevents repeated password guesses", async () => {
  let last;
  for (let i = 0; i < 13; i++)
    last = await request(
      "/api/auth/login",
      { identity: "nonexistent", password: "incorrect" },
      "",
      { ip: "203.0.113.1" },
    );
  assert.equal(last.status, 429);
  assert.equal(last.headers.get("Retry-After"), "900");
});

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { build } from "esbuild";
import assert from "node:assert/strict";
const sql = new DatabaseSync(":memory:");
sql.exec("PRAGMA foreign_keys=ON");
sql.exec(
  readFileSync("drizzle/0000_productive_shaman.sql", "utf8").replaceAll(
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
  async run() {
    return {
      meta: { changes: Number(sql.prepare(this.q).run(...this.args).changes) },
    };
  }
  async all() {
    return { results: sql.prepare(this.q).all(...this.args) };
  }
  async first() {
    return sql.prepare(this.q).get(...this.args) || null;
  }
}
const DB = {
  prepare: (q) => new Statement(q),
  batch: async (list) => {
    sql.exec("BEGIN");
    try {
      const result = [];
      for (const s of list) result.push(await s.run());
      sql.exec("COMMIT");
      return result;
    } catch (e) {
      sql.exec("ROLLBACK");
      throw e;
    }
  },
};
globalThis.__env = { DB, ADMIN_EMAIL: "admin@example.test" };
globalThis.__user = null;
await build({
  entryPoints: ["worker/api.ts"],
  outfile: ".scratch/api-test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  plugins: [
    {
      name: "test-runtime",
      setup(b) {
        b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
          path: "env",
          namespace: "test",
        }));
        b.onResolve({ filter: /auth\/session$/ }, () => ({
          path: "auth",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, (a) => ({
          contents:
            a.path === "env"
              ? "export const env=globalThis.__env"
              : "export async function getCurrentUser(){return globalThis.__user}",
          loader: "js",
        }));
      },
    },
  ],
});
const api = await import("../.scratch/api-test.mjs");
const actor = (id, email = id + "@example.test") =>
  (globalThis.__user = {
    userId: id,
    displayName: id,
    email,
    isAdmin: email === "admin@example.test",
  });
async function get(kind = "bootstrap") {
  const r = await api.GET(
    new Request("https://test.local/api/app?kind=" + kind),
  );
  return { status: r.status, data: await r.json() };
}
async function post(body, origin = "https://test.local") {
  const r = await api.POST(
    new Request("https://test.local/api/app", {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return { status: r.status, data: await r.json() };
}
let n = 0;
const check = (x, label) => {
  assert.ok(x, label);
  console.log("PASS", label);
  n++;
};
check(
  (await post({ action: "expense" })).status === 401,
  "Anonymous write rejected",
);
actor("seller");
await get();
check((await get("admin")).status !== 200, "Non-admin cannot read operations");
check(
  (await post({ action: "verify", id: "seller", status: "verified" }))
    .status !== 200,
  "Seller cannot self-verify",
);
check(
  (await post({ action: "profile" }, "https://evil.test")).status !== 200,
  "Cross-origin mutation rejected",
);
check(
  (
    await post({
      action: "profile",
      name: "Seller",
      phone: "+94770000000",
      district: "Negombo",
      harbor: "Test harbour",
      vessel: "Test boat",
      role: "fisherman",
      delivery: true,
      deliveryFee: 35000,
      contacts: [],
    })
  ).status === 200,
  "Fisherman profile saved",
);
const listing = {
  action: "listing",
  name: "Test tuna",
  category: "Fish",
  description: "Fresh catch for transaction testing",
  image: "/images/tuna.png",
  price: 240000,
  stock: 2000,
  cleaning: 10000,
  district: "Negombo",
  landed: "2026-10-14",
};
check((await post(listing)).status === 200, "Pending listing created");
const lid = sql.prepare("SELECT id FROM listings").get().id;
check((await get()).data.listings.length === 0, "Pending seller is not public");
actor("admin", "admin@example.test");
await get();
check(
  (await post({ action: "moderate", id: lid, status: "active" })).status !==
    200,
  "Unverified listing approval rejected",
);
check(
  (await post({ action: "verify", id: "seller", status: "verified" }))
    .status === 200,
  "Admin verifies seller",
);
check(
  (await post({ action: "moderate", id: lid, status: "active" })).status ===
    200,
  "Admin approves catch",
);
actor("buyer");
await get();
check(
  (await get()).data.listings.length === 1,
  "Verified catch available publicly",
);
const body = {
  action: "checkout",
  items: [{ id: lid, grams: 1000, preparation: "Cleaned" }],
  method: "delivery",
  address: "12 Test Road, Negombo",
  phone: "+94771111111",
  name: "Buyer",
  key: crypto.randomUUID(),
};
const order = await post(body);
check(order.status === 200, "Order persisted");
check(
  order.data.total === 285000,
  "Price, preparation and delivery computed server-side",
);
check(
  sql.prepare("SELECT stock FROM listings WHERE id=?").get(lid).stock === 1000,
  "Stock reserved atomically",
);
check(
  (await post(body)).data.id === order.data.id &&
    sql.prepare("SELECT count(*) n FROM orders").get().n === 1,
  "Retry does not duplicate order",
);
check(
  (
    await post({
      ...body,
      key: crypto.randomUUID(),
      items: [{ id: lid, grams: 2000, preparation: "Whole" }],
    })
  ).status !== 200,
  "Overselling rejected",
);
check(
  (
    await post({
      action: "review",
      orderId: order.data.id,
      rating: 5,
      comment: "Great catch",
    })
  ).status !== 200,
  "Review before completion rejected",
);
actor("intruder");
await get();
check(
  (await get("workspace")).data.orders.length === 0,
  "Other accounts cannot read order details",
);
check(
  (await post({ action: "orderStatus", id: order.data.id, status: "accepted" }))
    .status !== 200,
  "Other accounts cannot mutate orders",
);
actor("seller");
check(
  (
    await post({
      action: "orderStatus",
      id: order.data.id,
      status: "completed",
    })
  ).status !== 200,
  "Invalid status jump rejected",
);
for (const status of ["accepted", "preparing", "ready", "completed"])
  check(
    (await post({ action: "orderStatus", id: order.data.id, status }))
      .status === 200,
    "Order advances to " + status,
  );
actor("buyer");
check(
  (
    await post({
      action: "review",
      orderId: order.data.id,
      rating: 5,
      comment: "Great catch",
    })
  ).status === 200,
  "Completed buyer can review",
);
check(
  (
    await post({
      action: "review",
      orderId: order.data.id,
      rating: 4,
      comment: "Duplicate",
    })
  ).status !== 200,
  "Duplicate review rejected",
);
const second = await post({
  ...body,
  key: crypto.randomUUID(),
  method: "pickup",
  items: [{ id: lid, grams: 500, preparation: "Whole" }],
});
check(second.status === 200, "Second order created");
check(
  (
    await post({
      action: "orderStatus",
      id: second.data.id,
      status: "cancelled",
    })
  ).status === 200,
  "Buyer can cancel awaiting order",
);
check(
  sql.prepare("SELECT stock FROM listings WHERE id=?").get(lid).stock === 1000,
  "Cancellation restores stock",
);
check(
  (
    await post({
      action: "orderStatus",
      id: second.data.id,
      status: "cancelled",
    })
  ).status !== 200,
  "Repeated cancellation rejected",
);
actor("seller");
check(
  (await post({ ...body, key: crypto.randomUUID() })).status !== 200,
  "Seller cannot order own catch",
);
actor("admin", "admin@example.test");
check(
  (
    await post({
      action: "record",
      type: "price",
      data: {
        name: "Tuna",
        market: "Negombo",
        wholesale: 100,
        retail: 200,
        date: "2026-10-14",
        source: "https://untrusted.test/report",
      },
    })
  ).status !== 200,
  "Untrusted official-price source rejected",
);
check(
  (await post({ action: "verify", id: "seller", status: "suspended" }))
    .status === 200,
  "Admin suspends seller",
);
actor("seller");
check((await post(listing)).status !== 200, "Suspended seller cannot write");
actor("buyer");
check(
  (await get()).data.listings.length === 0,
  "Suspended catch removed from catalogue",
);
const count = sql.prepare("SELECT count(*) n FROM orders").get().n;
try {
  await DB.batch([
    DB.prepare(
      "INSERT INTO orders VALUES('rollback','buyer','seller','awaiting',100,0,'pickup','','1234567','Test','2026-10-14','rollback')",
    ),
    DB.prepare(
      "UPDATE listings SET stock=CASE WHEN stock>=99999 THEN stock-99999 ELSE NULL END WHERE id=?",
    ).bind(lid),
  ]);
} catch {}
check(
  sql.prepare("SELECT count(*) n FROM orders").get().n === count,
  "Failed stock validation rolls back full order",
);
console.log(n + " critical API checks passed");

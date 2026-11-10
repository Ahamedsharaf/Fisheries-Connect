import { env } from "cloudflare:workers";
import { getCurrentUser } from "./auth/session";
import { z } from "zod";
import { districts, categories, subtotal, nextStates } from "../lib/domain";

const db = () => {
  if (!env.DB) throw Error("Storage unavailable");
  return env.DB;
};
const s = (q: string, ...v: any[]) =>
  db()
    .prepare(q)
    .bind(...v);
const one = async (q: string, ...v: any[]) => s(q, ...v).first<any>();
const all = async (q: string, ...v: any[]) =>
  (await s(q, ...v).all()).results as any[];
const out = (data: any, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const uid = () => crypto.randomUUID(),
  now = () => new Date().toISOString();
const txt = z.string().trim().min(1).max(200),
  amount = z.number().int().min(0).max(100000000),
  phone = z.string().regex(/^[+\d\s()-]{7,20}$/, "Enter a valid phone number"),
  url = z
    .string()
    .url()
    .refine((x) => x.startsWith("https://"), "Use an HTTPS source");
const assert = (v: any, m: string) => {
  if (!v) throw Error(m);
};
async function user(req: Request) {
  const u = await getCurrentUser(req);
  if (!u) return null;
  await s(
    "INSERT OR IGNORE INTO profiles(id,name,email,created) VALUES(?,?,?,?)",
    u.userId,
    u.displayName,
    u.email,
    now(),
  ).run();
  const p = await one("SELECT * FROM profiles WHERE id=?", u.userId);
  return { ...p, isAdmin: u.isAdmin };
}
async function log(actor: string, action: string, target: string) {
  await s(
    "INSERT INTO audit VALUES(?,?,?,?,?)",
    uid(),
    actor,
    action,
    target,
    now(),
  ).run();
}
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams,
      kind = q.get("kind") || "bootstrap";
    if (kind === "weather") {
      if (!env.WEATHER_API_KEY)
        return out({
          available: false,
          message:
            "Marine forecasts are not connected yet. Check official advisories before departure.",
        });
      const coords: Record<string, number[]> = {
        Negombo: [7.2, 79.7],
        Kalmunai: [7.4, 81.9],
        Sainthamaruthu: [7.39, 81.88],
        Colombo: [6.9, 79.7],
        Beruwala: [6.5, 79.9],
        Galle: [6, 80.1],
        Matara: [5.9, 80.5],
        Trincomalee: [8.6, 81.3],
        Batticaloa: [7.7, 81.8],
        Jaffna: [9.7, 80],
        Chilaw: [7.6, 79.7],
      };
      const point = coords[q.get("city") || "Negombo"];
      assert(point, "Choose a supported location");
      const [lat, lon] = point,
        key = encodeURIComponent(env.WEATHER_API_KEY);
      const results = await Promise.all([
        fetch(
          `https://customer-marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_period,wave_direction&timezone=Asia%2FColombo&apikey=${key}`,
          { signal: AbortSignal.timeout(8000) },
        ),
        fetch(
          `https://customer-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m&timezone=Asia%2FColombo&apikey=${key}`,
          { signal: AbortSignal.timeout(8000) },
        ),
      ]);
      if (results.some((r) => !r.ok))
        return out({
          available: false,
          message:
            "Forecast provider unavailable. Check the official marine advisory.",
        });
      return out({
        available: true,
        marine: await results[0].json(),
        weather: await results[1].json(),
        retrieved: now(),
      });
    }
    const me = await user(req);
    if (kind === "bootstrap")
      return out({
        me: me ? { ...me, contacts: JSON.parse(me.contacts) } : null,
        listings: await all(
          "SELECT l.*,p.name seller FROM listings l JOIN profiles p ON p.id=l.seller_id WHERE l.status='active' AND p.verification='verified' AND l.stock>0 ORDER BY l.created DESC LIMIT 300",
        ),
        sellers: await all(
          "SELECT id,name,district,harbor,vessel,delivery,delivery_fee FROM profiles WHERE role='fisherman' AND verification='verified'",
        ),
        records: (
          await all(
            "SELECT * FROM records WHERE type!='complaint' ORDER BY created DESC",
          )
        )
          .map((r) => ({ ...r, data: JSON.parse(r.data) }))
          .filter((r) => r.data.published !== false),
        reviews: await all(
          "SELECT r.seller_id,r.rating,r.comment,r.created,p.name buyer FROM reviews r JOIN profiles p ON p.id=r.buyer_id ORDER BY r.created DESC LIMIT 200",
        ),
        cart: me
          ? JSON.parse(
              (await one("SELECT data FROM carts WHERE user_id=?", me.id))
                ?.data || "[]",
            )
          : [],
      });
    if (!me) return out({ error: "Sign in to continue" }, 401);
    assert(
      me.verification !== "suspended" || me.isAdmin,
      "Your account is suspended",
    );
    if (kind === "workspace") {
      const orders = await all(
          "SELECT * FROM orders WHERE buyer_id=? OR seller_id=? ORDER BY created DESC",
          me.id,
          me.id,
        ),
        items = await all(
          "SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.buyer_id=? OR o.seller_id=?",
          me.id,
          me.id,
        );
      return out({
        orders: orders.map((o) => ({
          ...o,
          items: items.filter((i) => i.order_id === o.id),
        })),
        listings: await all(
          "SELECT * FROM listings WHERE seller_id=? ORDER BY created DESC",
          me.id,
        ),
        expenses: await all(
          "SELECT * FROM expenses WHERE user_id=? ORDER BY date DESC",
          me.id,
        ),
        reviews: await all("SELECT * FROM reviews WHERE buyer_id=?", me.id),
      });
    }
    if (kind === "admin") {
      assert(me.isAdmin, "Administrator access required");
      return out({
        profiles: await all(
          "SELECT id,name,email,phone,district,harbor,vessel,role,verification FROM profiles",
        ),
        listings: await all(
          "SELECT l.*,p.name seller FROM listings l JOIN profiles p ON p.id=l.seller_id",
        ),
        orders: await all("SELECT * FROM orders ORDER BY created DESC"),
        records: (await all("SELECT * FROM records ORDER BY created DESC")).map(
          (r) => ({ ...r, data: JSON.parse(r.data) }),
        ),
        audit: await all("SELECT * FROM audit ORDER BY created DESC LIMIT 50"),
        weatherConfigured: !!env.WEATHER_API_KEY,
      });
    }
    return out({ error: "Not found" }, 404);
  } catch (e) {
    return out(
      { error: e instanceof Error ? e.message : "Unable to load" },
      400,
    );
  }
}
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    assert(origin === new URL(req.url).origin, "Cross-origin request rejected");
    const raw = await req.text();
    assert(raw.length < 100000, "Request too large");
    const b = z.record(z.any()).parse(JSON.parse(raw)),
      me = await user(req);
    if (!me) return out({ error: "Sign in to continue" }, 401);
    assert(
      me.verification !== "suspended" || me.isAdmin,
      "Your account is suspended",
    );
    const a = b.action;
    if (a === "profile") {
      const p = z
        .object({
          name: txt,
          phone,
          district: z.enum(districts as [string, ...string[]]),
          harbor: z.string().max(160),
          vessel: z.string().max(160),
          role: z.enum(["consumer", "fisherman"]),
          delivery: z.boolean(),
          deliveryFee: amount,
          contacts: z.array(z.object({ name: txt, phone })).max(5),
        })
        .parse(b);
      await s(
        "UPDATE profiles SET name=?,phone=?,district=?,harbor=?,vessel=?,role=?,delivery=?,delivery_fee=?,contacts=? WHERE id=?",
        p.name,
        p.phone,
        p.district,
        p.harbor,
        p.vessel,
        p.role,
        p.delivery ? 1 : 0,
        p.deliveryFee,
        JSON.stringify(p.contacts),
        me.id,
      ).run();
      return out({ ok: true });
    }
    const cartSchema = z
      .array(
        z.object({
          id: txt,
          grams: z.number().int().min(250).max(1000000),
          preparation: z.enum(["Whole", "Cleaned", "Cut"]),
        }),
      )
      .max(30);
    if (a === "cart") {
      const items = cartSchema.parse(b.items);
      await s(
        "INSERT INTO carts VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data",
        me.id,
        JSON.stringify(items),
      ).run();
      return out({ ok: true });
    }
    if (a === "listing") {
      assert(me.role === "fisherman", "Choose Fisherman in your profile first");
      const p = z
        .object({
          id: z.string().optional(),
          name: txt,
          category: z.enum(categories as [string, ...string[]]),
          description: z.string().min(10).max(2000),
          image: z
            .string()
            .regex(
              /^\/(images\/[a-z-]+\.png|api\/media\?key=[a-zA-Z0-9_./-]+)$/,
            ),
          price: amount.refine((v) => v > 0),
          stock: z.number().int().min(0).max(10000000),
          cleaning: amount,
          district: z.enum(districts as [string, ...string[]]),
          landed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .parse(b);
      assert(
        p.landed <= now().slice(0, 10),
        "Landing date cannot be in the future",
      );
      if (p.id) {
        assert(
          (await one("SELECT seller_id FROM listings WHERE id=?", p.id))
            ?.seller_id === me.id,
          "Listing not found",
        );
        await s(
          "UPDATE listings SET name=?,category=?,description=?,image=?,price=?,stock=?,cleaning=?,district=?,landed=?,status='pending' WHERE id=?",
          p.name,
          p.category,
          p.description,
          p.image,
          p.price,
          p.stock,
          p.cleaning,
          p.district,
          p.landed,
          p.id,
        ).run();
      } else
        await s(
          "INSERT INTO listings VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
          uid(),
          me.id,
          p.name,
          p.category,
          p.description,
          p.image,
          p.price,
          p.stock,
          p.cleaning,
          p.district,
          p.landed,
          "pending",
          now(),
        ).run();
      return out({ ok: true });
    }
    if (a === "hideListing") {
      assert(
        (await one("SELECT seller_id FROM listings WHERE id=?", b.id))
          ?.seller_id === me.id,
        "Listing not found",
      );
      await s("UPDATE listings SET status='hidden' WHERE id=?", b.id).run();
      return out({ ok: true });
    }
    if (a === "checkout") {
      const p = z
        .object({
          items: cartSchema.refine((v) => v.length > 0),
          method: z.enum(["pickup", "delivery"]),
          address: z.string().max(1000),
          phone,
          name: txt,
          key: z.string().uuid(),
        })
        .parse(b);
      const existing = await one(
        "SELECT id,buyer_id FROM orders WHERE request_key=?",
        p.key,
      );
      if (existing) {
        assert(existing.buyer_id === me.id, "Invalid request key");
        return out({ ok: true, id: existing.id });
      }
      assert(
        new Set(p.items.map((i) => i.id)).size === p.items.length,
        "Duplicate products",
      );
      const products = [];
      for (const item of p.items) {
        const l = await one(
          "SELECT l.*,p.verification,p.delivery,p.delivery_fee FROM listings l JOIN profiles p ON p.id=l.seller_id WHERE l.id=?",
          item.id,
        );
        assert(
          l && l.status === "active" && l.verification === "verified",
          "Product unavailable",
        );
        assert(l.stock >= item.grams, "Not enough stock");
        products.push({
          ...l,
          grams: item.grams,
          preparation: item.preparation,
        });
      }
      const seller = products[0].seller_id;
      assert(
        products.every((l) => l.seller_id === seller),
        "One seller per checkout",
      );
      assert(seller !== me.id, "You cannot buy your own catch");
      assert(
        p.method === "pickup" || products[0].delivery,
        "Seller offers pickup only",
      );
      assert(
        p.method === "pickup" || p.address.trim().length >= 10,
        "Enter a complete delivery address",
      );
      const fee = p.method === "delivery" ? products[0].delivery_fee : 0,
        oid = uid(),
        total =
          fee +
          products.reduce(
            (sum, l) =>
              sum +
              subtotal(
                l.price,
                l.preparation === "Whole" ? 0 : l.cleaning,
                l.grams,
              ),
            0,
          );
      const batch = [
        s(
          "INSERT INTO orders VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
          oid,
          me.id,
          seller,
          "awaiting",
          total,
          fee,
          p.method,
          p.address,
          p.phone,
          p.name,
          now(),
          p.key,
        ),
      ];
      for (const l of products) {
        batch.push(
          s(
            "UPDATE listings SET stock=CASE WHEN stock>=? AND price=? AND status='active' AND seller_id=? AND cleaning=? AND EXISTS(SELECT 1 FROM profiles WHERE id=listings.seller_id AND verification='verified' AND delivery=? AND delivery_fee=?) THEN stock-? ELSE NULL END WHERE id=?",
            l.grams,
            l.price,
            l.seller_id,
            l.cleaning,
            l.delivery,
            l.delivery_fee,
            l.grams,
            l.id,
          ),
        );
        batch.push(
          s(
            "INSERT INTO order_items VALUES(?,?,?,?,?,?,?,?,?)",
            uid(),
            oid,
            l.id,
            l.name,
            l.grams,
            l.price,
            l.preparation === "Whole" ? 0 : l.cleaning,
            l.preparation,
            subtotal(
              l.price,
              l.preparation === "Whole" ? 0 : l.cleaning,
              l.grams,
            ),
          ),
        );
      }
      batch.push(s("DELETE FROM carts WHERE user_id=?", me.id));
      await db().batch(batch);
      return out({ ok: true, id: oid, total });
    }
    if (a === "orderStatus") {
      const o = await one("SELECT * FROM orders WHERE id=?", b.id);
      assert(
        o && (o.buyer_id === me.id || o.seller_id === me.id || me.isAdmin),
        "Order not found",
      );
      assert(
        nextStates(o.status, !me.isAdmin && o.buyer_id === me.id).includes(
          b.status,
        ),
        "Invalid order transition",
      );
      const updates = [
        s(
          "UPDATE orders SET status=CASE WHEN status=? THEN ? ELSE NULL END WHERE id=?",
          o.status,
          b.status,
          o.id,
        ),
      ];
      if (b.status === "cancelled")
        updates.push(
          s(
            "UPDATE listings SET stock=stock+(SELECT SUM(grams) FROM order_items WHERE listing_id=listings.id AND order_id=?) WHERE id IN(SELECT listing_id FROM order_items WHERE order_id=?)",
            o.id,
            o.id,
          ),
        );
      const results = await db().batch(updates);
      assert(results[0].meta.changes === 1, "Order changed. Refresh and retry");
      if (me.isAdmin) await log(me.id, "order:" + b.status, o.id);
      return out({ ok: true });
    }
    if (a === "review") {
      const p = z
          .object({
            orderId: txt,
            rating: z.number().int().min(1).max(5),
            comment: z.string().min(3).max(1000),
          })
          .parse(b),
        o = await one("SELECT * FROM orders WHERE id=?", p.orderId);
      assert(
        o?.buyer_id === me.id && o.status === "completed",
        "Complete your purchase before reviewing",
      );
      assert(
        !(await one("SELECT id FROM reviews WHERE order_id=?", p.orderId)),
        "Order already reviewed",
      );
      await s(
        "INSERT INTO reviews VALUES(?,?,?,?,?,?,?)",
        uid(),
        o.id,
        me.id,
        o.seller_id,
        p.rating,
        p.comment,
        now(),
      ).run();
      return out({ ok: true });
    }
    if (a === "expense") {
      assert(me.role === "fisherman", "Fisherman account required");
      const p = z
        .object({
          description: txt,
          amount: amount.refine((v) => v > 0),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        })
        .parse(b);
      await s(
        "INSERT INTO expenses VALUES(?,?,?,?,?)",
        uid(),
        me.id,
        p.description,
        p.amount,
        p.date,
      ).run();
      return out({ ok: true });
    }
    if (a === "deleteExpense") {
      await s(
        "DELETE FROM expenses WHERE id=? AND user_id=?",
        b.id,
        me.id,
      ).run();
      return out({ ok: true });
    }
    if (a === "complaint") {
      const p = z
        .object({
          subject: txt,
          message: z.string().min(10).max(2000),
          orderId: z.string().max(100),
        })
        .parse(b);
      if (p.orderId) {
        const o = await one("SELECT * FROM orders WHERE id=?", p.orderId);
        assert(
          o && (o.buyer_id === me.id || o.seller_id === me.id),
          "Order not found",
        );
      }
      await s(
        "INSERT INTO records VALUES(?,?,?,?)",
        uid(),
        "complaint",
        JSON.stringify({
          ...p,
          userId: me.id,
          email: me.email,
          status: "open",
        }),
        now(),
      ).run();
      return out({ ok: true });
    }
    assert(me.isAdmin, "Administrator access required");
    if (a === "verify") {
      const status = z
        .enum(["verified", "pending", "suspended"])
        .parse(b.status);
      await s(
        "UPDATE profiles SET verification=? WHERE id=?",
        status,
        b.id,
      ).run();
      await log(me.id, "profile:" + status, b.id);
      return out({ ok: true });
    }
    if (a === "moderate") {
      const status = z.enum(["active", "pending", "hidden"]).parse(b.status),
        l = await one(
          "SELECT l.*,p.verification FROM listings l JOIN profiles p ON p.id=l.seller_id WHERE l.id=?",
          b.id,
        );
      assert(l, "Listing not found");
      assert(
        status !== "active" || l.verification === "verified",
        "Verify seller first",
      );
      await s("UPDATE listings SET status=? WHERE id=?", status, b.id).run();
      await log(me.id, "listing:" + status, b.id);
      return out({ ok: true });
    }
    if (a === "record") {
      const type = z
          .enum(["price", "alert", "station", "service", "article", "faq"])
          .parse(b.type),
        schemas: any = {
          price: z.object({
            name: txt,
            market: txt,
            wholesale: amount.nullable(),
            retail: amount.nullable(),
            previousWholesale: amount.nullable().optional(),
            previousRetail: amount.nullable().optional(),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            source: url,
          }),
          article: z.object({
            title: txt,
            slug: z
              .string()
              .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
              .max(100),
            category: txt,
            excerpt: z.string().min(10).max(350),
            body: z.string().min(30).max(12000),
            image: z.enum([
              "/images/ocean-hero.png",
              "/images/tuna.png",
              "/images/prawns.png",
              "/images/crab.png",
              "/images/squid.png",
            ]),
            source: url.optional().or(z.literal("")),
            published: z.boolean().default(true),
          }),
          faq: z.object({
            question: txt,
            answer: z.string().min(10).max(2000),
            order: z.number().int().min(0).max(1000),
            published: z.boolean().default(true),
          }),
          alert: z.object({
            title: txt,
            area: txt,
            severity: z.enum(["Advisory", "Warning", "Severe"]),
            details: z.string().min(10).max(5000),
            issued: txt,
            expires: txt,
            authority: txt,
            source: url,
          }),
          station: z.object({
            name: txt,
            district: txt,
            address: txt,
            phone: z.string().max(30),
            services: txt,
            source: url,
          }),
          service: z.object({
            name: txt,
            district: txt,
            category: txt,
            phone,
            details: z.string().max(1000),
            source: url,
          }),
        },
        data = schemas[type].parse(b.data);
      if (type === "price" || type === "alert") {
        const host = new URL(data.source).hostname;
        assert(
          [
            "meteo.gov.lk",
            "dmc.gov.lk",
            "fisheries.gov.lk",
            "fisheriesdept.gov.lk",
            "cbsl.gov.lk",
          ].some((x) => host === x || host.endsWith("." + x)),
          "Use an official Sri Lankan authority source",
        );
      }
      if (type === "alert")
        assert(
          Number.isFinite(Date.parse(data.issued)) &&
            Date.parse(data.expires) > Date.parse(data.issued),
          "Invalid issue or expiry time",
        );
      const rid = b.id ? txt.parse(b.id) : uid();
      if (type === "article") {
        const existingArticles = await all(
          "SELECT id,data FROM records WHERE type='article'",
        );
        assert(
          !existingArticles.some(
            (row) => row.id !== rid && JSON.parse(row.data).slug === data.slug,
          ),
          "An article already uses this URL slug",
        );
      }
      if (b.id) {
        const existing = await one("SELECT type FROM records WHERE id=?", rid);
        assert(existing?.type === type, "Record type mismatch");
      }
      await s(
        "INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET type=excluded.type,data=excluded.data,created=excluded.created",
        rid,
        type,
        JSON.stringify(data),
        now(),
      ).run();
      await log(me.id, "record:" + type, rid);
      return out({ ok: true });
    }
    if (a === "deleteRecord") {
      await s("DELETE FROM records WHERE id=?", b.id).run();
      await log(me.id, "record:delete", b.id);
      return out({ ok: true });
    }
    if (a === "resolveComplaint") {
      const r = await one(
        "SELECT * FROM records WHERE id=? AND type='complaint'",
        b.id,
      );
      assert(r, "Complaint not found");
      await s(
        "UPDATE records SET data=? WHERE id=?",
        JSON.stringify({ ...JSON.parse(r.data), status: "resolved" }),
        b.id,
      ).run();
      await log(me.id, "complaint:resolved", b.id);
      return out({ ok: true });
    }
    return out({ error: "Unknown action" }, 400);
  } catch (e) {
    const msg =
      e instanceof z.ZodError
        ? e.issues.map((i) => i.path.join(".") + ": " + i.message).join("; ")
        : e instanceof Error
          ? e.message
          : "Unable to save";
    return out(
      {
        error: msg.includes("D1_ERROR")
          ? "Stock or pricing may have changed. Refresh and retry."
          : msg,
      },
      400,
    );
  }
}

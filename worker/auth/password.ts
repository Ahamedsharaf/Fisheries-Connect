import { env } from "cloudflare:workers";
import {
  hashPassword,
  validHash,
  validPassword,
  verifyPassword,
} from "../../lib/password";
import {
  ADMIN_ID,
  SESSION_DAYS,
  cookie,
  cookieName,
  cookieValue,
  getCurrentUser,
  randomToken,
  safeReturn,
  sha256,
} from "./session";
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
const emailOK = (s: string) =>
  /^[^@\s]{1,64}@[^@\s.]+(?:\.[^@\s.]+)+$/.test(s) && s.length <= 254;
const DUMMY_HASH =
  "scrypt$16384$8$5$00000000000000000000000000000000$" + "0".repeat(64);
class AuthError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function limit(req: Request, identity: string, action: string) {
  const ip = req.headers.get("CF-Connecting-IP") || "local",
    window = Math.floor(Date.now() / 900000);
  for (const [value, max] of [
    [action + "|ip|" + ip, 40],
    [action + "|identity|" + identity, 12],
  ] as const) {
    const key = await sha256(value + "|" + window);
    const row = await env.DB.prepare(
      "INSERT INTO local_auth_limits(key,attempts,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts",
    )
      .bind(key, (window + 1) * 900000)
      .first<any>();
    if (row.attempts > max)
      throw new AuthError(
        "Too many attempts. Please try again in 15 minutes.",
        429,
      );
  }
}
async function issue(
  req: Request,
  id: string,
  scope: "member" | "admin",
  credential: string,
) {
  const token = randomToken(),
    seconds = scope === "admin" ? 8 * 3600 : SESSION_DAYS * 86400,
    current = cookieValue(req, cookieName(req));
  const statements = [
    env.DB.prepare(
      "INSERT INTO local_sessions(token_hash,user_id,scope,credential_version,expires,created) VALUES(?,?,?,?,?,?)",
    ).bind(
      await sha256(token),
      id,
      scope,
      await sha256(credential),
      Date.now() + seconds * 1000,
      Date.now(),
    ),
  ];
  if (current)
    statements.unshift(
      env.DB.prepare("DELETE FROM local_sessions WHERE token_hash=?").bind(
        await sha256(current),
      ),
    );
  await env.DB.batch(statements);
  return cookie(req, token, seconds);
}
export async function auth(req: Request) {
  try {
    if (req.method !== "POST")
      return json({ error: "Method not allowed" }, 405);
    if (req.headers.get("origin") !== new URL(req.url).origin)
      throw new AuthError("Cross-origin request rejected", 403);
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      throw new AuthError("Expected JSON", 415);
    const raw = await req.text();
    if (raw.length > 16000) throw new AuthError("Request too large", 413);
    const b = JSON.parse(raw),
      path = new URL(req.url).pathname;
    if (!b || typeof b !== "object" || Array.isArray(b))
      throw new AuthError("Invalid request");
    if (path === "/api/auth/logout") {
      const token = cookieValue(req, cookieName(req));
      if (token)
        await env.DB.prepare("DELETE FROM local_sessions WHERE token_hash=?")
          .bind(await sha256(token))
          .run();
      return json({ ok: true }, 200, { "Set-Cookie": cookie(req, "", 0) });
    }
    const identity = String(b.identity || b.email || "")
        .trim()
        .toLowerCase(),
      password = String(b.password || "");
    if (path === "/api/auth/help") {
      const name = String(b.name || "").trim(),
        message = String(b.message || "").trim();
      if (
        !emailOK(identity) ||
        name.length < 2 ||
        name.length > 80 ||
        message.length < 10 ||
        message.length > 2000
      )
        throw new AuthError(
          "Enter your name, email and a message with 10–2000 characters.",
        );
      await limit(req, identity, "help");
      await env.DB.prepare("INSERT INTO records VALUES(?,?,?,?)")
        .bind(
          crypto.randomUUID(),
          "complaint",
          JSON.stringify({
            email: identity,
            name,
            subject: "Account help: " + name,
            message,
            status: "open",
            orderId: "",
          }),
          new Date().toISOString(),
        )
        .run();
      return json({ ok: true });
    }
    if (path === "/api/auth/login" || path === "/api/auth/admin-login") {
      await limit(req, identity, "login");
      let id: string,
        credential: string,
        scope: "member" | "admin" = "member";
      if (path === "/api/auth/admin-login") {
        if (!env.ADMIN_EMAIL || !validHash(env.ADMIN_PASSWORD_HASH))
          throw new AuthError(
            "Administrator login has not been configured. Complete the admin password setup.",
            503,
          );
        const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
        if (!valid || identity !== env.ADMIN_EMAIL.toLowerCase())
          throw new AuthError("Email or password is incorrect.", 401);
        id = ADMIN_ID;
        credential =
          env.ADMIN_PASSWORD_HASH + "|" + env.ADMIN_EMAIL.toLowerCase();
        scope = "admin";
      } else {
        const account = await env.DB.prepare(
          "SELECT * FROM local_accounts WHERE email=? OR username=?",
        )
          .bind(identity, identity)
          .first<any>();
        const valid = await verifyPassword(
          password,
          account?.password_hash || DUMMY_HASH,
        );
        if (!valid || !account)
          throw new AuthError("Email, username or password is incorrect.", 401);
        const profile = await env.DB.prepare(
          "SELECT verification FROM profiles WHERE id=?",
        )
          .bind(account.id)
          .first<any>();
        if (profile?.verification === "suspended")
          throw new AuthError(
            "This account is suspended. Contact support.",
            403,
          );
        id = account.id;
        credential = account.password_hash;
      }
      return json(
        {
          ok: true,
          returnTo:
            scope === "admin" ? "/admin" : safeReturn(b.returnTo || "/portal"),
        },
        200,
        { "Set-Cookie": await issue(req, id, scope, credential) },
      );
    }
    if (path === "/api/auth/register") {
      const username = String(b.username || "")
          .trim()
          .toLowerCase(),
        name = String(b.name || "").trim(),
        role = b.role === "fisherman" ? "fisherman" : "consumer";
      if (
        !emailOK(identity) ||
        !/^[a-z0-9_]{3,30}$/.test(username) ||
        name.length < 2 ||
        name.length > 80 ||
        !validPassword(password)
      )
        throw new AuthError(
          "Use a valid email, a 3–30 character username, your name and a 12–128 character password.",
        );
      await limit(req, identity, "register");
      if (
        identity === env.ADMIN_EMAIL?.toLowerCase() ||
        ["admin", "administrator", "superadmin", "support"].includes(username)
      )
        throw new AuthError(
          "These account details are reserved. Choose different details.",
        );
      const exists = await env.DB.prepare(
        "SELECT id FROM local_accounts WHERE email=? OR username=?",
      )
        .bind(identity, username)
        .first();
      if (exists)
        throw new AuthError(
          "An account already uses that email or username. Sign in or contact support.",
        );
      const id = crypto.randomUUID(),
        hash = await hashPassword(password),
        now = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO local_accounts(id,email,username,name,password_hash,created) VALUES(?,?,?,?,?,?)",
        ).bind(id, identity, username, name, hash, now),
        env.DB.prepare(
          "INSERT INTO profiles(id,name,email,role,created) VALUES(?,?,?,?,?)",
        ).bind(id, name, identity, role, now),
      ]);
      return json(
        {
          ok: true,
          returnTo:
            role === "fisherman"
              ? "/portal/profile"
              : safeReturn(b.returnTo || "/explore"),
        },
        201,
        { "Set-Cookie": await issue(req, id, "member", hash) },
      );
    }
    const me = await getCurrentUser(req);
    if (path === "/api/auth/change-password") {
      if (!me || me.isAdmin)
        throw new AuthError("Sign in with a member account.", 401);
      if (!validPassword(String(b.newPassword || "")))
        throw new AuthError("Use a password with 12 to 128 characters.");
      await limit(req, me.userId, "password-change");
      const account = await env.DB.prepare(
        "SELECT password_hash FROM local_accounts WHERE id=?",
      )
        .bind(me.userId)
        .first<any>();
      if (!(await verifyPassword(password, account?.password_hash)))
        throw new AuthError("Current password is incorrect.", 401);
      const hash = await hashPassword(b.newPassword);
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE local_accounts SET password_hash=? WHERE id=?",
        ).bind(hash, me.userId),
        env.DB.prepare("DELETE FROM local_sessions WHERE user_id=?").bind(
          me.userId,
        ),
      ]);
      return json({ ok: true }, 200, {
        "Set-Cookie": await issue(req, me.userId, "member", hash),
      });
    }
    if (path === "/api/auth/reset-link") {
      if (!me?.isAdmin)
        throw new AuthError("Administrator access required", 403);
      const account = await env.DB.prepare(
        "SELECT id FROM local_accounts WHERE id=?",
      )
        .bind(String(b.id || ""))
        .first<any>();
      if (!account) throw new AuthError("Password account not found.");
      const token = randomToken();
      await env.DB.batch([
        env.DB.prepare(
          "DELETE FROM local_password_resets WHERE user_id=?",
        ).bind(account.id),
        env.DB.prepare(
          "INSERT INTO local_password_resets(token_hash,user_id,expires) VALUES(?,?,?)",
        ).bind(await sha256(token), account.id, Date.now() + 1800000),
        env.DB.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").bind(
          crypto.randomUUID(),
          me.userId,
          "password-reset:issued",
          account.id,
          new Date().toISOString(),
        ),
      ]);
      return json({
        ok: true,
        url: new URL("/login/reset#token=" + token, req.url).href,
      });
    }
    if (path === "/api/auth/reset") {
      await limit(req, "reset", "reset");
      if (
        !validPassword(password) ||
        !/^[A-Za-z0-9_-]{43}$/.test(String(b.token || ""))
      )
        throw new AuthError("Invalid reset details.");
      const hash = await hashPassword(password);
      const reset = await env.DB.prepare(
        "DELETE FROM local_password_resets WHERE token_hash=? AND expires>? RETURNING user_id",
      )
        .bind(await sha256(b.token), Date.now())
        .first<any>();
      if (!reset)
        throw new AuthError("This reset link is invalid or has expired.");
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE local_accounts SET password_hash=? WHERE id=?",
        ).bind(hash, reset.user_id),
        env.DB.prepare("DELETE FROM local_sessions WHERE user_id=?").bind(
          reset.user_id,
        ),
      ]);
      return json({ ok: true, returnTo: "/login" }, 200, {
        "Set-Cookie": cookie(req, "", 0),
      });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof AuthError)
      return json(
        { error: error.message },
        error.status,
        error.status === 429 ? { "Retry-After": "900" } : {},
      );
    if (error instanceof SyntaxError)
      return json({ error: "Invalid request" }, 400);
    console.error("Authentication operation failed");
    return json({ error: "Unable to complete sign-in. Please retry." }, 503);
  }
}

import { env } from "cloudflare:workers";
export const SESSION_DAYS = 7;
export const ADMIN_ID = "fisheries-super-admin";
export function randomToken() {
  return btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export async function sha256(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}
export function cookieName(req: Request) {
  return (
    (new URL(req.url).protocol === "https:" ? "__Host-" : "") +
    "fc_local_session"
  );
}
export function cookieValue(req: Request, name: string) {
  const hits = (req.headers.get("cookie") || "")
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x.startsWith(name + "="));
  return hits.length === 1 ? hits[0].slice(name.length + 1) : null;
}
export function cookie(req: Request, token: string, seconds: number) {
  return `${cookieName(req)}=${token}; Path=/; Max-Age=${seconds}; HttpOnly; SameSite=Lax${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
}
export function safeReturn(value: string | null) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/";
  const u = new URL(value, "https://return.local");
  return u.origin !== "https://return.local" ||
    u.pathname.startsWith("/api/") ||
    u.pathname.startsWith("/auth/") ||
    u.pathname.startsWith("/login")
    ? "/"
    : u.pathname + u.search + u.hash;
}
export type CurrentUser = {
  userId: string;
  email: string;
  displayName: string;
  fullName: string;
  isAdmin: boolean;
};
export async function getCurrentUser(
  req: Request,
): Promise<CurrentUser | null> {
  const token = cookieValue(req, cookieName(req));
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await env.DB.prepare(
    "SELECT * FROM local_sessions WHERE token_hash=? AND expires>?",
  )
    .bind(await sha256(token), Date.now())
    .first<any>();
  if (!session) return null;
  if (session.scope === "admin") {
    if (
      session.user_id !== ADMIN_ID ||
      !env.ADMIN_EMAIL ||
      !env.ADMIN_PASSWORD_HASH ||
      session.credential_version !==
        (await sha256(
          env.ADMIN_PASSWORD_HASH + "|" + env.ADMIN_EMAIL.toLowerCase(),
        ))
    )
      return null;
    return {
      userId: ADMIN_ID,
      email: env.ADMIN_EMAIL,
      displayName: "Super administrator",
      fullName: "Super administrator",
      isAdmin: true,
    };
  }
  const u = await env.DB.prepare("SELECT * FROM local_accounts WHERE id=?")
    .bind(session.user_id)
    .first<any>();
  if (!u || session.credential_version !== (await sha256(u.password_hash)))
    return null;
  return {
    userId: u.id,
    email: u.email,
    displayName: u.name,
    fullName: u.name,
    isAdmin: false,
  };
}

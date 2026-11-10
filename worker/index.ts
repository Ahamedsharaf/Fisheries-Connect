import { env } from "cloudflare:workers";
import * as api from "./api";
import * as media from "./media";
import { auth } from "./auth/password";
export default {
  async fetch(req: Request) {
    const p = new URL(req.url).pathname;
    let response: Response;
    try {
      if (p === "/api/app")
        response =
          req.method === "GET"
            ? await api.GET(req)
            : req.method === "POST"
              ? await api.POST(req)
              : new Response("Method not allowed", { status: 405 });
      else if (p === "/api/media")
        response =
          req.method === "GET"
            ? await media.GET(req)
            : req.method === "POST"
              ? await media.POST(req)
              : new Response("Method not allowed", { status: 405 });
      else if (p.startsWith("/api/auth/")) response = await auth(req);
      else if (p === "/health") {
        await env.DB.prepare("SELECT 1").first();
        response = Response.json(
          { status: "ok" },
          { headers: { "Cache-Control": "no-store" } },
        );
      } else if (p.startsWith("/api/") || p.startsWith("/auth/"))
        response = new Response("Not found", { status: 404 });
      else if (!["GET", "HEAD"].includes(req.method))
        response = new Response("Method not allowed", { status: 405 });
      else response = await env.ASSETS.fetch(req);
    } catch {
      console.error("Fisheries request failed", { path: p });
      response = Response.json(
        { error: "The service is temporarily unavailable. Please retry." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const h = new Headers(response.headers);
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("X-Frame-Options", "DENY");
    h.set("Permissions-Policy", "geolocation=(self),camera=(),microphone=()");
    h.set(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
    );
    if (new URL(req.url).protocol === "https:")
      h.set("Strict-Transport-Security", "max-age=31536000");
    if (p.startsWith("/api/") || p.startsWith("/auth/"))
      h.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: h,
    });
  },
  async scheduled() {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM local_sessions WHERE expires<?").bind(
        Date.now(),
      ),
      env.DB.prepare("DELETE FROM local_auth_limits WHERE expires<?").bind(
        Date.now(),
      ),
      env.DB.prepare("DELETE FROM local_password_resets WHERE expires<?").bind(
        Date.now(),
      ),
    ]);
  },
};

import { env } from "cloudflare:workers";
import { getCurrentUser } from "./auth/session";
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key?.startsWith("photos/"))
    return new Response("Not found", { status: 404 });
  const o = await env.BUCKET?.get(key);
  if (!o) return new Response("Not found", { status: 404 });
  return new Response(o.body, {
    headers: {
      "Content-Type": o.httpMetadata?.contentType || "image/jpeg",
      "Cache-Control": "public,max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function POST(req: Request) {
  const user = await getCurrentUser(req);
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const profile = await env.DB?.prepare(
    "SELECT role,verification FROM profiles WHERE id=?",
  )
    .bind(user.userId)
    .first<any>();
  if (profile?.role !== "fisherman" || profile.verification === "suspended")
    return Response.json(
      { error: "Active fisherman profile required" },
      { status: 403 },
    );
  if (!env.BUCKET)
    return Response.json({ error: "Uploads unavailable" }, { status: 503 });
  if (Number(req.headers.get("content-length") || 0) > 5500000)
    return Response.json({ error: "Maximum 5 MB" }, { status: 400 });
  const f = (await req.formData()).get("file");
  if (
    !(f instanceof File) ||
    f.size > 5000000 ||
    !["image/jpeg", "image/png", "image/webp"].includes(f.type)
  )
    return Response.json(
      { error: "Use JPEG, PNG or WebP under 5 MB" },
      { status: 400 },
    );
  const bytes = await f.arrayBuffer(),
    a = new Uint8Array(bytes);
  if (
    !(
      (a[0] === 255 && a[1] === 216) ||
      (a[0] === 137 && a[1] === 80) ||
      (a[0] === 82 && a[1] === 73)
    )
  )
    return Response.json({ error: "Invalid image" }, { status: 400 });
  const key = "photos/" + crypto.randomUUID();
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: f.type } });
  return Response.json({ url: "/api/media?key=" + key });
}

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });

const decodeBasicAuth = (request) => {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    return {
      user: decoded.slice(0, separator),
      pass: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
};

const isAuthorized = (request, env) => {
  const credentials = decodeBasicAuth(request);
  return credentials?.user === env.ADMIN_USER && credentials?.pass === env.ADMIN_PASS;
};

const getIp = (request) =>
  request.headers.get("CF-Connecting-IP") ||
  request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
  "IP no disponible";

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const now = new Date();
  const visit = {
    ip: getIp(request),
    path: String(body?.path || "/").slice(0, 200),
    referrer: String(body?.referrer || "").slice(0, 500),
    userAgent: String(request.headers.get("User-Agent") || "").slice(0, 500),
    country: String(request.cf?.country || "").slice(0, 80),
    city: String(request.cf?.city || "").slice(0, 120),
    region: String(request.cf?.region || "").slice(0, 120),
    visitedAt: now.toISOString()
  };

  const key = `visit:${String(Date.now()).padStart(13, "0")}:${crypto.randomUUID().slice(0, 8)}`;
  const total = Number((await env.MISTIKO_PRICE_PDFS.get("stats:visits:total")) || 0) + 1;

  await Promise.all([
    env.MISTIKO_PRICE_PDFS.put(key, JSON.stringify(visit), { metadata: { ip: visit.ip, path: visit.path, visitedAt: visit.visitedAt } }),
    env.MISTIKO_PRICE_PDFS.put("stats:visits:total", String(total))
  ]);

  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!isAuthorized(request, env)) {
    return json({ error: "No autorizado" }, { status: 401 });
  }

  const list = await env.MISTIKO_PRICE_PDFS.list({ prefix: "visit:", limit: 1000 });
  const visits = await Promise.all(
    list.keys.map(async (item) => {
      const value = await env.MISTIKO_PRICE_PDFS.get(item.name, { type: "json" });
      return value || {
        ip: item.metadata?.ip || "IP no disponible",
        path: item.metadata?.path || "",
        visitedAt: item.metadata?.visitedAt || ""
      };
    })
  );

  visits.sort((a, b) => String(b.visitedAt).localeCompare(String(a.visitedAt)));
  const total = Number((await env.MISTIKO_PRICE_PDFS.get("stats:visits:total")) || visits.length);
  const uniqueIps = new Set(visits.map((visit) => visit.ip).filter(Boolean));

  return json({
    total,
    recentCount: visits.length,
    uniqueRecentIps: uniqueIps.size,
    items: visits.slice(0, 200)
  });
}

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

export async function onRequestDelete({ request, env, params }) {
  if (!isAuthorized(request, env)) {
    return json({ error: "No autorizado" }, { status: 401 });
  }

  const id = String(params.id || "").replace(/[^a-zA-Z0-9-]/g, "");
  if (!id) return json({ error: "PDF no encontrado" }, { status: 404 });

  await env.MISTIKO_PRICE_PDFS.delete(`pdf:${id}`);
  return json({ ok: true });
}

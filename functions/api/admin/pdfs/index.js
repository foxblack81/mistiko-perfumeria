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

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) {
    return json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("pdf");
  const title = String(form.get("title") || "").trim() || "PDF de precios Mistiko";

  if (!file || typeof file.arrayBuffer !== "function") {
    return json({ error: "Selecciona un archivo PDF." }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !String(file.name || "").toLowerCase().endsWith(".pdf")) {
    return json({ error: "Solo se permiten archivos PDF." }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return json({ error: "El PDF debe pesar menos de 20 MB." }, { status: 400 });
  }

  const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const key = `pdf:${id}`;
  const filename = String(file.name || "precios-mistiko.pdf").replace(/[^\w.\- ()]/g, "");
  const value = await file.arrayBuffer();

  await env.MISTIKO_PRICE_PDFS.put(key, value, {
    metadata: {
      title,
      filename,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }
  });

  return json({
    ok: true,
    item: {
      id,
      title,
      filename,
      size: file.size,
      url: `/api/pdfs/${id}`
    }
  });
}

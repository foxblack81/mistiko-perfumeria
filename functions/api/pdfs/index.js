const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });

export async function onRequestGet({ env }) {
  const list = await env.MISTIKO_PRICE_PDFS.list({ prefix: "pdf:" });
  const items = list.keys
    .map((item) => ({
      id: item.name.replace("pdf:", ""),
      title: item.metadata?.title || "PDF de precios",
      filename: item.metadata?.filename || "precios-mistiko.pdf",
      size: item.metadata?.size || 0,
      uploadedAt: item.metadata?.uploadedAt || "",
      url: `/api/pdfs/${item.name.replace("pdf:", "")}`
    }))
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));

  return json({ items });
}

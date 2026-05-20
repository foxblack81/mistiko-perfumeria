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
    .map((item) => {
      const id = item.name.replace("pdf:", "");
      const isCatalog = id.startsWith("catalogomistiko");
      return {
        id,
        title: item.metadata?.title || (isCatalog ? "Catalogo Mistiko" : "PDF de precios"),
        filename: item.metadata?.filename || (isCatalog ? "catalogomistiko.pdf" : "precios-mistiko.pdf"),
        size: item.metadata?.size || (isCatalog ? 1016790 : 0),
        uploadedAt: item.metadata?.uploadedAt || "",
        url: `/api/pdfs/${id}`
      };
    })
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));

  return json({ items });
}

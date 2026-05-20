export async function onRequestGet({ env, params }) {
  const id = String(params.id || "").replace(/[^a-zA-Z0-9-]/g, "");
  if (!id) return new Response("PDF no encontrado", { status: 404 });

  const key = `pdf:${id}`;
  const value = await env.MISTIKO_PRICE_PDFS.getWithMetadata(key, { type: "arrayBuffer" });
  if (!value.value) return new Response("PDF no encontrado", { status: 404 });

  const filename = value.metadata?.filename || (id.startsWith("catalogomistiko") ? "catalogomistiko.pdf" : "precios-mistiko.pdf");
  return new Response(value.value, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=300"
    }
  });
}

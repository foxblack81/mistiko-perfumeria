const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {})
    }
  });

const defaultKits = [
  {
    title: "Kit Singler 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto1.jpeg",
    alt: "Kit Singler 1oz",
    prices: ["6 unidades: $48.000", "12 unidades: $90.000", "20 unidades: $140.000", "50 unidades: $340.000", "100 unidades: $680.000"],
    note: "Se obsequian feromonas y fundas o cajas de presentacion."
  },
  {
    title: "Kit Trinity 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto2.jpeg",
    alt: "Kit Trinity 1oz",
    prices: ["6 unidades: $45.000", "12 unidades: $80.000", "20 unidades: $130.000"],
    note: "Se obsequian feromonas y fundas de presentacion."
  },
  {
    title: "Kit Cartier 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto3.jpeg",
    alt: "Kit Cartier 1oz",
    prices: ["6 unidades: $50.000", "12 unidades: $95.000", "20 unidades: $150.000"],
    note: "Se obsequian feromonas y fundas de presentacion."
  },
  {
    title: "Kit Bala 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto4.jpeg",
    alt: "Kit Bala 1oz",
    prices: ["6 unidades: $50.000", "12 unidades: $95.000", "20 unidades: $150.000"],
    note: "Se obsequian feromonas y fundas de presentacion."
  },
  {
    title: "Kit Maletin emprendimiento 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto5.jpeg",
    alt: "Kit Maletin emprendimiento 1oz",
    prices: ["Incluye maletin", "20 perfumes en presentacion Singler", "20 fundas o cajas de presentacion"],
    note: ""
  },
  {
    title: "Kit Maletines",
    image: "https://emprendeconperfumeria.com/images/Productos/producto6.jpeg",
    alt: "Kit Maletines",
    prices: ["Kit Maletin Emprendedor: $230.000", "20 perfumes Singler", "20 fundas o cajas de presentacion", "Maletin para transportar perfumes", "Kit 24 probadores con maletin"],
    note: ""
  },
  {
    title: "Insumos",
    image: "https://emprendeconperfumeria.com/images/Productos/producto7.jpeg",
    alt: "Insumos de perfumeria",
    prices: [],
    note: "Insumos para quienes desean aprender el proceso de preparacion y producir de manera independiente."
  },
  {
    title: "Kit preparacion 20 perfumes 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto8.jpeg",
    alt: "Kit preparacion 20 perfumes 1oz",
    prices: ["20 frascos Singler + Cartier, Bala o Trinity", "1oz de feromonas", "10 referencias de fragancias por 30gr c/u", "20 fundas + 500gr diluyente + stickers", "Precio: $140.000"],
    note: ""
  },
  {
    title: "Kit preparacion 40 perfumes 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto9.jpeg",
    alt: "Kit preparacion 40 perfumes 1oz",
    prices: ["40 frascos Singler + Cartier, Bala o Trinity", "1oz de feromonas", "20 referencias de fragancias por 30gr c/u", "40 fundas + 1 litro de diluyente + stickers", "Precio: $270.000"],
    note: ""
  },
  {
    title: "Kit preparacion 100 perfumes 1oz",
    image: "https://emprendeconperfumeria.com/images/Productos/producto10.jpeg",
    alt: "Kit preparacion 100 perfumes 1oz",
    prices: ["100 frascos Singler + Cartier, Bala o Trinity", "1oz de feromonas", "25 referencias de fragancias por 60gr c/u", "100 fundas + 2 litros de diluyente", "Precio: $600.000"],
    note: "La gramera tiene un valor adicional de $30.000."
  }
];

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

const normalizeKit = (kit) => ({
  title: String(kit?.title || "").trim().slice(0, 120),
  image: String(kit?.image || "").trim().slice(0, 500),
  alt: String(kit?.alt || kit?.title || "Kit Mistiko").trim().slice(0, 180),
  prices: Array.isArray(kit?.prices)
    ? kit.prices.map((price) => String(price || "").trim()).filter(Boolean).slice(0, 20)
    : [],
  note: String(kit?.note || "").trim().slice(0, 400)
});

export async function onRequestGet({ env }) {
  const saved = await env.MISTIKO_PRICE_PDFS.get("config:kits", { type: "json" });
  const items = Array.isArray(saved?.items) && saved.items.length ? saved.items : defaultKits;
  return json({ items });
}

export async function onRequestPut({ request, env }) {
  if (!isAuthorized(request, env)) {
    return json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items.map(normalizeKit).filter((kit) => kit.title && kit.image) : [];
  if (!items.length) {
    return json({ error: "Agrega al menos un kit con nombre e imagen." }, { status: 400 });
  }

  await env.MISTIKO_PRICE_PDFS.put("config:kits", JSON.stringify({ items, updatedAt: new Date().toISOString() }));
  return json({ ok: true, items });
}

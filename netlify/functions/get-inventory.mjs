import { getStore } from "@netlify/blobs";

const defaults = {
  cookie4: { name: "Cookies — 4 pack", price: 6, stock: 0 },
  cookie6: { name: "Cookies — 6 pack", price: 9, stock: 0 },
  cookie12: { name: "Cookies — 12 pack", price: 16, stock: 0 },
  classic1: { name: "Classic Cinnamon Rolls — 1", price: 5, stock: 0 },
  classic2: { name: "Classic Cinnamon Rolls — 2", price: 9, stock: 0 },
  classic4: { name: "Classic Cinnamon Rolls — 4", price: 18, stock: 0 },
  biscoff1: { name: "Biscoff Cinnamon Rolls — 1", price: 6, stock: 0 },
  biscoff2: { name: "Biscoff Cinnamon Rolls — 2", price: 12, stock: 0 },
  biscoff4: { name: "Biscoff Cinnamon Rolls — 4", price: 19, stock: 0 }
};

export default async request => {
  if (request.method !== "GET") return Response.json({ error: "Method not allowed." }, { status: 405 });
  try {
    const store = getStore("baked-by-netta-store");
    const saved = await store.get("inventory", { type: "json" });
    const inventory = saved && typeof saved === "object" ? saved : defaults;
    return Response.json({ inventory }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Inventory is temporarily unavailable." }, { status: 503 });
  }
};

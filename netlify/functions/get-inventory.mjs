import { getStore } from "@netlify/blobs";

const defaults = {
  chocchip4: { name: "Chocolate Chip Cookie — 4 cookies", price: 6, stock: 0 },
  chocchip6: { name: "Chocolate Chip Cookie — 6 cookies", price: 9, stock: 0 },
  chocchip12: { name: "Chocolate Chip Cookie — 12 cookies", price: 16, stock: 0 },
  sugar4: { name: "Sugar Cookie — 4 cookies", price: 6, stock: 0 },
  sugar6: { name: "Sugar Cookie — 6 cookies", price: 9, stock: 0 },
  sugar12: { name: "Sugar Cookie — 12 cookies", price: 16, stock: 0 },
  churro4: { name: "Churro Cookie — 4 cookies", price: 6, stock: 0 },
  churro6: { name: "Churro Cookie — 6 cookies", price: 9, stock: 0 },
  churro12: { name: "Churro Cookie — 12 cookies", price: 16, stock: 0 },
  coffeecake4: { name: "Coffee Cake Cookie — 4 cookies", price: 7, stock: 0 },
  coffeecake6: { name: "Coffee Cake Cookie — 6 cookies", price: 10, stock: 0 },
  coffeecake12: { name: "Coffee Cake Cookie — 12 cookies", price: 17, stock: 0 },
  classic2: { name: "Classic Cinnamon Roll — 2 rolls", price: 9, stock: 0 },
  classic4: { name: "Classic Cinnamon Roll — 4 rolls", price: 18, stock: 0 },
  biscoff2: { name: "Biscoff Cinnamon Roll — 2 rolls", price: 12, stock: 0 },
  biscoff4: { name: "Biscoff Cinnamon Roll — 4 rolls", price: 19, stock: 0 }
};

export default async request => {
  if (request.method !== "GET") return Response.json({ error: "Method not allowed." }, { status: 405 });
  try {
    const store = getStore("baked-by-netta-store");
    const saved = await store.get("inventory", { type: "json" });
    const inventory = Object.fromEntries(Object.entries(defaults).map(([id, product]) => [id, {
      ...product,
      stock: Number.isInteger(Number(saved?.[id]?.stock)) && Number(saved[id].stock) >= 0 ? Number(saved[id].stock) : 0
    }]));
    return Response.json({ inventory }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Inventory is temporarily unavailable." }, { status: 503 });
  }
};

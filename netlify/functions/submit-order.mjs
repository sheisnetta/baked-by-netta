import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

const reply = (body, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" }
});
const defaults = {
  cookie4:{name:"Cookies — 4 pack",price:6,stock:0},
  cookie6:{name:"Cookies — 6 pack",price:9,stock:0},
  cookie12:{name:"Cookies — 12 pack",price:16,stock:0},
  classic1:{name:"Classic Cinnamon Rolls — 1",price:5,stock:0},
  classic2:{name:"Classic Cinnamon Rolls — 2",price:9,stock:0},
  classic4:{name:"Classic Cinnamon Rolls — 4",price:18,stock:0},
  biscoff1:{name:"Biscoff Cinnamon Rolls — 1",price:6,stock:0},
  biscoff2:{name:"Biscoff Cinnamon Rolls — 2",price:12,stock:0},
  biscoff4:{name:"Biscoff Cinnamon Rolls — 4",price:19,stock:0}
};
function localDateInBoston() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}
function addDays(iso, days) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0,10);
}
export default async request => {
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  let data;
  try { data = await request.json(); } catch { return reply({ error: "Please review your order details." }, 400); }
  const name = String(data.name || "").trim().slice(0,80);
  const phone = String(data.phone || "").trim().slice(0,30);
  const notes = String(data.notes || "").trim().slice(0,1000);
  const pickupDate = String(data.pickupDate || "");
  const items = Array.isArray(data.items) ? data.items : [];
  if (!name || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !items.length || items.length > 9) {
    return reply({ error: "Please enter your name, phone number, pickup date, and at least one item." }, 400);
  }
  if (pickupDate < addDays(localDateInBoston(), 2)) {
    return reply({ error: "Please choose a pickup date at least 2 days in advance." }, 400);
  }
  const store = getStore("baked-by-netta-store");
  const saved = await store.get("inventory", { type: "json" });
  const inventory = saved && typeof saved === "object" ? saved : defaults;
  const cleanItems = [];
  let total = 0;
  for (const requested of items) {
    const key = String(requested.id || "");
    const qty = Number(requested.quantity);
    const product = inventory[key];
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20) return reply({ error: "One of the selected items is invalid." }, 400);
    if (Number(product.stock) < qty) return reply({ error: product.name + " does not have enough availability. Please update your cart." }, 409);
    cleanItems.push({ id:key, name:product.name, quantity:qty, unitPrice:Number(product.price), lineTotal:Number(product.price)*qty });
    total += Number(product.price)*qty;
  }
  for (const item of cleanItems) inventory[item.id].stock = Number(inventory[item.id].stock) - item.quantity;
  await store.setJSON("inventory", inventory);
  const order = {
    id: randomUUID(), name, phone, notes, pickupDate, items:cleanItems, total,
    status:"New", createdAt:new Date().toISOString()
  };
  await store.setJSON("order-" + order.id + ".json", order);
  return reply({ ok:true, orderId:order.id, message:"Your preorder request has been received. I will contact you within 24 hours. Your order and preferred pickup date are not confirmed until I contact you." }, 201);
};

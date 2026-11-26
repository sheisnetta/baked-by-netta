import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";

const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
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
function localDateInBoston() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(iso, days) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); }
export default async request => {
  if (request.method !== "POST") return reply({ error: "Method not allowed." }, 405);
  let data;
  try { data = await request.json(); } catch { return reply({ error: "Please review your order details." }, 400); }
  const name = String(data.name || "").trim().slice(0,80);
  const phone = String(data.phone || "").trim().slice(0,30);
  const notes = String(data.notes || "").trim().slice(0,1000);
  const pickupDate = String(data.pickupDate || "");
  const fulfillment = String(data.fulfillment || "");
  const deliveryCity = String(data.deliveryCity || "").trim().slice(0,80);
  const deliveryAddress = String(data.deliveryAddress || "").trim().slice(0,180);
  const items = Array.isArray(data.items) ? data.items : [];
  if (!name || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !["pickup","delivery"].includes(fulfillment) || !items.length || items.length > 16) {
    return reply({ error: "Please enter your name, phone number, preferred date, fulfillment method, and at least one item." }, 400);
  }
  if (pickupDate < addDays(localDateInBoston(), 2)) return reply({ error: "Please choose a preferred date at least 2 days in advance." }, 400);
  if (fulfillment === "delivery" && (!deliveryCity || !deliveryAddress)) return reply({ error: "Please enter your delivery address and city or town." }, 400);
  const store = getStore("baked-by-netta-store");
  const saved = await store.get("inventory", { type: "json" });
  const cleanItems = []; let subtotal = 0;
  for (const requested of items) {
    const key = String(requested.id || ""), qty = Number(requested.quantity), product = defaults[key];
    const stock = Number(saved?.[key]?.stock || 0);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20) return reply({ error: "One of the selected items is invalid." }, 400);
    if (stock < qty) return reply({ error: product.name + " does not have enough availability. Please update your cart." }, 409);
    cleanItems.push({ id:key, name:product.name, quantity:qty, unitPrice:product.price, lineTotal:product.price*qty });
    subtotal += product.price*qty;
  }
  const normalizedCity = deliveryCity.toLowerCase().replace(/\s+/g, " ").replace(/,\s*(ma|massachusetts)$/, "").trim();
  const deliveryFee = fulfillment === "pickup" ? 0 : (normalizedCity === "methuen" || normalizedCity === "lawrence" ? 4 : null);
  const total = deliveryFee === null ? null : subtotal + deliveryFee;
  const order = { id:randomUUID(), name, phone, notes, pickupDate, fulfillment, deliveryCity:fulfillment === "delivery" ? deliveryCity : "", deliveryAddress:fulfillment === "delivery" ? deliveryAddress : "", items:cleanItems, subtotal, deliveryFee, total, status:"New", createdAt:new Date().toISOString() };
  // Requests remain pending; inventory is not deducted until the owner confirms the order.
  await store.setJSON("order-" + order.id + ".json", order);
  const message = deliveryFee === null
    ? "Your preorder request has been received. Your delivery fee for " + deliveryCity + " will be confirmed with you. I will contact you within 24 hours. Your order is not confirmed until I contact you."
    : "Your preorder request has been received. Your current total is $" + total.toFixed(2) + ". I will contact you within 24 hours. Your order is not confirmed until I contact you.";
  return reply({ ok:true, orderId:order.id, subtotal, deliveryFee, total, message }, 201);
};

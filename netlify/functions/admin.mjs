import { getStore } from "@netlify/blobs";
const reply = (body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
function authorized(request) {
  const secret = process.env.ADMIN_PASSWORD;
  return Boolean(secret && request.headers.get("authorization") === "Bearer " + secret);
}
export default async request => {
  if (!authorized(request)) return reply({error:"Unauthorized. Check the owner password."},401);
  const store = getStore("baked-by-netta-store");
  if (request.method === "GET") {
    const {blobs=[]} = await store.list({prefix:"order-"});
    const orders=[];
    for (const blob of blobs) {
      const item=await store.get(blob.key,{type:"json"});
      if(item) orders.push(item);
    }
    orders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const inventory=await store.get("inventory",{type:"json"}) || {};
    return reply({orders,inventory});
  }
  if (request.method === "POST") {
    let data;
    try { data=await request.json(); } catch { return reply({error:"Invalid request."},400); }
    if(data.action==="inventory") {
      const current=await store.get("inventory",{type:"json"}) || {};
      const id=String(data.id||"");
      const stock=Number(data.stock);
      if(!current[id] || !Number.isInteger(stock) || stock<0 || stock>10000) return reply({error:"Enter a valid stock amount."},400);
      current[id].stock=stock;
      await store.setJSON("inventory",current);
      return reply({ok:true,inventory:current});
    }
    if(data.action==="status") {
      const id=String(data.id||"");
      const status=String(data.status||"");
      if(!["New","Contacted","Confirmed","Completed","Cancelled"].includes(status)) return reply({error:"Invalid order status."},400);
      const key="order-"+id+".json";
      const order=await store.get(key,{type:"json"});
      if(!order) return reply({error:"Order not found."},404);
      order.status=status;
      await store.setJSON(key,order);
      return reply({ok:true,order});
    }
    return reply({error:"Unknown action."},400);
  }
  return reply({error:"Method not allowed."},405);
};

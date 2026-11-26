import { getStore } from "@netlify/blobs";
const reply=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
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
function authorized(request) { const secret=process.env.ADMIN_PASSWORD; return Boolean(secret && request.headers.get("authorization")==="Bearer "+secret); }
export default async request => {
 if(!authorized(request)) return reply({error:"Unauthorized. Check the owner password."},401);
 const store=getStore("baked-by-netta-store");
 if(request.method==="GET"){
  const {blobs=[]}=await store.list({prefix:"order-"}),orders=[];
  for(const blob of blobs){const item=await store.get(blob.key,{type:"json"});if(item)orders.push(item);}
  orders.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const saved=await store.get("inventory",{type:"json"});
  const inventory=Object.fromEntries(Object.entries(defaults).map(([id,p])=>[id,{...p,stock:Number.isInteger(Number(saved?.[id]?.stock))&&Number(saved[id].stock)>=0?Number(saved[id].stock):0}]));
  return reply({orders,inventory});
 }
 if(request.method==="POST"){
  let data;try{data=await request.json();}catch{return reply({error:"Invalid request."},400);}
  if(data.action==="inventory"){
   const current=await store.get("inventory",{type:"json"})||{},id=String(data.id||""),stock=Number(data.stock);
   if(!defaults[id]||!Number.isInteger(stock)||stock<0||stock>10000)return reply({error:"Enter a valid stock amount."},400);
   current[id]={...defaults[id],stock};await store.setJSON("inventory",current);return reply({ok:true,inventory:current});
  }
  if(data.action==="status"){
   const id=String(data.id||""),status=String(data.status||"");
   if(!["New","Contacted","Confirmed","Completed","Cancelled"].includes(status))return reply({error:"Invalid order status."},400);
   const key="order-"+id+".json",order=await store.get(key,{type:"json"});if(!order)return reply({error:"Order not found."},404);
   order.status=status;await store.setJSON(key,order);return reply({ok:true,order});
  }
  return reply({error:"Unknown action."},400);
 }
 return reply({error:"Method not allowed."},405);
};

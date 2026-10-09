import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { authenticate,permit,owns } from './auth.js';
import { HttpError,id,priceInput,transition } from './domain.js';
import { placeOrder, orderResponse } from './orders.js';
export const routes=Router();
function credentials(b) {
  if(!b || typeof b.username!=='string' || !/^[a-zA-Z0-9_.-]{3,50}$/.test(b.username) || typeof b.password!=='string' || b.password.length<6 || Buffer.byteLength(b.password)>72) throw new HttpError(400,'username 3..50; password 6..72 bytes required');
}
const profile=u=>({uid:u.uid,username:u.username,fullname:u.fullname,mid:u.mid,role:u.role.rolename,membership:u.membership});
routes.get('/health',async(_req,res)=>{try{await db.$queryRaw`SELECT 1`;res.json({status:'UP',database:'UP'});}catch{res.status(503).json({status:'DOWN'});}});
routes.post('/auth/register',async(req,res)=>{
  credentials(req.body);
  const {username,password,email,phone,fullname=''}=req.body;
  if(typeof fullname!=='string'||fullname.length>100 || (email!==undefined && (typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email))) || (phone!==undefined && (typeof phone!=='string'||phone.length>30))) throw new HttpError(400,'Invalid profile');
  const user=await db.user.create({data:{username,password:await bcrypt.hash(password,12),email,phone,fullname,role:{connect:{rolename:'normal'}},membership:{connect:{mname:'normal'}}},include:{role:true,membership:true}});
  res.status(201).json({message:'User registered successfully',...profile(user)});
});
routes.post('/auth/login',async(req,res)=>{
  credentials(req.body);
  const user=await db.user.findUnique({where:{username:req.body.username},include:{role:true}});
  if(!user || !await bcrypt.compare(req.body.password,user.password)) throw new HttpError(401,'Invalid credentials');
  res.json({accessToken:jwt.sign({role:user.role.rolename},process.env.JWT_SECRET,{subject:String(user.uid),expiresIn:3600,algorithm:'HS256',issuer:'ecommerce',audience:'ecommerce-api'}),tokenType:'Bearer',expiresIn:3600,uid:user.uid});
});
routes.use(authenticate);
routes.get('/customers/:uid',async(req,res)=>{
  const uid=id(req.params.uid); const u=await db.user.findUnique({where:{uid},include:{role:true,membership:true}});
  if(!u) throw new HttpError(404,'Customer not found'); owns(req.actor,uid);res.json(profile(u));
});
routes.put('/customers/:uid',async(req,res)=>{
  const uid=id(req.params.uid);owns(req.actor,uid);
  const {fullname,mid}=req.body||{};
  if(fullname!==undefined&&(typeof fullname!=='string'||!fullname.trim()||fullname.length>100)) throw new HttpError(400,'Invalid fullname');
  if(mid!==undefined&&req.actor.role!=='admin') throw new HttpError(403,'Only admin can change membership');
  if(fullname===undefined&&mid===undefined) throw new HttpError(400,'Empty update');
  const u=await db.user.update({where:{uid},data:{fullname,mid:mid===undefined?undefined:id(mid)},include:{role:true,membership:true}});res.json(profile(u));
});
routes.get('/products',async(_req,res)=>res.json({items:await db.product.findMany({orderBy:{pid:'asc'}})}));
routes.get('/products/:pid',async(req,res)=>{const p=await db.product.findUnique({where:{pid:id(req.params.pid)}});if(!p)throw new HttpError(404,'Product not found');res.json(p);});
routes.post('/products',permit('admin'),async(req,res)=>res.status(201).json(await db.product.create({data:priceInput(req.body)})));
routes.put('/products/:pid',permit('admin'),async(req,res)=>res.json(await db.product.update({where:{pid:id(req.params.pid)},data:priceInput(req.body,true)})));
routes.delete('/products/:pid',permit('admin'),async(req,res)=>{await db.product.delete({where:{pid:id(req.params.pid)}});res.json({message:'Product deleted'});});
routes.post('/orders',async(req,res)=>res.status(201).json(orderResponse(await placeOrder(req.actor.uid,req.body?.items))));
routes.get('/orders',async(req,res)=>res.json({items:await db.order.findMany({where:req.actor.role==='admin'?{}:{uid:req.actor.uid},include:{items:true,shipments:{orderBy:{shipid:'asc'}}}})}));
routes.get('/orders/:oid',async(req,res)=>{const o=await db.order.findUnique({where:{oid:id(req.params.oid)},include:{items:true,shipments:{orderBy:{shipid:'asc'}}}});if(!o)throw new HttpError(404,'Order not found');owns(req.actor,o.uid);res.json(orderResponse(o));});
routes.post('/orders/:oid/shipments',permit('admin','staff'),async(req,res)=>{
  const oid=id(req.params.oid);
  if(!await db.order.findUnique({where:{oid}}))throw new HttpError(404,'Order not found');
  res.status(201).json(await db.shipment.create({data:{oid,status:'PENDING'}}));
});
routes.get('/shipments/:shipid',async(req,res)=>{const s=await db.shipment.findUnique({where:{shipid:id(req.params.shipid)},include:{order:{select:{uid:true}}}});if(!s)throw new HttpError(404,'Shipment not found');if(req.actor.role!=='staff')owns(req.actor,s.order.uid);res.json(s);});
routes.patch('/shipments/:shipid/status',permit('admin','staff'),async(req,res)=>{
  const shipid=id(req.params.shipid);const s=await db.shipment.findUnique({where:{shipid}});if(!s)throw new HttpError(404,'Shipment not found');transition(s.status,req.body?.status);
  const result=await db.shipment.updateMany({where:{shipid,status:s.status},data:{status:req.body.status}});
  if(!result.count)throw new HttpError(409,'Shipment changed; retry');res.json(await db.shipment.findUnique({where:{shipid}}));
});

import 'dotenv/config';
import express from 'express';
import { routes } from './routes.js';
import { db } from './db.js';
if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) throw new Error('JWT_SECRET must have at least 32 characters');
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'64kb'}));
app.use((req,res,next)=>{res.on('finish',()=>console.log(JSON.stringify({method:req.method,path:req.path,status:res.statusCode})));next();});
app.use('/api',routes);
app.use((_req,res)=>res.status(404).json({error:'Not found'}));
app.use((err,_req,res,_next)=>{
  const status=err.status || ({P2002:409,P2003:409,P2025:404,P2034:409}[err.code]) || (err.type==='entity.parse.failed'?400:500);
  if(status===500)console.error(err.message);
  res.status(status).json({error:err.status?err.message:status===409?'Conflict (duplicate, reference or concurrent update)':status===404?'Not found':status===400?'Invalid JSON':'Internal error'});
});
await db.$connect();
const server=app.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Monolith ready'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await db.$disconnect();process.exit(0);}));

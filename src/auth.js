import jwt from 'jsonwebtoken';
import { HttpError } from './domain.js';
export function authenticate(req,_res,next) {
  try {
    if (!req.headers.authorization?.startsWith('Bearer ')) throw new Error();
    const claims=jwt.verify(req.headers.authorization.slice(7),process.env.JWT_SECRET,{algorithms:['HS256'],issuer:'ecommerce',audience:'ecommerce-api'});
    req.actor={uid:Number(claims.sub),role:claims.role};
    if (!Number.isInteger(req.actor.uid)) throw new Error();
    next();
  } catch { next(new HttpError(401,'Missing or invalid token')); }
}
export const permit=(...roles)=>(req,_res,next)=>roles.includes(req.actor.role)?next():next(new HttpError(403,'Forbidden'));
export function owns(actor,uid) { if(actor.role!=='admin' && actor.uid!==uid) throw new HttpError(403,'Forbidden'); }

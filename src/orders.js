import { db } from './db.js';
import { HttpError, itemsInput, calculateTotal } from './domain.js';
export async function placeOrder(uid, rawItems) {
  const requested=itemsInput(rawItems);
  return db.$transaction(async tx=>{
    const user=await tx.user.findUnique({where:{uid},include:{membership:true}});
    if(!user) throw new HttpError(404,'Customer not found');
    const details=[];
    for(const item of requested) {
      const p=await tx.product.findUnique({where:{pid:item.pid}});
      if(!p) throw new HttpError(404,'Product not found');
      const changed=await tx.product.updateMany({where:{pid:item.pid,quantity:{gte:item.qty}},data:{quantity:{decrement:item.qty}}});
      if(changed.count!==1) throw new HttpError(409,'Insufficient stock');
      details.push({...item,unit_price:p.price});
    }
    return tx.order.create({data:{uid,...calculateTotal(details,user.membership.score),items:{create:details},shipments:{create:{status:'PENDING'}}},include:{items:true,shipments:{orderBy:{shipid:'asc'}}}});
  },{isolationLevel:'Serializable'});
}

// Compatibility field for the existing Postman collection; shipments is canonical.
export const orderResponse = order => ({...order, shipment: order.shipments[0] ?? null});

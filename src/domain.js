export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export function id(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 2147483647) throw new HttpError(400, 'Invalid ID');
  return Number(value);
}
export function itemsInput(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new HttpError(400, 'items must contain 1..100 products');
  const seen = new Set();
  return items.map(item => {
    if (!item || !Number.isInteger(item.pid) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 1000000) throw new HttpError(400, 'Invalid pid/qty');
    const pid = id(item.pid);
    if (seen.has(pid)) throw new HttpError(400, 'Duplicate pid in order');
    seen.add(pid); return {pid, qty:item.qty};
  }).sort((a,b)=>a.pid-b.pid);
}
export function priceInput(body, partial = false) {
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new HttpError(400, 'Invalid product');
  if (!partial && ['pname','price','quantity'].some(k=>body[k] === undefined)) throw new HttpError(400, 'Missing product field');
  if (!Object.keys(body).length || Object.keys(body).some(k=>!['pname','price','quantity'].includes(k))) throw new HttpError(400, 'Unknown/empty product fields');
  if (body.pname !== undefined && (typeof body.pname !== 'string' || !body.pname.trim() || body.pname.length>100)) throw new HttpError(400,'Invalid pname');
  if (body.price !== undefined && (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price<0 || body.price>99999999.99 || Math.abs(body.price*100-Math.round(body.price*100))>0.00001)) throw new HttpError(400,'Invalid price (max 2 decimals)');
  if (body.quantity !== undefined && (!Number.isInteger(body.quantity) || body.quantity<0 || body.quantity>1000000000)) throw new HttpError(400,'Invalid quantity');
  return body;
}
export function calculateTotal(items, score) {
  if (!Number.isInteger(score) || score<0) throw new HttpError(503,'Invalid membership score');
  const rate = Math.min(score,100);
  const cents = items.reduce((s,i)=>s+Math.round(Number(i.unit_price)*100)*i.qty,0);
  if (!Number.isSafeInteger(cents) || cents > 99999999999999) throw new HttpError(400,'Order value too large');
  const discount = Math.round(cents*rate/100);
  return {subtotal:(cents/100).toFixed(2), discount:(discount/100).toFixed(2), discountRate:rate,total:((cents-discount)/100).toFixed(2)};
}
export function transition(current, next) {
  const allowed = {PENDING:['SHIPPING','CANCELLED'],SHIPPING:['DELIVERED'],DELIVERED:[],CANCELLED:[]};
  if (!allowed[current]?.includes(next)) throw new HttpError(400,'Invalid shipment status transition');
}

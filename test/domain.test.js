import {test} from 'node:test';import assert from 'node:assert/strict';
import {itemsInput,calculateTotal,transition} from '../src/domain.js';
test('X x2 and Y x5 with score10',()=>assert.deepEqual(calculateTotal([{qty:2,unit_price:100},{qty:5,unit_price:20}],10),{subtotal:'300.00',discount:'30.00',discountRate:10,total:'270.00'}));
test('duplicate and invalid quantities rejected',()=>{for(const x of [[],[{pid:1,qty:0}],[{pid:1,qty:1.5}],[{pid:1,qty:1},{pid:1,qty:2}]])assert.throws(()=>itemsInput(x));});
test('cannot reverse delivered shipment',()=>assert.throws(()=>transition('DELIVERED','PENDING')));
test('cent rounding',()=>assert.equal(calculateTotal([{qty:3,unit_price:0.1}],10).total,'0.27'));

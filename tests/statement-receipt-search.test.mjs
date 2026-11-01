import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchableReceipts} from '../public/admin-fee-statement-directory.js';
test('receipt search indexes only owned saved positive payments and never changes the register',()=>{
 const valid={id:'a'.repeat(32),studentId:'student',number:'1000',amount:50000};
 const entry={id:'student',data:{feeReceipts:{valid,foreign:{...valid,id:'b'.repeat(32),studentId:'other'},unpaid:{...valid,amount:0},malformed:{...valid,id:'bad'},missing:{...valid,number:''}}}};
 const before=structuredClone(entry);assert.deepEqual(searchableReceipts(entry),[valid]);assert.deepEqual(entry,before);assert.deepEqual(searchableReceipts({id:'student',data:{feeReceipts:[]}}),[]);assert.deepEqual(searchableReceipts({id:'student',data:{}}),[]);
});

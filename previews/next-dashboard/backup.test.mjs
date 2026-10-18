import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBackup,ledgerRows} from './backup.js';
import {whatsappPhone,whatsappURL} from './receipt-image.js';
test('private backups preserve raw fields, photos and exact fee dates without synthesizing receipts',()=>{
 const original={exportedAt:'2026-10-18',collection:'applications',project:'sample',records:[{id:'original-id',data:{fullName:'Private example',gender:'female',photo:'retained-original-value',monthlyFees:{'2026-09-14':500.25,'2026-10-14':999},payment:{status:'paid',amount:100},custom:{more:['original','fields']}}}]};
 const parsed=parseBackup(JSON.stringify(original));assert.deepEqual(parsed,original);assert.deepEqual(ledgerRows(parsed.records[0].data),[{due:'2026-09-14',amount:500.25,valid:true},{due:'2026-10-14',amount:999,valid:true}]);assert.deepEqual(parsed,original);
 assert.equal('receipts' in parsed,false);assert.equal('payments' in parsed,false);
});
test('invalid backup files and duplicate document IDs are rejected',()=>{
 for(const value of ['bad JSON','{}',JSON.stringify({collection:'other',records:[]}),JSON.stringify({collection:'applications',records:[{id:'x',data:null}]}),JSON.stringify({collection:'applications',records:[{id:'x',data:{}},{id:'x',data:{}}]})])assert.throws(()=>parseBackup(value));
 assert.deepEqual(parseBackup('{"collection":"applications","records":[]}').records,[]);
});
test('WhatsApp recipients use the saved valid Indian mobile only, including country code normalization',()=>{
 for(const input of ['9999999991','+91 99999 99991','919999999991','(99999) 99991'])assert.equal(whatsappPhone(input),'919999999991');
 for(const input of ['','123','1234567890','+92 9999999991','9999999991?text=bad','9999999991<script>']){assert.equal(whatsappPhone(input),null);assert.equal(whatsappURL(input,'message'),null);}
 const url=new URL(whatsappURL('9999999991','A & B ₹400'));assert.equal(url.pathname,'/919999999991');assert.equal(url.searchParams.get('text'),'A & B ₹400');
});

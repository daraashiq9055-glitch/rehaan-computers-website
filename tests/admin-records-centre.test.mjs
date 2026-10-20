import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewRecords, filterRecords, sortRecords, savedActivity, validDate} from '../previews/admin-premium/records-model.js';
const record=(id, data={})=>({id,data:{fullName:'Student '+id,phone:'9000000001',coursePreference:'Computer Diploma',...data}});

test('review distinguishes essential details from optional profile information and preserves every field',()=>{
 const records=[record('legacy',{fullName:'',phone:'old',coursePreference:'',custom:{retain:true},payment:{status:'paid',providerId:'keep'},monthlyFees:{'2026-10-01':500}}),record('pending',{photo:'https://photo.example/retained.jpg'}),record('approved',{status:'Approved',admissionNumber:'002',approvedAt:'2026-09-12T10:00:00Z'})];
 const before=structuredClone(records),review=reviewRecords(records);
 assert.equal(review[0].review.essential.length,3);
 assert.equal(review[1].review.essential.length,0);
 assert.deepEqual(review[1].review.suggestions,['Guardian name','Batch','Address','Qualification']);
 assert.equal(review[2].review.essential.length,0);
 assert.ok(review[2].review.suggestions.includes('Optional photograph'));
 assert.deepEqual(records,before);
 assert.deepEqual(review[0].data.payment,before[0].data.payment);
});
test('possible duplicates are review hints, including case-insensitive admissions and shared family phones',()=>{
 const records=[record('one',{admissionNumber:'RC/001'}),record('two',{admissionNumber:'rc/001'}),record('three',{phone:'invalid'}),record('four',{phone:'invalid'})];
 const reviewed=reviewRecords(records);
 assert.deepEqual(reviewed[0].review.possibleDuplicates.map(item=>item.kind),['admission','phone']);
 assert.deepEqual(reviewed[0].review.possibleDuplicates[0].ids,['two']);
 assert.equal(reviewed[2].review.possibleDuplicates.length,0);
 assert.equal(filterRecords(reviewed,{queue:'duplicates'}).length,2);
 assert.equal(reviewed.length,4);
});
test('search and combinations include guardian phone, legacy courses and cancelled records without losing records',()=>{
 const rows=reviewRecords([record('one',{parentName:'Guardian Mir',guardianPhone:'9000000042',coursePreference:'',course:'Legacy course',batch:'Morning',status:'Approved',admissionNumber:'10',admissionDate:'2026-10-01'}),record('two',{phone:'9000000002',status:'Cancelled',admissionNumber:'2'}),record('three',{phone:'9000000003'})]);
 assert.equal(filterRecords(rows,{query:'0042',course:'Legacy course',batch:'Morning',status:'Approved'})[0].id,'one');
 assert.equal(filterRecords(rows,{status:'pending'}).length,1);
 assert.equal(filterRecords(rows,{status:'Cancelled'})[0].id,'two');
 assert.deepEqual(sortRecords(rows,'admission').map(row=>row.id),['two','one','three']);
 assert.equal(filterRecords(rows,{query:'absent'}).length,0);
 assert.equal(rows.length,3);
});
test('date checks reject impossible dates; undated legacy records remain available',()=>{
 assert.equal(validDate('2026-02-29'),false);
 assert.equal(validDate('2024-02-29'),true);
 assert.equal(validDate('2026-13-01'),false);
 const rows=reviewRecords([record('bad',{status:'Approved',admissionNumber:'001',admissionDate:'2026-02-31'}),record('undated')]);
 assert.ok(rows[0].review.essential.includes('Admission date needs review'));
 assert.equal(filterRecords(rows).length,2);
});
test('saved activity uses actual receipt amendment dates and excludes receipts belonging to another student',()=>{
 const entry=record('one',{createdAt:{seconds:1767261600},updatedAt:'2026-10-20T11:00:00Z',feeReceipts:{one:{studentId:'one',createdAt:'2026-10-19T10:00:00Z',number:'RC-1',amendments:[{at:'2026-10-20T10:00:00Z',reason:'Amount correction'}]},other:{studentId:'other',createdAt:'2026-10-20T12:00:00Z'}},monthlyFees:{'2026-10-01':300}});
 const before=structuredClone(entry),events=savedActivity(entry);
 assert.equal(events.length,4);
 assert.equal(events[0].title,'Latest saved update');
 assert.equal(events[1].detail,'Amount correction');
 assert.equal(events[2].title,'Receipt recorded');
 assert.deepEqual(entry,before);
});

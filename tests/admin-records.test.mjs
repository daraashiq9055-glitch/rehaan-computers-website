import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordTime, isSafePhoto, csvCell, paymentPatch, assertUnchanged, validateChanges, canonicalRecord } from '../public/admin-records.js';

test('legacy dates and Firebase timestamps sort without dropping undated records', () => {
    assert.equal(recordTime({seconds: 100}), 100000);
    assert.equal(recordTime({toDate: () => new Date(1000)}), 1000);
    assert.equal(recordTime('invalid'), 0);
    assert.equal(recordTime(undefined), 0);
});
test('photo markup accepts only inline raster data and rejects attribute injection and SVG', () => {
    assert.ok(isSafePhoto('data:image/jpeg;base64,YWJjZA=='));
    assert.ok(!isSafePhoto('data:image/svg+xml;base64,YWJjZA=='));
    assert.ok(!isSafePhoto('data:image/png;base64,YWJj" onerror="alert(1)'));
    assert.ok(!isSafePhoto('https://example.test/photo.png'));
});
test('exports escape quotes and neutralize spreadsheet formulas', () => {
    assert.equal(csvCell('a,"b"'), '"a,""b"""');
    for (const value of ['=1+1', '+123', '@SUM(A1)', '-1', '\tformula', '  =1']) assert.ok(csvCell(value).startsWith('"\''));
});
test('payment updates modify individual fields and keep provider metadata intact', () => {
    const original = {payment:{status:'pending', providerId:'keep-me', amount:100}};
    assert.deepEqual(paymentPatch(original,{payment:{...original.payment,status:'paid',verified:true}}), {'payment.status':'paid','payment.verified':true});
    assert.deepEqual(paymentPatch(original,{fullName:'Updated'}), {fullName:'Updated'});
});
test('concurrent changes to edited fields or ledger totals abort; unrelated updates survive', () => {
    const original = {fullName:'Original', monthlyFees:{'2026-10-01':200}};
    assert.throws(() => assertUnchanged(original,{...original,fullName:'Someone else'}, {fullName:'Mine'}), /another session/);
    assert.throws(() => assertUnchanged(original,{...original,monthlyFees:{'2026-10-01':700}}, {'monthlyFees.2026-10-01':999}), /another session/);
    assert.doesNotThrow(() => assertUnchanged(original,{...original,address:'Changed elsewhere'}, {fullName:'Mine'}));
});
test('Firestore map key order does not produce false record conflicts', () => {
    const a={fullName:'Cloudinary Test Student',payment:{status:'pending',amount:100},createdAt:{seconds:100,nanoseconds:2}};
    const b={createdAt:{nanoseconds:2,seconds:100},payment:{amount:100,status:'pending'},fullName:'Cloudinary Test Student'};
    assert.equal(canonicalRecord(a),canonicalRecord(b));
    assert.doesNotThrow(()=>assertUnchanged(a,b,{payment:{status:'paid',amount:100}}));
    assert.notEqual(canonicalRecord(a),canonicalRecord({...b,fullName:'Different student'}));
    assert.notEqual(canonicalRecord({items:[1,2]}),canonicalRecord({items:[2,1]}));
});
test('single-field edits tolerate untouched legacy fields and reject invalid new values', () => {
    assert.doesNotThrow(() => validateChanges({phone:'legacy',status:'New'}, {address:'New address'}));
    for (const patch of [{phone:'123'}, {email:'bad'}, {guardianPhone:'123'}, {aadhaarLast4:'12345'}, {dob:'2026-02-31'}, {admissionDate:'2999-01-01'}, {fullName:'A'}, {coursePreference:''}, {admissionNumber:'<script>'}]) assert.throws(() => validateChanges({},patch));
    assert.throws(() => validateChanges({}, {status:'Approved'}), /admission number/);
    assert.doesNotThrow(() => validateChanges({}, {fullName:'Valid Name',phone:'9876543210',coursePreference:'Diploma',admissionNumber:'RC/001',status:'Approved',dob:'2005-02-28'}));
});

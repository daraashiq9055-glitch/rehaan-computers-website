import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveMonthlyPayment,correctReceipt} from '../public/admin-feature-store.js';
import {saveDetailedPayment,paymentDetails,indiaDay} from '../previews/admin-premium/payment-service.js';
import {accounts,accountView,dayOf} from '../previews/admin-premium/accounts-model.js';
const clone=v=>structuredClone(v),id='a'.repeat(32),today=indiaDay();
function harness(){let data={fullName:'Sample',phone:'9000000001',coursePreference:'Diploma',status:'Approved',admissionNumber:'001',admissionDate:'2026-01-14',payment:{status:'paid',amount:100,mode:'cash',updatedAt:'2026-01-14T10:00:00Z'},monthlyFees:{'2026-02-14':200},photo:'unchanged',custom:{retain:true}},queue=Promise.resolve(),denied=false;const writes=[];return {get data(){return clone(data)},set data(value){data=clone(value)},writes,deny(){denied=true},runTransaction(_db,fn){const task=queue.then(async()=>{let patch;const result=await fn({get:async()=>({exists:()=>true,data:()=>clone(data)}),update:(_ref,p)=>{patch=clone(p)}});if(denied)throw Error('Denied');if(patch){for(const [path,value] of Object.entries(patch)){const keys=path.split('.');let obj=data;for(const key of keys.slice(0,-1))obj=obj[key]??(obj[key]={});obj[keys.at(-1)]=clone(value);}writes.push(patch);}return result;});queue=task.catch(()=>{});return task;}};}
const options=(h,extra={})=>({db:{},ref:{},runTransaction:h.runTransaction,assertSession:()=>{},actor:'admin-one',id:'student',due:'2026-02-14',amount:400,expectedPaid:200,expectedAdmission:'001',expectedJoined:'2026-01-14',receiptId:id,...extra});
const details=()=>({method:'UPI',date:today,reference:'UPI-123',note:'Monthly tuition'});
test('method, received date and printed reference share one original receipt/ledger transaction',async()=>{
 const h=harness(),before=h.data,receipt=await saveDetailedPayment(saveMonthlyPayment,options(h),details());
 assert.equal(h.writes.length,1);assert.equal(h.data.monthlyFees['2026-02-14'],600);assert.deepEqual(h.data.feeReceipts[id],receipt);assert.equal(receipt.method,'UPI');assert.equal(receipt.date,today);assert.equal(receipt.note,'Ref: UPI-123 · Monthly tuition');
 for(const key of ['payment','photo','custom'])assert.deepEqual(h.data[key],before[key]);
 const report=accounts([{id:'student',data:h.data}]),view=accountView(report,{from:today,to:today});assert.equal(view.summary.total,40000);assert.equal(view.summary.methods.UPI,40000);assert.equal(view.summary.Admission,0);assert.equal(report.legacy[0].amount,20000);
});
test('invalid method/date/reference are rejected before any transaction',async()=>{
 for(const input of [{...details(),method:'crypto'},{...details(),date:'2099-01-01'},{...details(),date:'2026-02-31'},{...details(),reference:'x'.repeat(61)},{...details(),note:'x'.repeat(91)}]){let called=false;await assert.rejects(saveDetailedPayment(()=>{called=true},{},input));assert.equal(called,false);}
 assert.equal(paymentDetails({...details(),reference:'',note:''}).note,'');
});
test('denied commits and stale balances preserve all metadata and ledger values',async()=>{
 for(const scenario of ['denied','stale','session']){const h=harness(),before=h.data;if(scenario==='denied')h.deny();const input=options(h,scenario==='stale'?{expectedPaid:0}:scenario==='session'?{assertSession(){throw Error('Session ended')}}:{});await assert.rejects(saveDetailedPayment(saveMonthlyPayment,input,details()));assert.deepEqual(h.data,before);assert.equal(h.writes.length,0);}
});
test('same-form retries return the original saved metadata, and simultaneous admins cannot double-add a stale amount',async()=>{
 const h=harness(),first=await saveDetailedPayment(saveMonthlyPayment,options(h),details());const again=await saveDetailedPayment(saveMonthlyPayment,options(h),{...details(),method:'Cash'});assert.deepEqual(again,first);assert.equal(h.writes.length,1);
 const other=harness(),results=await Promise.allSettled([saveDetailedPayment(saveMonthlyPayment,options(other),details()),saveDetailedPayment(saveMonthlyPayment,options(other,{receiptId:'b'.repeat(32)}),details())]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(other.data.monthlyFees['2026-02-14'],600);assert.equal(other.writes.length,1);
});
test('receipt corrections update report totals once, preserve audit metadata, and move method totals correctly',async()=>{
 const h=harness(),receipt=await saveDetailedPayment(saveMonthlyPayment,options(h),details());
 await correctReceipt({db:{},ref:{},runTransaction:h.runTransaction,assertSession:()=>{},actor:'admin-two',receiptId:id,correctionId:'c'.repeat(32),expected:receipt,expectedPaid:600,input:{name:'Sample',admission:'001',course:'Diploma',date:today,method:'Cash',amount:'300',note:'Corrected cash entry',reason:'Incorrect method and amount'}});
 const report=accounts([{id:'student',data:h.data}]),view=accountView(report,{from:today,to:today});assert.equal(view.rows.length,1);assert.equal(view.summary.total,30000);assert.equal(view.summary.methods.Cash,30000);assert.equal(view.summary.methods.UPI,0);assert.equal(report.legacy[0].amount,20000);assert.equal(h.data.feeReceipts[id].amendments[0].before.method,'UPI');assert.match(h.data.feeReceipts[id].amendments[0].before.note,/UPI-123/);
});
test('legacy undated amounts, malformed receipts and shared receipt IDs are never fabricated into dated collections',()=>{
 const data={fullName:'Legacy',payment:{status:'paid',amount:100},monthlyFees:{'2026-01-01':500},feeReceipts:{bad:{studentId:'student',amount:999}}};const before=clone(data),report=accounts([{id:'student',data}]);assert.equal(report.rows.length,0);assert.equal(report.legacy[0].amount,50000);assert.equal(report.warnings.length,2);assert.deepEqual(data,before);
 const r={id,studentId:'one',amount:20000,due:'2026-01-01',date:today};const collision=accounts([{id:'one',data:{feeReceipts:{[id]:r}}},{id:'two',data:{feeReceipts:{[id]:{...r,studentId:'two'}}}}]);assert.equal(collision.rows.length,0);assert.equal(collision.warnings.length,2);
});
test('India dates, filters and admission/tuition separation work without assuming unknown methods are cash',()=>{
 assert.equal(dayOf('2026-10-19T20:00:00Z'),'2026-10-20');const report=accounts([{id:'s',data:{fullName:'Name',payment:{status:'paid',amount:100,updatedAt:'2026-10-19T20:00:00Z'},monthlyFees:{}}}]);const view=accountView(report,{from:'2026-10-20',to:'2026-10-20'});assert.equal(view.summary.Admission,10000);assert.equal(view.summary.Tuition,0);assert.equal(view.summary.methods.Unspecified,10000);assert.equal(accountView(report,{from:'2026-10-20',to:'2026-10-20',method:'Cash'}).rows.length,0);assert.throws(()=>accountView(report,{from:'2026-10-21',to:'2026-10-20'}));
});

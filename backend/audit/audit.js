import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const hash = value => createHash('sha256').update(value).digest('hex');
const privateKey = /token|secret|password|authorization|credential|aadhaar|photo/i;
const visibleFields = new Set([
  'fullName','gender','parentName','phone','guardianPhone','email','dob',
  'qualification','address','coursePreference','course','batch','source','message',
  'status','createdAt','updatedAt','updatedBy','approvedAt','approvedBy',
  'admissionNumber','admissionDate','rollNumber','channel','adminNote','adminNotes','notes','markCard',
  'enrolmentStatus','cancelledAt','cancelledBy','cancellationReason','feeReminders',
  'studentLifecycle','learningProgress','monthlyFee','monthlyFees','feeReceipts',
  'feePlan','feeStartDate','feeWaiver','payment','photo'
]);
const paymentFields = new Set(['status','amount','paidAt','verifiedAt','method','date','provider','orderId','paymentId']);

function sanitise(value, depth = 0) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return value.length > 3000 ? {text:value.slice(0,3000),truncated:true,sha256:hash(value)} : value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (depth >= 8) return {omitted:true,reason:'depth limit'};
  if (Array.isArray(value)) return value.length > 100 ? {omitted:true,reason:'array limit',count:value.length} : value.map(item => sanitise(item,depth+1));
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    const entries=Object.entries(value);
    if(entries.length>150)return {omitted:true,reason:'map limit',count:entries.length};
    return Object.fromEntries(entries.map(([key,item]) => [key, privateKey.test(key) ? {redacted:true} : sanitise(item,depth+1)]));
  }
  return {omitted:true,reason:'unsupported value'};
}

function bounded(value) {
  const json=JSON.stringify(value);
  return Buffer.byteLength(json)>12000 ? {omitted:true,reason:'size limit',sha256:hash(json),bytes:Buffer.byteLength(json)} : value;
}

function valueFor(field,value,present) {
  if(!present)return {present:false};
  if(field==='photo')return {present:true,hasPhoto:typeof value==='string'&&!!value,sha256:hash(JSON.stringify(sanitise(value)))};
  if(privateKey.test(field)||!visibleFields.has(field))return {present:true,redacted:true};
  if(field==='payment'&&value&&typeof value==='object')value=Object.fromEntries(Object.entries(value).filter(([key])=>paymentFields.has(key)));
  return {present:true,value:bounded(sanitise(value))};
}

// Only trusted CloudEvent context supplies identity. Never use updatedBy,
// lifecycle history, names, or any client-writable field as the audit actor.
export function auditEvent(event) {
  if(!event?.id||!event.project||!event.database||!event.params?.applicationId||!event.time)throw Error('Incomplete audit event context.');
  const occurredAt=new Date(event.time).toISOString();
  const before=event.data?.before,after=event.data?.after;
  if(!before||!after)throw Error('Audit snapshots are missing.');
  if(!before.exists&&!after.exists)return null;
  const old=before.exists?before.data():{},next=after.exists?after.data():{};
  const changed=Object.keys({...old,...next}).filter(field=>!Object.hasOwn(old,field)||!Object.hasOwn(next,field)||!isDeepStrictEqual(old[field],next[field])).sort();
  if(!changed.length)return null;
  const changes=[];
  for(const field of changed.slice(0,100)) {
    // Only the affected month or receipt is copied, rather than every historical payment.
    if(['monthlyFees','feeReceipts'].includes(field)&&old[field]&&next[field]&&typeof old[field]==='object'&&typeof next[field]==='object'&&!Array.isArray(old[field])&&!Array.isArray(next[field])) {
      const keys=Object.keys({...old[field],...next[field]}).filter(key=>!isDeepStrictEqual(old[field][key],next[field][key])||!Object.hasOwn(old[field],key)||!Object.hasOwn(next[field],key));
      for(const key of keys.slice(0,100))changes.push({field:field+'.'+key.slice(0,180),before:{present:Object.hasOwn(old[field],key),value:bounded(sanitise(old[field][key]??null))},after:{present:Object.hasOwn(next[field],key),value:bounded(sanitise(next[field][key]??null))}});
      if(keys.length>100)changes.push({field,omitted:true,reason:'entry limit',changedEntries:keys.length});
    } else changes.push({field:field.slice(0,180),before:valueFor(field,old[field],Object.hasOwn(old,field)),after:valueFor(field,next[field],Object.hasOwn(next,field))});
  }
  // All entries still identify the changed field if unusually large history would
  // exceed the Firestore document budget. No student document is ever modified.
  let bytes=0;
  const safeChanges=changes.slice(0,200).map(change=>{bytes+=Buffer.byteLength(JSON.stringify(change));return bytes>240000?{field:change.field,omitted:true,reason:'event size limit'}:change;});
  const principal=typeof event.authId==='string'&&event.authId ? event.authId.slice(0,500) : null;
  return {
    id:hash([event.project,event.database,event.id].join('\n')),
    schemaVersion:1,sourceEventId:event.id,applicationId:event.params.applicationId,
    occurredAt,sourceEventTime:event.time,operation:!before.exists?'created':!after.exists?'deleted':'updated',
    actor:{type:event.authType||'unknown',principal,source:'firestore-auth-context',attribution:principal?'server-principal':'unavailable'},
    changedFieldCount:changed.length,changes:safeChanges,
    limited:changed.length>100||changes.length>200||safeChanges.some(change=>change.omitted||change.before?.value?.omitted||change.after?.value?.omitted)
  };
}

export async function recordAudit(event,{create,now=()=>new Date().toISOString()}) {
  const entry=auditEvent(event);if(!entry)return {skipped:true};
  const {id,...payload}=entry;
  try {await create(id,{...payload,recordedAt:now()});}
  catch(error) {
    // Firestore create() is atomic: concurrent deliveries cannot overwrite or duplicate.
    if(error.code===6||error.code==='already-exists')return {id,duplicate:true};
    throw error; // Eventarc retries; never acknowledge a failed log write.
  }
  return {id,created:true};
}

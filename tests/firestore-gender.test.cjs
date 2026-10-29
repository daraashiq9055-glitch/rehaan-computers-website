// Run ONLY with the local demo emulator. NODE_PATH points to isolated test dependencies.
const {readFileSync}=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,updateDoc,deleteDoc}=require('firebase/firestore');
(async()=>{
 if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8088') throw Error('Requires local emulator at 127.0.0.1:8088');
 const env=await initializeTestEnvironment({projectId:'demo-rehaan-gender',firestore:{host:'127.0.0.1',port:8088,rules:readFileSync('firestore.rules','utf8')}});
 try {
  await env.clearFirestore(); // Repeatable fixtures: public setDoc must exercise create, not an old record update.
  const db=env.unauthenticatedContext().firestore();
  const base={fullName:'Test Student',phone:'9876543210',coursePreference:'Diploma',status:'Pending Payment',payment:{status:'awaiting',amount:100},paymentToken:'test-token-1234567890'};
  let id=0;
  for(const gender of [undefined,'','male','female','other','prefer_not_to_say']) {
   await assertSucceeds(setDoc(doc(db,'applications',String(++id)),{...base,...(gender===undefined?{}:{gender})}));
  }
  for(const gender of ['invalid',42,null,{},['male']]) await assertFails(setDoc(doc(db,'applications',String(++id)),{...base,gender}));
  for(const payment of [{status:'paid',amount:100},{status:'awaiting',amount:100,verified:true},{status:'awaiting',amount:100,providerId:'injected'}]) await assertFails(setDoc(doc(db,'applications',String(++id)),{...base,gender:'female',payment}));
  for(const extra of [{admissionNumber:'001'},{channel:'offline'},{status:'Approved'},{unknown:'injected'},{markCard:{title:'injected'}},{feeReceipts:{fake:{amount:100}}}]) await assertFails(setDoc(doc(db,'applications',String(++id)),{...base,...extra}));
  for(const payment of [{status:'awaiting',amount:0},{status:'awaiting',amount:99},{status:'awaiting',amount:101}]) await assertFails(setDoc(doc(db,'applications',String(++id)),{...base,payment}));
  for(const phone of ['abcdefghij','987654321','98765432100']) await assertFails(setDoc(doc(db,'applications',String(++id)),{...base,phone}));
  for(const photo of ['javascript:alert(1)','data:image/svg+xml;base64,PHN2Zy8+','https://evil.example/photo.jpg']) await assertFails(setDoc(doc(db,'applications',String(++id)),{...base,photo}));
  for(const photo of ['', 'data:image/jpeg;base64,/9j/AA==','https://res.cloudinary.com/salatmdv/image/authenticated/v123/student-photos/12345678-1234-4123-8123-123456789abc.jpg']) await assertSucceeds(setDoc(doc(db,'applications',String(++id)),{...base,photo}));
  const existing=doc(db,'applications','1');
  await assertFails(getDoc(existing));await assertFails(updateDoc(existing,{gender:'male'}));await assertFails(deleteDoc(existing));
  await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'admins','test-admin'),{uid:'test-admin',isAdmin:true}));
  const admin=env.authenticatedContext('test-admin').firestore();
  const legacy=doc(admin,'applications','1');
  await assertSucceeds(getDoc(legacy));await assertSucceeds(updateDoc(legacy,{gender:'female'}));
  const updated=(await getDoc(legacy)).data();
  require('node:assert/strict').deepEqual(updated.payment,base.payment);
  await assertFails(getDoc(doc(env.authenticatedContext('not-admin').firestore(),'applications','1')));
  console.log('PASS: optional gender choices, invalid values, payment/privilege injection, public denial and admin legacy edit');
 } finally {await env.cleanup();}
})().catch(error=>{console.error(error);process.exitCode=1});

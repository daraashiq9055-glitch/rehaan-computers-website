import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read = name => readFileSync(new URL('../'+name, import.meta.url),'utf8');

test('Hosting uses public and revalidates the visitor module graph without altering admin cache protection',()=>{
  const config=JSON.parse(read('firebase.json'));
  assert.equal(config.hosting.public,'public');
  for(const source of ['/','/index.html','/script.js','/visitor/**','/admin**','/photo-storage*.js'])
    assert.ok(config.hosting.headers.some(entry=>entry.source===source && entry.headers.some(header=>header.key==='Cache-Control' && header.value==='no-cache')),source);
  const html=read('public/index.html');
  assert.match(html,/data-visitor-design="premium"/);
  assert.doesNotMatch(html,/COMPLETE DESIGN PREVIEW|PREVIEW MODE|data-action="sample-photo"|localhost|127\.0\.0\.1|previews\//);
  assert.match(html,/visitor\/app\.js\?v=20261020-visitor-1/);
  assert.ok(html.indexOf('</header>')<html.indexOf('class="skills-line"'));
  const js=read('public/visitor/admission.js');
  assert.match(js,/import\("\.\.\/script\.js\?v=20261020-visitor-1"\)/);
  assert.match(js,/await core\.submitApplication\(event\)/);
  assert.doesNotMatch(js,/addDoc|updateDoc|razorpay_signature|\/create-order|paymentToken\s*:/);
});

test('production catalogue retains the complete approved curricula and supports valid public PDF brochures',async()=>{
  const preview=JSON.parse(read('previews/premium-home/courses.json'));
  assert.deepEqual(JSON.parse(read('public/visitor/courses.json')),preview);
  assert.deepEqual(JSON.parse(read('public/visitor/site.json')),JSON.parse(read('previews/premium-home/site.json')));
  const {brochurePDF}=await import('../public/visitor/model.js');
  for(const course of preview){
    const text=await brochurePDF(course).text();
    assert.ok(text.startsWith('%PDF-1.4'));
    assert.ok(text.includes('Rehaan Computers course guide'));
    assert.ok(!text.includes('Design-preview'));
  }
});

// Digests recorded from the live-matching code at 26505c0 before integration.
test('admission validation/persistence/processing implementation remains identical to the live baseline',()=>{
  const source=read('public/script.js');
  const block=source.slice(source.indexOf('function validateApplication(data)'),source.indexOf('let studentPhotoDataUrl ='));
  assert.equal(createHash('sha256').update(block).digest('hex'),'ae499c4208793119f9d2ccba16d13477fe955c62d98b9b4560cc726df98b52bf');
});
test('photo validation/persistence/processing implementation remains identical to the live baseline',()=>{
  const source=read('public/script.js');
  const block=source.slice(source.indexOf('let studentPhotoDataUrl ='),source.indexOf('let paymentApplicationId ='));
  assert.equal(createHash('sha256').update(block).digest('hex'),'f3bae41bf13438df67aa2f9acefcf5927168bd03384ca7c6d6bef68f8725562f');
});
test('payment validation/persistence/processing implementation remains identical to the live baseline',()=>{
  const source=read('public/script.js');
  const block=source.slice(source.indexOf('let paymentApplicationId ='),source.indexOf('function paymentLabel'));
  assert.equal(createHash('sha256').update(block).digest('hex'),'d2a92261b642f7b6dd00328ece8e8756d022b103b0bd120d40a905cb7dd54c7d');
});

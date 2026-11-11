'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { findCliRoot, configureUploads, selectRelease } = require('../tools/deploy-hosting.cjs');

test('slow uploads get two minutes while larger existing timeouts are retained', () => {
  class Uploader { uploadTimeout(size) { return size; } }
  const previous = process.env.FIREBASE_HOSTING_UPLOAD_CONCURRENCY;
  try {
    configureUploads(Uploader);
    assert.equal(new Uploader().uploadTimeout(30000), 120000);
    assert.equal(new Uploader().uploadTimeout(600000), 600000);
    assert.equal(process.env.FIREBASE_HOSTING_UPLOAD_CONCURRENCY, '1');
    assert.throws(() => configureUploads(class {}), /Unsupported/);
  } finally {
    if (previous === undefined) delete process.env.FIREBASE_HOSTING_UPLOAD_CONCURRENCY;
    else process.env.FIREBASE_HOSTING_UPLOAD_CONCURRENCY = previous;
  }
});

test('only the pinned Firebase package on the npm execution path is accepted', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firebase-upload-test-'));
  try {
    const bin = path.join(root, 'node_modules/.bin');
    const cli = path.join(root, 'node_modules/firebase-tools');
    fs.mkdirSync(bin, { recursive: true });fs.mkdirSync(cli);
    const file = path.join(cli, 'package.json');
    fs.writeFileSync(file, JSON.stringify({name:'firebase-tools',version:'15.34.0'}));
    assert.equal(findCliRoot(bin), cli);
    fs.writeFileSync(file, JSON.stringify({name:'firebase-tools',version:'14.0.0'}));
    assert.throws(() => findCliRoot(bin), /npx/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('deployment requires premium admin and refuses a stale homepage or database config', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'firebase-release-test-'));
  const release = path.join(root, 'build/admin-release');
  try {
    assert.throws(() => selectRelease(root), /Build the premium/);
    fs.mkdirSync(path.join(root, 'public'), { recursive: true });
    fs.mkdirSync(path.join(release, 'public/admin-ui'), { recursive: true });
    fs.writeFileSync(path.join(release, 'RELEASE.json'), JSON.stringify({generated:true,source:'prepare-admin-release.py'}));
    const config = path.join(release, 'firebase.json');
    fs.writeFileSync(config, JSON.stringify({hosting:{public:'public'}}));
    for (const name of ['main.js','theme.css']) fs.writeFileSync(path.join(release,'public/admin-ui',name),'');
    fs.writeFileSync(path.join(release,'public/admin.html'),'admin-ui/main.js admin-ui/theme.css');
    fs.writeFileSync(path.join(root,'public/index.html'),'approved homepage');
    fs.writeFileSync(path.join(release,'public/index.html'),'old homepage');
    assert.throws(() => selectRelease(root), /Stale release asset/);
    fs.writeFileSync(path.join(release,'public/index.html'),'approved homepage');
    assert.equal(selectRelease(root), release);
    fs.writeFileSync(config, JSON.stringify({hosting:{public:'public'},firestore:{rules:'rules'}}));
    assert.throws(() => selectRelease(root), /Build the premium/);
    fs.writeFileSync(config, JSON.stringify({hosting:{public:'public'}}));
    fs.writeFileSync(path.join(release,'public/admin.html'),'old admin');
    assert.throws(() => selectRelease(root), /Build the premium/);
  } finally { fs.rmSync(root, {recursive:true,force:true}); }
});

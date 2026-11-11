'use strict';

// Use the pinned CLI without editing its installed files or authentication.
const fs = require('node:fs');
const path = require('node:path');
const CLI_VERSION = '15.34.0';
const UPLOAD_TIMEOUT_MS = 120000;

function findCliRoot(searchPath = process.env.PATH || process.env.Path || '') {
  for (const directory of searchPath.split(path.delimiter).filter(Boolean)) {
    const candidate = path.resolve(directory.replace(/^"|"$/g, ''), '..', 'firebase-tools');
    const manifest = path.join(candidate, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const info = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (info.name === 'firebase-tools' && info.version === CLI_VERSION) return candidate;
  }
  throw new Error(`Run with: npx --yes --package=firebase-tools@${CLI_VERSION} -c "node tools/deploy-hosting.cjs"`);
}

function configureUploads(Uploader) {
  if (typeof Uploader?.prototype?.uploadTimeout !== 'function') {
    throw new Error('Unsupported Firebase uploader; no deployment started.');
  }
  const originalTimeout = Uploader.prototype.uploadTimeout;
  Uploader.prototype.uploadTimeout = function (filePath) {
    return Math.max(UPLOAD_TIMEOUT_MS, originalTimeout.call(this, filePath));
  };
  process.env.FIREBASE_HOSTING_UPLOAD_CONCURRENCY = '1';
}

function selectRelease(repositoryRoot) {
  const release = path.join(repositoryRoot, 'build', 'admin-release');
  const manifest = path.join(release, 'RELEASE.json');
  const fail = () => { throw new Error('Build the premium admin release first: python prepare-admin-release.py. No deployment started.'); };
  if (!fs.existsSync(manifest)) fail();
  const marker = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  if (!marker.generated || marker.source !== 'prepare-admin-release.py') fail();
  const config = JSON.parse(fs.readFileSync(path.join(release, 'firebase.json'), 'utf8'));
  if (config.hosting?.public !== 'public' || config.firestore) fail();
  for (const name of ['main.js', 'theme.css']) {
    if (!fs.existsSync(path.join(release, 'public/admin-ui', name))) fail();
  }
  const html = fs.readFileSync(path.join(release, 'public/admin.html'), 'utf8');
  if (!html.includes('admin-ui/main.js') || !html.includes('admin-ui/theme.css')) fail();
  // The generated admin files intentionally differ; every other source asset
  // must match, so an old build cannot replace the approved homepage.
  function verify(directory, relative = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const name = path.join(relative, entry.name);
      if (entry.isDirectory()) verify(path.join(directory, entry.name), name);
      else if (!['admin.html', 'admin-app.js', 'admin-fix.js'].includes(name)) {
        const generated = path.join(release, 'public', name);
        if (!fs.existsSync(generated) || !fs.readFileSync(path.join(directory, entry.name)).equals(fs.readFileSync(generated))) {
          throw new Error(`Stale release asset: ${name}. Run python prepare-admin-release.py again. No deployment started.`);
        }
      }
    }
  }
  verify(path.join(repositoryRoot, 'public'));
  return release;
}

function main(args = process.argv.slice(2)) {
  if (args.some(arg => arg !== '--check')) throw new Error('Only --check is supported.');
  const root = path.resolve(__dirname, '..');
  const release = selectRelease(root);
  const cliRoot = findCliRoot();
  const { Uploader } = require(path.join(cliRoot, 'lib/deploy/hosting/uploader.js'));
  configureUploads(Uploader);
  const probe = { sizeMap: { small: 100000, large: 100000000 } };
  if (Uploader.prototype.uploadTimeout.call(probe, 'small') !== UPLOAD_TIMEOUT_MS ||
      Uploader.prototype.uploadTimeout.call(probe, 'large') !== 2000000) {
    throw new Error('Upload timeout verification failed; no deployment started.');
  }
  console.log(`Firebase ${CLI_VERSION}: one upload at a time; minimum upload timeout 120 seconds.`);
  console.log('Hosting source: build/admin-release/public (premium admin and current homepage).');
  if (args.includes('--check')) {
    console.log('Configuration verified. No upload or release was started.');
    return;
  }
  process.chdir(release);
  const cli = path.join(cliRoot, 'lib/bin/firebase.js');
  process.argv = [process.execPath, cli, 'deploy', '--only', 'hosting', '--project', 'rehaan-computers'];
  require(cli);
}

module.exports = { findCliRoot, configureUploads, selectRelease, UPLOAD_TIMEOUT_MS };
if (require.main === module) {
  try { main(); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

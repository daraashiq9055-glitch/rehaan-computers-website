"""Check the complete admin release; deploy only with --deploy after every check passes."""
from pathlib import Path
import argparse, os, re, shutil, subprocess, sys, json, urllib.request
ROOT=Path(__file__).resolve().parent

def run(args, *, cwd=ROOT, env=None):
    result=subprocess.run([str(x) for x in args],cwd=cwd,env=env)
    if result.returncode:
        raise RuntimeError('Command failed; remaining release steps were stopped.')

def tool(name):
    value=shutil.which(name)
    if not value:raise RuntimeError(f'{name} is not installed or not available in CMD.')
    return value

def check_notifications():
    request=urllib.request.Request('https://rehaan-website-updates.daraashiq9055.workers.dev/health',headers={'Origin':'https://rehaan-computers.web.app'})
    try:
        with urllib.request.urlopen(request,timeout=30) as response:
            if not json.load(response).get('ok'):raise ValueError('not ready')
    except Exception:
        raise RuntimeError('Browser notifications are not connected. Complete setup-notifications.py with your local sender key before deploying this release; see docs/next-admin-release.md.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--deploy',action='store_true',help='After successful checks, publish Firestore rules and the full Hosting candidate.')
    args=parser.parse_args()
    try:
        node,npm,npx,java=[tool(n) for n in ['node','npm','npx','java']]
        version=subprocess.run([java,'-version'],capture_output=True,text=True)
        match=re.search(r'version "(\d+)',version.stdout+version.stderr)
        if version.returncode or not match or int(match[1])<21:
            raise RuntimeError('Java 21 or newer is required for the local Firestore emulator. Install a JDK 21, reopen CMD, then run this command again.')
        if args.deploy:check_notifications()
        print('Checking code and building a separate candidate. No student data will be migrated.',flush=True)
        run([node,'--test',*[str(p) for p in sorted((ROOT/'tests').glob('*.test.mjs'))]])
        run([node,'tests/admin-fees.test.cjs'])
        run([sys.executable,'tests/admin-build-encoding.py'])
        deps=ROOT/'build/settings-test-tools'
        print('Preparing isolated test dependencies under build/settings-test-tools.',flush=True)
        run([npm,'install','--prefix',deps,'--no-audit','--no-fund','@firebase/rules-unit-testing@5.0.0','firebase@12.2.1'])
        env=os.environ.copy();env['NODE_PATH']=str(deps/'node_modules')
        # Demo project plus loopback guards in the test scripts prevent production writes.
        print('Verifying rules with the local emulator. This step must pass before deployment.',flush=True)
        run([npx,'--yes','firebase-tools@15.34.0','emulators:exec','--only','firestore','--project','demo-rehaan-settings','--config','firebase.emulator.json','node tests/admin-settings-rules.cjs && node tests/firestore-gender.test.cjs && node tests/admin-features-emulator.mjs'],env=env)
        run([sys.executable,'prepare-admin-release.py'])
        if not args.deploy:
            print('All local checks passed. Nothing deployed. Run python release-admin.py --deploy when ready.',flush=True)
            return
        print('Publishing reviewed Firestore rules; no student records are imported or replaced.',flush=True)
        run([npx,'--yes','firebase-tools@15.34.0','deploy','--only','firestore:rules','--project','rehaan-computers'])
        print('Publishing the complete generated website.',flush=True)
        run([npx,'--yes','firebase-tools@15.34.0','deploy','--only','hosting','--project','rehaan-computers'],cwd=ROOT/'build/admin-release')
        print('Deployment commands completed. Verify Settings, attendance, photos and normal payment workflows in the live admin.',flush=True)
    except (RuntimeError,OSError) as error:
        print('\nRelease stopped: '+str(error),file=sys.stderr)
        print('Do not bypass a failed check with a direct Hosting deployment. Review the output above.',file=sys.stderr)
        sys.exit(1)
if __name__=='__main__':main()

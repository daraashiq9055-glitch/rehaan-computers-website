"""Release gating: failures must prevent later publishing steps."""
import importlib.util, unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release',ROOT/'release-admin.py');release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
class ReleaseGuard(unittest.TestCase):
 def check_flow(self,fail_at=None,deploy=True):
  calls=[]
  def fake_run(args,**kwargs):
   args=[str(a) for a in args];calls.append(args)
   if (fail_at=='rules-test' and 'emulators:exec' in args) or (fail_at=='rules-deploy' and 'firestore:rules' in args):raise RuntimeError('simulated failure')
  with patch.object(release,'check_notifications',side_effect=RuntimeError('not ready') if fail_at=='notifications' else None),patch.object(release,'tool',side_effect=lambda value:value),patch.object(release,'run',side_effect=fake_run),patch.object(release.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='',stderr='openjdk version "21.0.1"')),patch.object(release.sys,'argv',['release-admin.py']+(['--deploy'] if deploy else [])):
   if fail_at:
    with self.assertRaises(SystemExit):release.main()
   else:release.main()
  return calls
 def test_failed_rule_test_never_deploys(self):self.assertFalse(any('deploy' in c for c in self.check_flow('rules-test')))
 def test_failed_rules_publish_never_publishes_hosting(self):self.assertFalse(any('hosting' in c for c in self.check_flow('rules-deploy')))
 def test_check_only_never_publishes(self):self.assertFalse(any('deploy' in c for c in self.check_flow(deploy=False)))
 def test_missing_notifications_never_deploys(self):self.assertFalse(any('deploy' in c for c in self.check_flow('notifications')))
 def test_successful_order(self):
  calls=self.check_flow();i=next(i for i,c in enumerate(calls) if 'emulators:exec' in c);r=next(i for i,c in enumerate(calls) if 'firestore:rules' in c);h=next(i for i,c in enumerate(calls) if 'hosting' in c);self.assertLess(i,r);self.assertLess(r,h)
if __name__=='__main__':unittest.main()

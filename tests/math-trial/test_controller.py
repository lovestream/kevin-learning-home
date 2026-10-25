"""Safety gates execute with SSH mocked: no NAS, credentials, or old state."""
import importlib.util, json, pathlib, tempfile, unittest, types, hashlib
from unittest.mock import patch
ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('math_controller',ROOT/'infra/math-trial/controller.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

class Safety(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='klh-math-offline-')
        self.private = pathlib.Path(self.temp.name)/'private'
        self.patcher = patch.object(m,'PRIVATE',self.private); self.patcher.start()
        self.args = types.SimpleNamespace(lan_ip='192.168.2.100',port=38444)
    def tearDown(self):
        self.patcher.stop(); self.temp.cleanup()
    def trial(self): return m.Trial(self.args)
    def test_frozen_main_and_unique_plan(self):
        self.assertEqual(m.PLAN['sourceSha'],'e594b3e6db0563f6a6b56bc2b0724f1bcd8c961e')
        self.assertEqual(m.PLAN['mainCiRun'],40085571114)
        self.assertEqual(m.PREFIX,'klh-math-trial-'+m.PLAN['runId'])
        self.assertNotEqual(m.PLAN['runId'],json.loads((ROOT/'infra/trial/plan.json').read_text())['runId'])
    def test_offline_constructor_has_no_side_effect(self):
        with patch.object(m.subprocess,'run',side_effect=AssertionError('NO_PROCESS')):
            t=self.trial(); self.assertFalse(self.private.exists())
            self.assertEqual(t.root,'/volume2/homes/admin/'+m.PREFIX)
    def test_old_port_and_other_ports_rejected(self):
        for p in [38443,443,38445]:
            self.args.port=p
            with self.assertRaises(AssertionError): self.trial()
    def test_other_hosts_rejected(self):
        for ip in ['0.0.0.0','127.0.0.1','192.168.2.101','100.64.0.1']:
            self.args.lan_ip=ip
            with self.assertRaises(AssertionError): self.trial()
    def test_private_symlink_rejected(self):
        self.private.symlink_to(self.temp.name,target_is_directory=True)
        with self.assertRaisesRegex(AssertionError,'PRIVATE_SYMLINK'): self.trial()
    def test_state_symlink_rejected(self):
        self.private.mkdir(); (self.private/'state.json').symlink_to('/nonexistent')
        with self.assertRaisesRegex(AssertionError,'STATE_SYMLINK'): self.trial()
    def test_old_state_rejected(self):
        self.private.mkdir();(self.private/'state.json').write_text(json.dumps({'plan':{'old':True}}))
        with self.assertRaises(AssertionError): self.trial()
    def test_private_permissions(self):
        t=self.trial();t.state={'plan':m.PLAN};t.save()
        self.assertEqual(self.private.stat().st_mode & 0o777,0o700)
        self.assertEqual(t.file.stat().st_mode & 0o777,0o600)
    def test_stop_refuses_wrong_owner_before_mutation(self):
        for label in [{}, {m.LABEL:'wrong'}]:
            t=self.trial();t.state={'containers':{'app':'a'*64},'imageId':'sha256:synthetic'}
            with patch.object(t,'inspect',return_value={'Id':'a'*64,'Name':'/'+m.PREFIX+'-app','Config':{'Labels':label},'Image':'sha256:synthetic'}),patch.object(t,'docker') as docker:
                with self.assertRaises((AssertionError,KeyError)):t.stop()
                docker.assert_not_called()
    def test_stop_refuses_wrong_id_or_name(self):
        for key,value in [('Id','b'*64),('Name','/old-production')]:
            t=self.trial();t.state={'containers':{'app':'a'*64},'imageId':'sha256:synthetic'}
            info={'Id':'a'*64,'Name':'/'+m.PREFIX+'-app','Config':{'Labels':{m.LABEL:m.PLAN['runId']}},'Image':'sha256:synthetic'};info[key]=value
            with patch.object(t,'inspect',return_value=info),patch.object(t,'docker') as docker:
                with self.assertRaises(AssertionError):t.stop()
                docker.assert_not_called()
    def test_invariance_detects_restart_or_id_changes(self):
        t=self.trial();t.state={'servicesBefore':[['id','/old','running','time',0]]}
        with patch.object(t,'services',return_value=[['id','/old','running','time',1]]):
            with self.assertRaisesRegex(AssertionError,'NON_TRIAL_SERVICE_CHANGED'):t.invariance()
    def test_transfer_outside_owned_root_rejected(self):
        with self.assertRaises(AssertionError):self.trial().upload('/not-read','/volume2/homes/admin/old/secret')
    def test_mutations_keep_formal_image_auth_and_no_global_changes(self):
        source=(ROOT/'infra/math-trial/controller.py').read_text()
        for required in ['KLH_MATH_READONLY=1','KLH_AUTH_MODE=production','--synthetic','--cpuset-cpus','--read-only','no-new-privileges:true','NON_TRIAL_SERVICE_CHANGED','NAS_IMAGE_EVIDENCE_MISMATCH']:
            self.assertIn(required,source)
        for forbidden in ['sudo -i','prune','38443:','/etc/sudoers','ignoreHTTPSErrors','infra/trial/']:
            self.assertNotIn(forbidden,source)
    def test_workflow_exact_archive_and_short_private_artifact(self):
        s=(ROOT/'.github/workflows/math-trial-image.yml').read_text()
        for token in ['git archive "$SOURCE_SHA"','linux/amd64','main-ci.json','build-evidence.json','retention-days: 1']:
            self.assertIn(token,s)
        self.assertNotIn('docker push',s);self.assertNotIn('nas-codex',s)
    def test_review_head_keeps_actual_nas_acceptance_harness(self):
        snapshot=json.loads((ROOT/'docs/implementation/evidence/math-nas-01/harness-files.json').read_text())
        expected={'tests/math-trial/browser.mjs','tests/math-trial/nas-evidence.mjs',
                  'infra/math-trial/controller.py','infra/math-trial/browser-trust.mjs',
                  'infra/math-trial/auth-budget.mjs','infra/math-trial/tls-proxy.mjs','infra/math-trial/plan.json'}
        self.assertEqual(set(snapshot['files']),expected)
        for name,digest in snapshot['files'].items():
            self.assertEqual(hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),digest,
                             'NAS_EVIDENCE_STALE_FOR_REVIEWED_HARNESS')

if __name__=='__main__':unittest.main()

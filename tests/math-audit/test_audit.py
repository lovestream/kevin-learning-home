import copy, importlib.util, json, pathlib, sys, unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/math-audit'))
from generate import IMPORT, GitSource, allowed_path, MATH_SHA
from check import validate
D=ROOT/'docs/implementation/evidence/math-00'

class AuditGate(unittest.TestCase):
 def setUp(self):
  self.i=json.loads((D/'source-inventory.json').read_text());self.c=json.loads((D/'readonly-contract.json').read_text())
 def rejects(self,code):
  with self.assertRaisesRegex(ValueError,code):validate(self.i,self.c)
 def test_committed_contract_and_inventory(self):self.assertEqual(validate(self.i,self.c)['prior17Verified'],True)
 def test_wrong_freeze_fails(self):self.i['source']['commit']='0'*40;self.rejects('FREEZE_MISMATCH')
 def test_missing_dependency_fails(self):self.i['edges'].append({'from':'missing.ts','to':'missing2.ts','kind':'static'});self.rejects('DEPENDENCY_NOT_INVENTORIED')
 def test_fs_resource_edges_required(self):self.i['edges']=[e for e in self.i['edges'] if e['to']!='content/course-plan-v2/grade-3.json'];self.rejects('MANUAL_RESOURCE_EDGE_MISSING')
 def test_prior17_hash_drift_fails(self):next(r for r in self.i['files'] if r['path']=='server/store.mjs')['sha256']='0'*64;self.rejects('PRIOR17_MISMATCH')
 def test_runtime_service_never_allow(self):next(r for r in self.i['files'] if r['path']=='server/index.mjs')['decision']='allow';self.rejects('UNSAFE_ALLOW')
 def test_real_paths_rejected_without_opening_them(self):
  for p in ['data/progress.sqlite','content/detective/inbox/a.json','.env','foo/../data/a','research/source-textbooks/a.pdf','private/a','foo/a.key','untracked.wordpack.json']:
   self.assertFalse(allowed_path(p),p)
  self.i['files'][0]['gitMode']='120000';self.rejects('SOURCE_MODE_INVALID')
 def test_source_status_change_fails(self):self.i['sourceBoundaryAfter']['statusSha256']='0'*64;self.rejects('SOURCE_CHANGED')
 def test_source_head_mismatch_stops_before_blob_read(self):
  class Fake(GitSource):
   def git(self,*args):
    if args==('rev-parse','HEAD'):return b'0'*40
    raise AssertionError('MUST_NOT_READ_SOURCE_AFTER_HEAD_MISMATCH')
  with self.assertRaisesRegex(ValueError,'SOURCE_HEAD_MISMATCH'):Fake('/tmp')
 def test_draft_status_cannot_be_upgraded(self):self.i['lessonInventory']['statusCounts']={'published':70};self.rejects('LESSON_FREEZE_MISMATCH')
 def test_hidden_nested_answer_cannot_enter_whitelist(self):self.c['objectFieldAllowlists']['classroom'].append('expectedExplanation');self.rejects('PUBLIC_DTO_LEAK')
 def test_import_scanner_distinguishes_methods_from_static_imports(self):
  text="import {a} from './a.mjs';\nimport type {B} from './b';\nstore.import('private');\nconst p='/api/import';\nconst c=await import('node:crypto');"
  self.assertEqual([a or b for a,b in IMPORT.findall(text)],['./a.mjs','./b','node:crypto'])

if __name__=='__main__':unittest.main()

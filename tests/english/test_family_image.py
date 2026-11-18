import importlib.util,json,pathlib,tempfile,unittest,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('english_family_image',ROOT/'infra/english-preview/family-image.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class FamilyImageTests(unittest.TestCase):
 def fixture(self,d):
  b={'sourceSha':m.SOURCE,'scope':'family-lan-source','publicationApproved':False,'cards':[{}]*6631,'groups':[{}]*665,'exerciseAnswers':{str(i):[] for i in range(128)},'media':{}}
  self.write(d,b);return b
 def write(self,d,b):
  raw=json.dumps(b).encode();(d/'bundle.json').write_bytes(raw);(d/'seal.json').write_text(json.dumps({'sourceSha':m.SOURCE,'scope':'family-lan-source','publicationApproved':False,'bundleSha256':hashlib.sha256(raw).hexdigest()}))
 def test_source_scope_hash_and_exact_counts_required_before_any_nas_mutation(self):
  with tempfile.TemporaryDirectory() as td:
   d=pathlib.Path(td);b=self.fixture(d);self.assertEqual(m.verify_bundle(d)[2],['seal.json','bundle.json'])
   for key,value in [('sourceSha','f'*40),('scope','public'),('publicationApproved',True),('cards',[])]:
    bad={**b,key:value};self.write(d,bad)
    with self.assertRaises(AssertionError):m.verify_bundle(d)
   self.write(d,b);(d/'bundle.json').write_text('{}')
   with self.assertRaises(AssertionError):m.verify_bundle(d)
 def test_only_fixed_content_hash_images_can_enter_private_context(self):
  with tempfile.TemporaryDirectory() as td:
   d=pathlib.Path(td);b=self.fixture(d)
   b['media']={'/preview-api/v1/english/media/escape.webp':{'path':'../../private-record.json','sha256':'a'*64,'bytes':1}}
   self.write(d,b)
   with self.assertRaises(AssertionError):m.verify_bundle(d)
 def test_symlink_does_not_read_external_data(self):
  with tempfile.TemporaryDirectory() as td:
   d=pathlib.Path(td);self.fixture(d);(d/'bundle.json').unlink();(d/'bundle.json').symlink_to('/nonexistent/private-data')
   with self.assertRaises(AssertionError):m.verify_bundle(d)
 def test_no_family_bundle_enters_public_build_context_or_source_tracking(self):
  self.assertIn('.english-family',(ROOT/'.dockerignore').read_text());self.assertIn('.english-family/',(ROOT/'.gitignore').read_text())
  self.assertNotIn('COPY .english-family',(ROOT/'infra/math-preview/Dockerfile').read_text())
if __name__=='__main__':unittest.main()

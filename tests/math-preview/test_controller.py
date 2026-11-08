import importlib.util,pathlib,unittest,copy,tempfile,json,os
from unittest.mock import patch
p=pathlib.Path(__file__).resolve().parents[2]/'infra/math-preview/controller.py'
spec=importlib.util.spec_from_file_location('preview_controller',p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class BoundaryTests(unittest.TestCase):
 def fixture(self,name):
  root='/volume2/homes/admin/'+module.OLD['resourcePrefix']
  mounts=[{'Destination':'/data','Source':root+'/data','RW':True},{'Destination':'/media','Source':root+'/media','RW':False},{'Destination':'/content','Source':root+'/content','RW':False}]
  return {'Name':'/'+name,'Config':{'Labels':{'org.kevin-learning-home.trial':module.OLD['runId']}},'Mounts':mounts,'HostConfig':{'PortBindings':{}}}
 def test_old_application_requires_exact_owner_and_synthetic_mounts(self):
  good=self.fixture(module.OLD_APP);module.validate_old(good,module.OLD_APP)
  for change in ['owner','source','write']:
   bad=copy.deepcopy(good)
   if change=='owner':bad['Config']['Labels']={}
   elif change=='source':bad['Mounts'][0]['Source']='/volume2/real-learning-data'
   else:bad['Mounts'][1]['RW']=True
   with self.assertRaises(AssertionError):module.validate_old(bad,module.OLD_APP)
 def test_unowned_tls_cannot_be_stopped(self):
  with self.assertRaises(AssertionError):module.owned({'Name':'/'+module.TLS,'Config':{'Labels':{}}},module.TLS)
 def test_docker_permission_denial_stops_before_remote_writes(self):
  c=object.__new__(module.Controller);calls=[]
  def denied(*args):calls.append(args);raise PermissionError('docker denied')
  c.docker=denied
  c.python=lambda *args:self.fail('remote filesystem touched')
  with self.assertRaises(PermissionError):c.preflight()
  self.assertEqual(calls,[('version','--format','{{.Server.Version}}')])
 def test_private_state_symlink_is_rejected_before_read_or_write(self):
  old=module.PRIVATE
  try:
   with tempfile.TemporaryDirectory() as d:
    root=pathlib.Path(d);(root/'real').mkdir();(root/'link').symlink_to(root/'real',target_is_directory=True)
    module.PRIVATE=root/'link'
    with self.assertRaisesRegex(AssertionError,'PRIVATE_SYMLINK'):module.Controller()
    self.assertEqual(list((root/'real').iterdir()),[])
  finally:module.PRIVATE=old

 def test_mount_order_is_irrelevant_but_permissions_are_not(self):
  row=self.fixture(module.OLD_APP);row.update(Id='synthetic-id',Image='synthetic-image',State={'Status':'running','StartedAt':'synthetic-start'},RestartCount=0)
  reordered=copy.deepcopy(row);reordered['Mounts'].reverse()
  self.assertEqual(module.stable(row),module.stable(reordered))
  reordered['Mounts'][0]['RW']=not reordered['Mounts'][0]['RW']
  self.assertNotEqual(module.stable(row),module.stable(reordered))

 def test_inherited_modes_are_fixed_only_after_owner_marker_matches(self):
  with tempfile.TemporaryDirectory() as d:
   root=pathlib.Path(d).resolve()/'owned';root.mkdir();(root/'artifacts').mkdir()
   marker=root/'owner-marker.json';marker.write_text(json.dumps(module.PLAN))
   for p in [root,root/'artifacts']:p.chmod(0o777)
   original_stat=os.stat
   def nas_stat(path,*args,**kwargs):
    row=list(original_stat(path,*args,**kwargs))
    if str(path).startswith(str(root)):row[4]=1024
    return os.stat_result(row)
   c=object.__new__(module.Controller);c.python=lambda code:exec(code,{})
   with patch.object(module,'ROOT',str(root)),patch('os.stat',side_effect=nas_stat):
    c.ensure_root()
    self.assertEqual(root.stat().st_mode&0o777,0o700)
    self.assertEqual((root/'artifacts').stat().st_mode&0o777,0o700)
    self.assertEqual(marker.stat().st_mode&0o777,0o600)
    marker.write_text('{}')
    with patch('os.chmod') as chmod:
     with self.assertRaises(AssertionError):c.ensure_root()
     chmod.assert_not_called()

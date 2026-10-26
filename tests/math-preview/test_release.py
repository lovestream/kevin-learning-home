import sys,pathlib,unittest,copy
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[2]/'infra/math-preview'))
import controller as m
from release import Release

class ReleaseTests(unittest.TestCase):
 def row(self,sha='a'*40):
  return {'name':m.PLAN['resourcePrefix']+'-'+sha[:12]+'-app','appId':'new-id','imageId':'new-image','buildSha':sha,'ip':'172.30.244.3'}
 def meta(self,row,ports=None):
  return {'Name':'/'+row['name'],'Id':row['appId'],'Image':row['imageId'],'Mounts':[], 'Config':{'User':'1024:100','Labels':{m.LABEL:m.PLAN['runId']}},'HostConfig':{'ReadonlyRootfs':True,'PortBindings':ports},'State':{'Running':True}}
 def test_release_app_requires_recorded_identity_nonroot_readonly_and_zero_mounts(self):
  r=object.__new__(Release);row=self.row();good=self.meta(row)
  class Fake:pass
  r.c=Fake();r.c.state={'releases':{'a'*40:row}}
  for mutation in ['id','image','mount','user','readonly','label','name']:
   bad=copy.deepcopy(good)
   if mutation=='id':bad['Id']='someone-else'
   if mutation=='image':bad['Image']='different-image'
   if mutation=='mount':bad['Mounts']=[{'Source':'real-data'}]
   if mutation=='user':bad['Config']['User']='root'
   if mutation=='readonly':bad['HostConfig']['ReadonlyRootfs']=False
   if mutation=='label':bad['Config']['Labels']={}
   if mutation=='name':bad['Name']='/other-service'
   r.c.inspect=lambda name:bad
   with self.assertRaises(AssertionError):r.app('a'*40)
  r.c.inspect=lambda name:good;self.assertEqual(r.app('a'*40)[0],row)

 def test_only_registered_exact_owned_release_is_excluded_from_protected_snapshot(self):
  c=object.__new__(m.Controller);row=self.row();c.state={'releases':{'a'*40:row}}
  good=self.meta(row);c.services=lambda:[good];self.assertEqual(c.protected(),[])
  for mutation in ['owner','mount','id']:
   bad=copy.deepcopy(good)
   if mutation=='owner':bad['Config']['Labels']={}
   if mutation=='mount':bad['Mounts']=[{'Source':'data'}]
   if mutation=='id':bad['Id']='replaced'
   c.services=lambda:[bad]
   with self.assertRaises(AssertionError):c.protected()

 def test_create_failure_after_staging_removal_restarts_previous_public_container(self):
  r=object.__new__(Release)
  class Fake:pass
  c=Fake();r.c=c;row=self.row();old={'name':m.APP,'appId':'old-id','imageId':'old-image','buildSha':'b'*40,'ip':m.PLAN['appIP']}
  ports={'4179/tcp':[{'HostIp':'192.168.2.100','HostPort':'38444'}]}
  c.state={'releases':{'a'*40:row},'origin':'http://192.168.2.100:38444'};calls=[]
  c.invariance=lambda:calls.append(('invariance',));c.save=lambda:None;c.env=lambda ip:['-e','peers']
  c.hardening=lambda:[]
  r.app=lambda sha:(row,self.meta(row)) if sha else (old,self.meta(old,ports))
  def inspect(name):
   if name==m.OLD_TLS:return {'State':{'Running':False}}
   raise RuntimeError('not present after removal')
  c.inspect=inspect
  def docker(*args):
   calls.append(args)
   if args[0]=='run':raise RuntimeError('CREATE_FAILED')
   return ''
  c.docker=docker;r.verify=lambda sha,public=False:{'buildSha':old['buildSha']}
  with patch('release.validate_old'):
   with self.assertRaisesRegex(RuntimeError,'CREATE_FAILED'):r.activate('a'*40)
  self.assertIn(('start','old-id'),calls)
  self.assertNotIn('activeRelease',c.state)
  self.assertNotIn('rollbackRelease',c.state)

 def test_docker_permission_failure_does_not_upload_or_touch_remote_directory(self):
  r=object.__new__(Release)
  class Fake:
   def preflight(self):raise PermissionError('docker denied')
   def ensure_root(self):raise AssertionError('must not create directory')
  r.c=Fake()
  with self.assertRaises(PermissionError):r.stage('not-opened','not-opened')

 def test_legacy_switch_and_rollback_refuse_when_versioned_release_is_active(self):
  c=object.__new__(m.Controller);c.state={'activeRelease':'a'*40}
  c.docker=lambda *a:self.fail('Docker mutation attempted')
  with self.assertRaisesRegex(AssertionError,'VERSIONED'):c.switch()
  with self.assertRaisesRegex(AssertionError,'VERSIONED'):c.rollback()

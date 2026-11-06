# Download only this repository's validated build artifact. Never print token or signed URL.
import os,sys,json,pathlib,subprocess,urllib.request,urllib.error,concurrent.futures,time,hashlib,zipfile,shutil
run_id,expected=sys.argv[1:]
assert run_id.isdigit() and len(expected)==40 and all(c in '0123456789abcdef' for c in expected)
base='repos/lovestream/kevin-learning-home/actions/runs/'+run_id
run=json.loads(subprocess.check_output(['gh','api',base],text=True));assert run['head_sha']==expected
artifacts=json.loads(subprocess.check_output(['gh','api',base+'/artifacts'],text=True))['artifacts']
a=next(a for a in artifacts if a['name']=='math-preview-image' and not a['expired'])
total=a['size_in_bytes'];assert 1000000<total<160*1024*1024
root=pathlib.Path('.evidence/math-onepass/release-'+expected[:12]);root.mkdir(mode=0o700,exist_ok=True)
if (root/'image.json').exists() and (root/'preview-amd64.tar.gz').exists():print('OWNED_ARTIFACT_ALREADY_EXTRACTED');sys.exit(0)
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args):return None
token=subprocess.check_output(['gh','auth','token'],text=True).strip()
req=urllib.request.Request('https://api.github.com/repos/lovestream/kevin-learning-home/actions/artifacts/'+str(a['id'])+'/zip',headers={'Authorization':'Bearer '+token,'User-Agent':'klh-owned-artifact-download'})
try:urllib.request.build_opener(NoRedirect).open(req,timeout=20);raise RuntimeError('EXPECTED_ARTIFACT_REDIRECT')
except urllib.error.HTTPError as e:
 if e.code!=302:raise RuntimeError('ARTIFACT_API_HTTP_'+str(e.code))
 url=e.headers['Location']
path=root/'artifact.zip.partial';fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_RDWR,0o600);os.ftruncate(fd,total);chunk=4*1024*1024
try:
 def fetch(start):
  end=min(start+chunk,total)-1
  for attempt in range(3):
   try:
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(urllib.request.Request(url,headers={'Range':f'bytes={start}-{end}','Accept-Encoding':'identity'}),timeout=30) as r:
     assert r.status==206 and r.headers['Content-Range']==f'bytes {start}-{end}/{total}'
     pos=start
     while pos<=end:
      b=r.read(min(256*1024,end+1-pos));assert b;os.pwrite(fd,b,pos);pos+=len(b)
    return end-start+1
   except Exception:
    if attempt==2:raise RuntimeError('OWNED_ARTIFACT_RANGE_FAILED_'+str(start))
    time.sleep(1)
 done=0
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for count in pool.map(fetch,range(0,total,chunk)):
   done+=count;print(json.dumps({'downloadedBytes':done,'totalBytes':total}),flush=True)
finally:os.close(fd)
with zipfile.ZipFile(path) as z:
 assert z.testzip() is None
 names={pathlib.PurePosixPath(n).name:n for n in z.namelist() if not n.endswith('/')}
 assert set(names)=={'image.json','preview-amd64.tar.gz'}
 for name in names:
  with z.open(names[name]) as source,open(root/name,'xb') as dest:shutil.copyfileobj(source,dest,1024*1024)
meta=json.loads((root/'image.json').read_text());assert meta['buildSha']==expected and meta['status']=='PASS_PREVIEW_IMAGE_CI'
h=hashlib.sha256()
with open(root/'preview-amd64.tar.gz','rb') as f:
 for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
assert h.hexdigest()==meta['archive']['sha256'] and (root/'preview-amd64.tar.gz').stat().st_size==meta['archive']['bytes']
path.unlink();print(json.dumps({'status':'ARTIFACT_VERIFIED','artifactId':a['id'],'buildSha':expected,'imageId':meta['imageId'],'directory':str(root)}),flush=True)

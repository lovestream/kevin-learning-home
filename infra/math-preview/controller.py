#!/usr/bin/env python3
"""Owned content-only deployment. No system/permission/DNS/Tailscale edits or real data reads."""
import argparse, hashlib, ipaddress, json, os, pathlib, shlex, subprocess, time

REPO = pathlib.Path(__file__).resolve().parents[2]
PLAN = json.loads((REPO / 'infra/math-preview/plan.json').read_text())
OLD = json.loads((REPO / 'infra/math-trial/plan.json').read_text())
PRIVATE = REPO / '.math-preview-private'
LABEL = 'org.kevin-learning-home.preview'
ROOT = '/volume2/homes/admin/' + PLAN['resourcePrefix']
APP = PLAN['resourcePrefix'] + '-app'
TLS = PLAN['resourcePrefix'] + '-tls'
NET = PLAN['resourcePrefix'] + '-net'
OLD_TLS = OLD['resourcePrefix'] + '-tls'
OLD_APP = OLD['resourcePrefix'] + '-app'


def sha_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def owned(meta, name):
    assert meta['Name'] == '/' + name, 'OWNED_NAME_MISMATCH'
    assert meta['Config']['Labels'].get(LABEL) == PLAN['runId'], 'OWNED_LABEL_MISMATCH'


def validate_old(meta, name):
    assert meta['Name'] == '/' + name, 'OLD_NAME_MISMATCH'
    assert meta['Config']['Labels'].get('org.kevin-learning-home.trial') == OLD['runId'], 'OLD_OWNER_MISMATCH'
    expected = '/volume2/homes/admin/' + OLD['resourcePrefix']
    mounts = {m['Destination']: (m['Source'], m['RW']) for m in meta['Mounts']}
    wanted = {'/tls': (expected + '/tls', False), '/trial-proxy.mjs': (expected + '/code/tls-proxy.mjs', False)} if name == OLD_TLS else {
        '/data': (expected + '/data', True), '/media': (expected + '/media', False), '/content': (expected + '/content', False)}
    assert mounts == wanted, 'OLD_MOUNTS_MISMATCH'
    if name == OLD_TLS:
        assert meta['HostConfig']['PortBindings'] == {'8443/tcp': [{'HostIp': PLAN['nasIP'], 'HostPort': str(PLAN['port'])}]}, 'OLD_PORT_MISMATCH'


def stable(meta):
    # Never serialize Env, auth values, Docker logs or data contents.
    return {k: meta[k] for k in ['Id', 'Name', 'Image']} | {'Mounts': sorted(meta['Mounts'], key=lambda m: m['Destination'])} | {
        'status': meta['State']['Status'], 'startedAt': meta['State']['StartedAt'],
        'restartCount': meta['RestartCount'], 'ports': meta['HostConfig']['PortBindings']}


class Controller:
    def __init__(self):
        assert not PRIVATE.is_symlink(), 'PRIVATE_SYMLINK'
        file = PRIVATE / 'state.json'
        assert not file.is_symlink(), 'STATE_SYMLINK'
        self.state = json.loads(file.read_text()) if file.exists() else {}
        assert not self.state or self.state['plan'] == PLAN, 'PLAN_CHANGED'

    def ssh(self, command, data=None):
        p = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'nas-codex', command], input=data, capture_output=True, timeout=300)
        if p.returncode:
            raise RuntimeError('NAS_COMMAND_FAILED_EXIT_' + str(p.returncode))
        return p.stdout

    def python(self, code, data=None):
        return self.ssh(shlex.join(['python3', '-c', code]), data).decode().strip()

    def docker(self, *args):
        return self.ssh(shlex.join(['sudo', '-n', '/usr/local/bin/docker', *args])).decode().strip()

    def inspect(self, name):
        return json.loads(self.docker('inspect', name))[0]

    def save(self):
        PRIVATE.mkdir(mode=0o700, exist_ok=True)
        assert PRIVATE.stat().st_uid == os.getuid()
        os.chmod(PRIVATE, 0o700)
        (PRIVATE / 'state.json').write_text(json.dumps(self.state, indent=2) + '\n')
        os.chmod(PRIVATE / 'state.json', 0o600)

    def services(self):
        ids = self.docker('ps', '-aq').split()
        return [json.loads(x) for x in self.docker('inspect', '--format', '{{json .}}', *ids).splitlines()]

    def protected(self):
        return sorted([stable(m) for m in self.services() if m['Name'].lstrip('/') not in [APP, TLS, OLD_TLS]], key=lambda m: m['Id'])

    def invariance(self):
        assert self.protected() == self.state['protectedBefore'], 'PROTECTED_SERVICE_CHANGED'
        assert self.old_files() == self.state['oldOwnedFilesBefore'], 'OLD_SYNTHETIC_OR_TLS_FILE_CHANGED'

    def old_files(self):
        root = '/volume2/homes/admin/' + OLD['resourcePrefix']
        return json.loads(self.python("""import os,json,hashlib
root=%r
out={}
for directory in ['data','tls']:
 for name in sorted(os.listdir(root+'/'+directory)):
  p=root+'/'+directory+'/'+name
  assert not os.path.islink(p)
  if os.path.isfile(p):
   h=hashlib.sha256()
   with open(p,'rb') as f:
    for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
   out[directory+'/'+name]={'bytes':os.stat(p).st_size,'sha256':h.hexdigest()}
print(json.dumps(out))""" % root))

    def preflight(self):
        # Permission failure happens before any remote mkdir/upload/container operation.
        self.docker('version', '--format', '{{.Server.Version}}')
        old_tls, old_app = self.inspect(OLD_TLS), self.inspect(OLD_APP)
        validate_old(old_tls, OLD_TLS); validate_old(old_app, OLD_APP)
        assert old_app['State']['Running'], 'OLD_APP_NOT_RUNNING'
        details = json.loads(self.python("""import os,json,subprocess
parent='/volume2/homes/admin';root=%r;old=%r
assert os.path.realpath(parent)==parent and os.stat(parent).st_uid==1024
assert os.access(parent,os.W_OK) and os.statvfs(parent).f_bavail*os.statvfs(parent).f_frsize>1024**3
assert json.load(open(old+'/owner-marker.json'))==%r
print(json.dumps({'parent':parent,'uid':os.getuid(),'rootExists':os.path.exists(root),'oldMarkerVerified':True,'filesystem':subprocess.check_output(['stat','-f','-c','%%T',parent]).decode().strip()}))""" % (ROOT, '/volume2/homes/admin/' + OLD['resourcePrefix'], OLD)))
        assert details['uid'] == 1024 and details['filesystem'] in ['btrfs', 'ext2/ext3', 'ext4'], 'LOCAL_OWNED_FILESYSTEM_REQUIRED'
        if self.state:
            self.invariance()
        else:
            assert not details['rootExists'], 'UNOWNED_EXISTING_ROOT'
            self.state = {'plan': PLAN, 'oldTLS': stable(old_tls), 'oldApp': stable(old_app), 'protectedBefore': self.protected(), 'oldOwnedFilesBefore': self.old_files(), 'preflight': details, 'origin': PLAN['proposedOrigin']}
            self.save()
        return {'status': 'READ_ONLY_PREFLIGHT_PASS', 'protectedContainers': len(self.state['protectedBefore']), 'filesystem': details['filesystem'], 'oldTLSId': old_tls['Id'], 'oldAppId': old_app['Id'], 'newNASWrites': False}

    def ensure_root(self):
        self.python("""import os,json
root=%r;plan=%r
if not os.path.exists(root):
 os.mkdir(root,0o700)
 with open(root+'/owner-marker.json','x') as f:json.dump(plan,f)
 os.chmod(root+'/owner-marker.json',0o600)
 for name in ['artifacts']:os.mkdir(root+'/'+name,0o700)
assert os.path.realpath(root)==root and os.stat(root).st_uid==1024
assert not os.path.islink(root+'/owner-marker.json')
assert json.load(open(root+'/owner-marker.json'))==plan
os.chmod(root,0o700)
os.chmod(root+'/owner-marker.json',0o600)
for name in ['artifacts']:
 p=root+'/'+name
 assert os.path.realpath(p)==p and os.stat(p).st_uid==1024
 os.chmod(p,0o700)
 assert os.path.realpath(p)==p and os.stat(p).st_uid==1024 and os.stat(p).st_mode&0o777==0o700
""" % (ROOT, PLAN))

    def stage(self, archive, proof):
        self.preflight()
        meta = json.loads(pathlib.Path(proof).read_text())
        assert meta['status'] == 'PASS_PREVIEW_IMAGE_CI' and meta['architecture'] == 'linux/amd64'
        assert meta['buildSha'] == subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip(), 'LATEST_HEAD_IMAGE_REQUIRED'
        assert meta['appMounts'] == 0 and meta['formalServerOrSQLiteInImage'] is False and meta['realLANHTTP'] is True
        assert sha_file(archive) == meta['archive']['sha256'], 'IMAGE_ARCHIVE_HASH_MISMATCH'
        assert pathlib.Path(archive).stat().st_size == meta['archive']['bytes']
        self.ensure_root()
        remote = ROOT + '/artifacts/preview-amd64.tar.gz'
        exists = self.python('import os;print(os.path.exists(%r))' % remote) == 'True'
        if not exists:
            with open(archive, 'rb') as source:
                p = subprocess.run(['ssh', '-o', 'BatchMode=yes', 'nas-codex', shlex.join(['python3', '-c', "import os,sys,shutil;f=open(%r,'xb');os.chmod(%r,0o600);shutil.copyfileobj(sys.stdin.buffer,f);f.close()" % (remote, remote)])], stdin=source, capture_output=True, timeout=300)
                assert p.returncode == 0, 'OWNED_IMAGE_UPLOAD_FAILED'
        actual = self.python("import hashlib;h=hashlib.sha256();f=open(%r,'rb');\nfor b in iter(lambda:f.read(1048576),b''):h.update(b)\nprint(h.hexdigest())" % remote)
        assert actual == meta['archive']['sha256'], 'REMOTE_ARCHIVE_HASH_MISMATCH'
        self.docker('load', '-i', remote)
        image = json.loads(self.docker('image', 'inspect', meta['imageId']))[0]
        assert image['Config']['Labels']['org.opencontainers.image.revision'] == meta['buildSha']
        assert image['Config']['Labels']['org.kevin-learning-home.mode'] == 'content-only-preview'
        assert image['Architecture'] == 'amd64' and image['Config']['User'] == 'node'
        tag = PLAN['resourcePrefix'] + ':' + meta['buildSha'][:12]
        self.docker('tag', image['Id'], tag)
        if meta.get('imageTag', '').startswith('klh-content-ci:'):
            assert json.loads(self.docker('image', 'inspect', meta['imageTag']))[0]['Id'] == image['Id']
            self.docker('image', 'rm', meta['imageTag'])
        nets = json.loads(self.docker('network', 'inspect', *self.docker('network', 'ls', '-q').split()))
        existing = next((n for n in nets if n['Name'] == NET), None)
        if existing:
            assert existing.get('Labels', {}).get(LABEL) == PLAN['runId']
        else:
            subnet = ipaddress.ip_network(PLAN['subnet'])
            for n in nets:
                for cfg in n.get('IPAM', {}).get('Config') or []:
                    if cfg.get('Subnet'):
                        other = ipaddress.ip_network(cfg['Subnet'])
                        assert other.version != subnet.version or not subnet.overlaps(other), 'DOCKER_SUBNET_COLLISION'
            self.docker('network', 'create', '--subnet', PLAN['subnet'], '--gateway', '172.30.244.1', '--label', LABEL + '=' + PLAN['runId'], NET)
        args = ['run', '-d', '--name', APP, *self.hardening(), '--memory', '256m', '--network', NET, '--ip', PLAN['appIP'], *self.env(PLAN['appIP']), image['Id']]
        if 'appId' not in self.state:
            self.state['appId'] = self.docker(*args); self.save()
        app = self.inspect(APP); owned(app, APP)
        assert app['Id'] == self.state['appId'] and app['Image'] == image['Id'] and not app['Mounts'] and not app['HostConfig']['PortBindings']
        self.state.update(imageId=image['Id'], buildSha=meta['buildSha'], imageTag=tag)
        for _ in range(60):
            try:
                result = self.app_probe('/preview-api/v1/runtime')
                assert result['status'] == 200 and result['data']['buildSha'] == meta['buildSha']
                break
            except Exception:
                time.sleep(.2)
        else:
            raise RuntimeError('STAGED_PREVIEW_NOT_READY')
        self.save(); self.invariance()
        return {'status': 'NAS_INTERNAL_STAGED_NOT_USER_DELIVERED', 'buildSha': meta['buildSha'], 'imageId': image['Id'], 'appId': app['Id'], 'appMounts': 0, 'publishedPorts': 0, 'old38444Untouched': True}

    def hardening(self):
        return ['--label', LABEL + '=' + PLAN['runId'], '--label', 'com.centurylinklabs.watchtower.enable=false', '--user', '1024:100', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--cpuset-cpus', '0', '--restart', 'unless-stopped']

    def env(self, bind):
        return ['-e', 'KLH_CONTENT_PREVIEW=1', '-e', 'KLH_PREVIEW_RUNTIME=isolated-container', '-e', 'KLH_PREVIEW_BIND=' + bind, '-e', 'KLH_PREVIEW_ORIGIN=' + self.state['origin'], '-e', 'KLH_PREVIEW_PEERS=192.168.2.0/24,127.0.0.0/8,172.30.244.1/32,172.30.244.2/32']

    def app_probe(self, path):
        script = "import http from 'node:http';const r=await new Promise((resolve,reject)=>{http.get({host:%s,port:4179,path:%s,headers:{Host:%s}},r=>{let b='';r.on('data',x=>b+=x);r.on('end',()=>resolve({status:r.statusCode,data:JSON.parse(b)}));}).on('error',reject);});console.log(JSON.stringify(r));" % (json.dumps(PLAN['appIP']), json.dumps(path), json.dumps(self.state['origin'].split('://')[1]))
        return json.loads(self.docker('exec', APP, 'node', '--input-type=module', '-e', script))

    def wait_public(self):
        import urllib.request
        for _ in range(60):
            try:
                request=urllib.request.Request(self.state['origin']+'/preview-api/v1/runtime',headers={'Cache-Control':'no-store'})
                opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
                with opener.open(request,timeout=3) as response: actual=json.load(response)
                assert actual['buildSha']==self.state['buildSha'] and actual['lessons']==70 and actual['database'] is False
                return actual
            except Exception:time.sleep(.25)
        raise RuntimeError('NAS_PUBLIC_HTTP_VERSION_NOT_READY')

    def switch(self):
        assert self.state.get('imageId') and self.state['origin']=='http://192.168.2.100:38444', 'STAGED_HTTP_IMAGE_REQUIRED'
        self.invariance()
        old=self.inspect(OLD_TLS);validate_old(old,OLD_TLS)
        assert old['Id']==self.state['oldTLS']['Id'] and old['Image']==self.state['oldTLS']['Image']
        current=self.inspect(APP);owned(current,APP)
        assert current['Id']==self.state['appId'] and current['Image']==self.state['imageId'] and not current['Mounts']
        if old['State']['Running']:self.docker('stop',old['Id'])
        try:
            ports=current['HostConfig']['PortBindings'] or {}
            if not ports:
                self.docker('rm','-f',current['Id'])
                self.state.pop('appId');self.save()
                args=['run','-d','--name',APP,*self.hardening(),'--memory','256m','--network',NET,'--ip',PLAN['appIP'],*self.env(PLAN['appIP']),'-p','192.168.2.100:38444:4179',self.state['imageId']]
                self.state['appId']=self.docker(*args);self.save()
            else:
                assert ports=={'4179/tcp':[{'HostIp':'192.168.2.100','HostPort':'38444'}]}, 'UNEXPECTED_PREVIEW_PORTS'
                if not current['State']['Running']:self.docker('start',current['Id'])
            actual=self.wait_public();self.invariance()
        except Exception:
            self.rollback()
            raise
        self.state['active']='preview-http';self.save()
        return {'status':'NAS_HTTP_ACTIVE','origin':self.state['origin'],'buildSha':actual['buildSha'],'appId':self.state['appId'],'oldTLSRetained':old['Id'],'certificateOrTailscaleChanges':False}

    def rollback(self):
        assert self.state, 'PREFLIGHT_REQUIRED'
        self.invariance()
        old=self.inspect(OLD_TLS);validate_old(old,OLD_TLS)
        assert old['Id']==self.state['oldTLS']['Id'] and old['Image']==self.state['oldTLS']['Image']
        if self.state.get('appId'):
            current=self.inspect(APP);owned(current,APP)
            assert current['Id']==self.state['appId'] and current['Image']==self.state['imageId']
            if current['State']['Running']:self.docker('stop',current['Id'])
        if not old['State']['Running']:self.docker('start',old['Id'])
        self.invariance();self.state['active']='old-synthetic-https';self.save()
        return {'status':'OLD_38444_RUNNING','id':old['Id'],'oldAppId':self.state['oldApp']['Id']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['preflight', 'stage', 'switch', 'rollback', 'status'])
    parser.add_argument('--archive'); parser.add_argument('--proof')
    args = parser.parse_args(); controller = Controller()
    if args.action == 'preflight': result = controller.preflight()
    elif args.action == 'stage':
        assert args.archive and args.proof
        result = controller.stage(args.archive, args.proof)
    elif args.action == 'switch': result = controller.switch()
    elif args.action == 'rollback': result = controller.rollback()
    else:
        controller.invariance()
        result = {'origin': controller.state['origin'], 'old38444Running': controller.inspect(OLD_TLS)['State']['Running'], 'appStaged': bool(controller.state.get('appId')), 'active': controller.state.get('active'), 'publicVersion': controller.wait_public() if controller.state.get('active')=='preview-http' else None}
    print(json.dumps(result))

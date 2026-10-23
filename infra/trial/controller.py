#!/usr/bin/env python3
"""Local controller. Only owned trial Docker objects/directories; no NAS config edits."""
import argparse, hashlib, ipaddress, json, os, pathlib, pty, select, shlex
import subprocess, sys, tarfile, time, secrets, re

REPO = pathlib.Path(__file__).resolve().parents[2]
PRIVATE = REPO / '.trial-private'
PLAN = json.loads((REPO / 'infra/trial/plan.json').read_text())
PREFIX = PLAN['resourcePrefix']
LABEL = 'org.kevin-learning-home.trial'
assert re.fullmatch(r'[0-9]{8}-[a-f0-9]{8}', PLAN['runId'])
assert re.fullmatch(r'[a-f0-9]{40}', PLAN['sourceSha'])
assert PREFIX == 'klh-02b-trial-' + PLAN['runId']


class Trial:
    def __init__(self, args):
        self.args = args
        self.file = PRIVATE / 'state.json'
        self.state = json.loads(self.file.read_text()) if self.file.exists() else {}
        self.root = '/volume2/homes/admin/' + PREFIX
        self.origin = 'https://' + args.lan_ip + ':' + str(args.port)
        ip = ipaddress.ip_address(args.lan_ip)
        assert ip.version == 4 and ip.is_private and not ip.is_loopback
        assert 1024 <= args.port <= 65535
        assert not self.state or self.state['plan'] == PLAN
        if self.state:
            assert self.state['origin'] == self.origin

    def save(self):
        self.file.write_text(json.dumps(self.state, indent=2) + '\n')

    def ssh(self, command, data=None, check=True, timeout=180):
        r = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'nas-codex', command], input=data, capture_output=True, timeout=timeout)
        if check and r.returncode:
            # Do not print remote raw output: it can contain private paths or inputs.
            raise RuntimeError('NAS_COMMAND_FAILED_EXIT_' + str(r.returncode))
        return r

    def python(self, code):
        return self.ssh('python3 -c ' + shlex.quote(code)).stdout.decode().strip()

    def docker(self, args, **kw):
        return self.ssh(shlex.join(['sudo', '-n', '/usr/local/bin/docker', *args]), **kw)

    def inspect(self, name):
        return json.loads(self.docker(['inspect', '--format', '{{json .}}', name]).stdout)

    def services(self):
        ids = self.docker(['ps', '-aq']).stdout.decode().split()
        fmt = '[{{json .Id}},{{json .Name}},{{json .State.Status}},{{json .State.StartedAt}},{{json .RestartCount}}]'
        rows = [json.loads(x) for x in self.docker(['inspect', '--format', fmt, *ids]).stdout.decode().splitlines()]
        return sorted([r for r in rows if not r[1].lstrip('/').startswith(PREFIX)], key=lambda r: r[0])

    def invariance(self):
        after = self.services()
        assert after == self.state['servicesBefore'], 'NON_TRIAL_SERVICE_CHANGED'
        return {'count': len(after), 'unchanged': True, 'sha256': hashlib.sha256(json.dumps(after, sort_keys=True).encode()).hexdigest()}

    def upload(self, path, remote):
        assert remote.startswith(self.root + '/')
        with open(path, 'rb') as f:
            r = subprocess.run(['ssh', '-o', 'BatchMode=yes', 'nas-codex', 'umask 077; cat > ' + shlex.quote(remote)], stdin=f, capture_output=True, timeout=240)
        assert r.returncode == 0, 'OWNED_FILE_TRANSFER_FAILED'
        self.python("import os;os.chmod(%r,0o600)" % remote)

    def seed(self, action, values):
        # Real offline TTY CLI; no fixture/auth bypass in the formal app image.
        command = shlex.join(['sudo', '-n', '/usr/local/bin/docker', 'run', '--rm', '-it', '--name', PREFIX+'-admin', '--label', LABEL+'='+PLAN['runId'], '--label', 'com.centurylinklabs.watchtower.enable=false', '--user', '1024:100', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--network', 'none', '--memory', '512m', '--cpuset-cpus', '0', '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '-v', self.root+':/trial:rw', self.state['imageId'], 'node', 'scripts/auth-admin.ts', action, '--root', '/trial', '--synthetic'])
        pid, fd = pty.fork()
        if pid == 0:
            os.execvp('ssh', ['ssh', '-o', 'BatchMode=yes', '-tt', 'nas-codex', command])
        buffer, index, exit_code = b'', 0, None
        deadline = time.monotonic() + 120
        try:
            while time.monotonic() < deadline:
                ready, _, _ = select.select([fd], [], [], 0.2)
                if ready:
                    try: chunk = os.read(fd, 8192)
                    except OSError: chunk = b''
                    if chunk:
                        buffer += chunk
                        if buffer.endswith(b': ') and index < len(values):
                            os.write(fd, values[index].encode() + b'\n')
                            index += 1
                    else:
                        _, status = os.waitpid(pid, 0)
                        exit_code = os.waitstatus_to_exitcode(status)
                        break
            self.state['lastAdmin'] = {'action': action, 'exitCode': exit_code, 'promptsAnswered': index, 'errors': re.findall(rb'"code"\s*:\s*"([A-Z_0-9]+)"', buffer)}
            self.state['lastAdmin']['errors'] = [x.decode() for x in self.state['lastAdmin']['errors']]
            self.save()
            assert exit_code == 0 and index == len(values), 'SYNTHETIC_TTY_ADMIN_FAILED'
        finally:
            os.close(fd)
            if exit_code is None:
                try: os.kill(pid, 15); os.waitpid(pid, 0)
                except ProcessLookupError: pass
        # No passwords, prompts or credential output are persisted in logs.

    def certs(self):
        tls = PRIVATE / 'tls'
        tls.mkdir(mode=0o700)
        def run(args): subprocess.run(['openssl', *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '7', '-subj', '/CN=KLH isolated synthetic trial CA', '-keyout', str(tls/'ca.key'), '-out', str(tls/'ca.crt')])
        run(['req', '-newkey', 'rsa:2048', '-nodes', '-subj', '/CN=KLH isolated LAN trial', '-keyout', str(tls/'server.key'), '-out', str(tls/'server.csr')])
        (tls/'extensions').write_text('subjectAltName=IP:'+self.args.lan_ip+'\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n')
        run(['x509', '-req', '-in', str(tls/'server.csr'), '-CA', str(tls/'ca.crt'), '-CAkey', str(tls/'ca.key'), '-CAcreateserial', '-days', '7', '-extfile', str(tls/'extensions'), '-out', str(tls/'server.crt')])
        run(['x509', '-in', str(tls/'ca.crt'), '-outform', 'DER', '-out', str(PRIVATE/'klh-trial-ca.cer')])
        for name in ['server.key', 'server.crt']: self.upload(tls/name, self.root+'/tls/'+name)

    def deploy(self):
        assert not self.state, 'TRIAL_ALREADY_STARTED_USE_STATUS_OR_CLEANUP'
        bundle = pathlib.Path(self.args.bundle).resolve()
        assert json.loads((bundle/'plan.json').read_text()) == PLAN
        archive = bundle/'image.tar.gz'
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        assert digest == (bundle/'image.sha256').read_text().split()[0]
        with tarfile.open(archive, 'r:gz') as t:
            manifest = json.load(t.extractfile('manifest.json'))
        assert len(manifest) == 1 and manifest[0]['RepoTags'] == [PREFIX+':app']
        image = json.loads((bundle/'image-inspect.json').read_text())
        assert image['Config']['Labels'][LABEL] == PLAN['runId']
        assert image['Config']['Labels']['org.opencontainers.image.revision'] == PLAN['sourceSha']
        assert self.docker(['image', 'inspect', PREFIX+':app'], check=False).returncode != 0
        before = self.services()
        assert all(r[2] == 'running' for r in before)
        preflight = json.loads(self.python('''import os,json,socket
root=%r;parent=os.path.dirname(root)
assert os.path.realpath(parent)==parent and not os.path.lexists(root)
assert os.stat(parent).st_uid==os.getuid() and os.access(parent,os.W_OK|os.X_OK)
mounts=[s.split() for s in open('/proc/mounts')];m=max([x for x in mounts if parent==x[1] or parent.startswith(x[1]+'/')],key=lambda x:len(x[1]))
assert m[2] in ['ext4','btrfs'] and 'rw' in m[3].split(',')
s=socket.socket();s.bind((%r,%r));s.close()
assert os.statvfs(parent).f_bavail*os.statvfs(parent).f_frsize > 2*1024**3
mem={a[0].rstrip(':'):int(a[1])*1024 for a in (l.split() for l in open('/proc/meminfo')) if len(a)>=2}
assert mem.get('MemAvailable',mem['MemFree']) > 768*1024**2
print(json.dumps({'filesystem':m[2],'uid':os.getuid(),'gid':os.getgid(),'portFree':True,'newRootAbsent':True}))
''' % (self.root, self.args.lan_ip, self.args.port)))
        self.state = {'plan': PLAN, 'origin': self.origin, 'root': self.root, 'servicesBefore': before, 'imageId': image['Id'], 'archiveSha256': digest, 'preflight': preflight, 'containers': {}, 'networkId': None, 'createdRoot': False}
        self.save()
        self.python('''import os,json
os.umask(0o077);root=%r;os.mkdir(root);os.chmod(root,0o700)
for name in ['data','media','content','tls','code','artifacts']:
 os.mkdir(root+'/'+name);os.chmod(root+'/'+name,0o700)
with open(root+'/owner-marker.json','x') as f:json.dump(%r,f)
os.chmod(root+'/owner-marker.json',0o600)
''' % (self.root, PLAN))
        self.state['createdRoot'] = True; self.save()
        self.upload(archive, self.root+'/artifacts/image.tar.gz')
        remote = self.python("import hashlib;h=hashlib.sha256();f=open(%r,'rb');[h.update(b) for b in iter(lambda:f.read(1024*1024),b'')];print(h.hexdigest())" % (self.root+'/artifacts/image.tar.gz'))
        assert remote == digest
        self.docker(['load', '--input', self.root+'/artifacts/image.tar.gz'], timeout=300)
        actual = self.inspect(PREFIX+':app'); assert actual['Id'] == image['Id']
        self.certs()
        self.upload(REPO/'infra/trial/tls-proxy.mjs', self.root+'/code/tls-proxy.mjs')
        self.start()

    def start(self):
        assert self.state and not self.state['containers'] and not self.state['networkId']
        self.python("import os,json,stat;root=%r;assert json.load(open(root+'/owner-marker.json'))==%r;assert all(stat.S_IMODE(os.stat(root+'/'+x).st_mode)==0o700 for x in ['.','data','media','content','tls','code','artifacts']);assert not os.path.exists(root+'/data/learning.sqlite')" % (self.root, PLAN))
        image = {'Id': self.state['imageId']}
        credentials = {'origin': self.origin, 'runId': PLAN['runId'], 'parent': {'login': 'trial-parent', 'password': secrets.token_urlsafe(20)}, 'learner': {'login': 'trial-child', 'password': secrets.token_urlsafe(20)}}
        (PRIVATE/'credentials.json').write_text(json.dumps(credentials, indent=2)+'\n')
        self.seed('bootstrap-parent', ['trial-parent', '合成试用家长', credentials['parent']['password'], credentials['parent']['password']])
        self.seed('create-learner', ['trial-parent', credentials['parent']['password'], 'trial-child', '合成试用孩子', credentials['learner']['password'], credentials['learner']['password']])
        self.state['seeded'] = True; self.save()
        network = self.docker(['network', 'create', '--internal', '--label', LABEL+'='+PLAN['runId'], PREFIX+'-network']).stdout.decode().strip()
        self.state['networkId'] = network; self.save()
        common = ['--detach', '--init', '--read-only', '--user', '1024:100', '--label', LABEL+'='+PLAN['runId'], '--label', 'com.centurylinklabs.watchtower.enable=false', '--cpuset-cpus', '0', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--restart', 'no', '--log-opt', 'max-size=5m', '--log-opt', 'max-file=2', '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '--network', network]
        app = self.docker(['run', *common, '--name', PREFIX+'-app', '--network-alias', 'app', '--memory', '512m', '-e', 'KLH_AUTH_ORIGIN='+self.origin, '-e', 'KLH_AUTH_MODE=production', '-v', self.root+'/data:/data:rw', '-v', self.root+'/media:/media:ro', '-v', self.root+'/content:/content:ro', image['Id']]).stdout.decode().strip()
        self.state['containers']['app'] = app; self.save()
        self.launch_tls(common)
        self.status()

    def launch_tls(self, common):
        # Docker 20.10 on this DSM does not publish ports on an internal bridge.
        # Keep app internal; only the TLS terminator joins a new owned edge bridge.
        edge = self.docker(['network', 'create', '--label', LABEL+'='+PLAN['runId'], PREFIX+'-edge']).stdout.decode().strip()
        self.state['edgeNetworkId'] = edge; self.save()
        common = list(common)
        common[common.index('--network')+1] = edge
        tls = self.docker(['run', *common, '--name', PREFIX+'-tls', '--memory', '128m', '--no-healthcheck', '-e', 'TRIAL_ORIGIN='+self.origin, '-p', self.args.lan_ip+':'+str(self.args.port)+':8443', '-v', self.root+'/tls:/tls:ro', '-v', self.root+'/code/tls-proxy.mjs:/trial-proxy.mjs:ro', self.state['imageId'], 'node', '/trial-proxy.mjs']).stdout.decode().strip()
        self.state['containers']['tls'] = tls; self.save()
        self.docker(['network', 'connect', self.state['networkId'], tls])

    def repair_edge(self):
        assert not self.state.get('edgeNetworkId')
        info = self.inspect(self.state['containers']['tls'])
        assert info['Config']['Labels'][LABEL] == PLAN['runId'] and info['Image'] == self.state['imageId']
        common = ['--detach', '--init', '--read-only', '--user', '1024:100', '--label', LABEL+'='+PLAN['runId'], '--label', 'com.centurylinklabs.watchtower.enable=false', '--cpuset-cpus', '0', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true', '--restart', 'no', '--log-opt', 'max-size=5m', '--log-opt', 'max-file=2', '--tmpfs', '/tmp:rw,noexec,nosuid,size=16m', '--network', self.state['networkId']]
        self.docker(['rm', '-f', info['Id']])
        del self.state['containers']['tls']; self.save()
        self.launch_tls(common)
        self.status()

    def status(self):
        assert self.state
        containers = {}
        for role, cid in self.state['containers'].items():
            info = self.inspect(cid)
            assert info['Config']['Labels'][LABEL] == PLAN['runId'] and info['Image'] == self.state['imageId']
            host = info['HostConfig']
            assert host['Memory'] == (512 if role == 'app' else 128)*1024**2
            assert 'no-new-privileges:true' in host['SecurityOpt']
            assert host['ReadonlyRootfs'] and not host['Privileged'] and host['CpusetCpus'] == '0'
            assert info['Config']['User'] == '1024:100' and 'ALL' in host['CapDrop']
            assert host['NetworkMode'] == (self.state.get('edgeNetworkId', self.state['networkId']) if role == 'tls' else self.state['networkId']) and host['PidMode'] == ''
            if role == 'app': assert not host['PortBindings']
            else:
                expected = [{'HostIp': self.args.lan_ip, 'HostPort': str(self.args.port)}]
                assert host['PortBindings']['8443/tcp'] == expected
                assert info['NetworkSettings']['Ports']['8443/tcp'] == expected
                assert len(info['NetworkSettings']['Networks']) == 2
            containers[role] = {'status': info['State']['Status'], 'memoryBytes': host['Memory'], 'readonly': True, 'nonRoot': True, 'capDropAll': True, 'restartPolicy': host['RestartPolicy']['Name'], 'health': info['State'].get('Health', {}).get('Status', 'not-configured')}
        out = {'sourceSha': PLAN['sourceSha'], 'runId': PLAN['runId'], 'status': 'TRIAL_RUNNING_SYNTHETIC_ONLY', 'containers': containers, 'existingServices': self.invariance(), 'preflight': self.state['preflight'], 'imageId': self.state['imageId'], 'archiveSha256': self.state['archiveSha256'], 'physicalDevices': 'NOT_RUN', 'certificateTrust': 'TEST_CA_NOT_INSTALLED_BY_CONTROLLER', 'nasConfigChanged': False}
        (PRIVATE/'nas-status.json').write_text(json.dumps(out, indent=2)+'\n')
        print(json.dumps(out))

    def cleanup(self):
        assert self.state
        for role in ['tls', 'app', 'admin']:
            name = PREFIX+'-'+role
            if self.docker(['inspect', name], check=False).returncode == 0:
                info = self.inspect(name)
                assert info['Config']['Labels'][LABEL] == PLAN['runId'] and info['Image'] == self.state['imageId']
                if role in self.state['containers']: assert info['Id'] == self.state['containers'][role]
                self.docker(['rm', '-f', info['Id']])
        for nid in [self.state.get('edgeNetworkId'), self.state.get('networkId')]:
            if nid:
                network = json.loads(self.docker(['network', 'inspect', nid]).stdout)[0]
                assert network['Labels'][LABEL] == PLAN['runId'] and not network['Containers']
                self.docker(['network', 'rm', network['Id']])
        if self.docker(['image', 'inspect', PREFIX+':app'], check=False).returncode == 0:
            assert self.inspect(PREFIX+':app')['Id'] == self.state['imageId']
            self.docker(['image', 'rm', PREFIX+':app'])
        if self.state['createdRoot']:
            self.python('''import os,json,shutil
root=%r;assert os.path.realpath(root)==root
assert json.load(open(root+'/owner-marker.json'))==%r
shutil.rmtree(root)
''' % (self.root, PLAN))
        print(json.dumps({'status': 'OWNED_TRIAL_CLEANED', 'existingServices': self.invariance()}))
        self.state['cleaned'] = True; self.save()


if __name__ == '__main__':
    os.umask(0o077); PRIVATE.mkdir(exist_ok=True, mode=0o700)
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['deploy', 'start', 'status', 'cleanup', 'repair_edge'])
    parser.add_argument('--bundle')
    parser.add_argument('--lan-ip', required=True)
    parser.add_argument('--port', type=int, default=38443)
    args = parser.parse_args()
    getattr(Trial(args), args.action)()

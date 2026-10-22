"""Explicit, one-off isolated NAS gate. No production container or daemon changes.

Run from the checkout, passing a verified private parent directory as --parent.
Private paths/service names stay in ignored .evidence; only sanitized results go
to docs. Uses existing SSH alias and Docker-only sudo, never configures sudo.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shlex
import subprocess
import tarfile
import time
import xml.etree.ElementTree as ET

LABEL = "org.kevin-learning-home.nas-gate"
PRIVATE = Path(".evidence/nas-gate-private")
PUBLIC = Path("docs/implementation/evidence/nas-gate")
PLAN = json.loads(Path("tests/nas-gate/run-plan.json").read_text())
PREFIX = PLAN["resourcePrefix"]
RUN_ID = PLAN["runId"]
SOURCE = PLAN["sourceSha"]
assert re.fullmatch(r"klh-r1-nas-gate-[0-9]{8}-[a-f0-9]{8}", PREFIX)

RUNTIME = r"""
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';import {DatabaseSync} from 'node:sqlite';
const require=createRequire(import.meta.url),ext=require('fs-ext');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=['/usr/local/bin/node','/app/node_modules/fs-ext/build/Release/fs_ext.node',
'/app/apps/server/main.ts','/app/packages/platform/store.ts','/app/packages/platform/writer-lock.ts',
'/app/packages/platform/checkpoint.ts','/app/packages/platform/001-foundation.sql','/app/package.json'];
const d=new DatabaseSync(':memory:');const sqlite=d.prepare('select sqlite_version() v').get().v;d.close();
let productionHarnessExcluded=true;try{fs.accessSync('/app/tests/foundation/test-server.ts');productionHarnessExcluded=false;}catch{}
console.log(JSON.stringify({node:process.version,abi:process.versions.modules,sqlite,
fsExt:require('fs-ext/package.json').version,uid:process.getuid(),arch:process.arch,
kernel:(await import('node:os')).release(),hashes:Object.fromEntries(files.map(p=>[p,hash(p)])),
lockfileSha:fs.existsSync('/app/package-lock.json')?hash('/app/package-lock.json'):null,
productionHarnessExcluded}));
"""
NATIVE = r"""
import fs from 'node:fs';import ext from 'fs-ext';
const a='/data/.gate-native-probe',b=a+'-link';let fd;
try{fd=fs.openSync(a,'wx',0o600);ext.flockSync(fd,'exnb');fs.writeFileSync(fd,'synthetic');
fs.fsyncSync(fd);fs.linkSync(a,b);const dir=fs.openSync('/data','r');fs.fsyncSync(dir);fs.closeSync(dir);
console.log(JSON.stringify({flock:true,hardlink:true,fsync:true,filesystemType:Number(fs.statfsSync('/data').type)>>>0}));
}finally{if(fd!==undefined)fs.closeSync(fd);for(const p of [b,a])if(fs.existsSync(p))fs.unlinkSync(p);}
"""
SEED = r"""
import fs from 'node:fs';import {Store} from './packages/platform/store.ts';
import {layout,prepareLayout} from './packages/platform/checkpoint.ts';
import {seed,syntheticCommand} from './scripts/synthetic.ts';
const p=layout('/work/scenario');prepareLayout(p);const s=new Store(p.data);
try{seed(s,p);const command=syntheticCommand(),result=s.command(command),tables=s.summary();
fs.writeFileSync('/work/expected.json',JSON.stringify({command,result,tables}));
console.log(JSON.stringify({tables,environment:s.environment(),events:result.events.length,revision:result.committedRevision}));
}finally{s.close();}
"""
SNAPSHOT = r"""
import fs from 'node:fs';import assert from 'node:assert/strict';
import {Store} from './packages/platform/store.ts';import {canonical} from './packages/contracts/index.ts';
import {layout,verifyContent} from './packages/platform/checkpoint.ts';
const p=layout(process.env.GATE_SCENARIO),e=JSON.parse(fs.readFileSync('/work/expected.json','utf8')),s=new Store(p.data);
try{s.verifyIntegrity();verifyContent(s,p);assert.deepEqual(s.summary(),e.tables);
const replay=s.command(e.command);assert.equal(replay.duplicate,true);assert.equal(replay.committedRevision,1);
assert.equal(canonical(replay.events),canonical(e.result.events));assert.deepEqual(s.summary(),e.tables);
console.log(JSON.stringify({tables:s.summary(),receiptReplayed:true,environment:s.environment(),deepCheck:true,mediaAndContentVerified:true}));
}finally{s.close();}
"""
HEALTH = r"""
import {request} from 'node:http';const result={};
for(const path of ['/health/live','/health/ready'])result[path]=await new Promise((resolve,reject)=>{
const r=request('http://127.0.0.1:4177'+path,{headers:{Host:'127.0.0.1:4177'}},s=>{s.resume();s.on('end',()=>resolve(s.statusCode));});
r.on('error',reject);r.setTimeout(4000,()=>r.destroy(Error('HTTP_TIMEOUT')));r.end();});console.log(JSON.stringify(result));
"""
KILL = r"""
import fs from 'node:fs';import assert from 'node:assert/strict';
// DSM 4.4 may not expose /proc/PID/task/TID/children. Only inspect this
// isolated container's processes; identify the sole init child by exact argv.
const match=pid=>{try{
 const stat=fs.readFileSync('/proc/'+pid+'/stat','utf8');
 const ppid=stat.slice(stat.lastIndexOf(')')+2).split(' ')[1];
 const argv=fs.readFileSync('/proc/'+pid+'/cmdline','utf8').split('\0');
 const status=fs.readFileSync('/proc/'+pid+'/status','utf8');
 const uid=Number(status.match(/^Uid:\s+(\d+)/m)[1]);
 return ppid==='1'&&argv[1]==='apps/server/main.ts'&&uid===process.getuid();
}catch{return false;}};
const candidates=fs.readdirSync('/proc').filter(x=>/^\d+$/.test(x)&&Number(x)>1&&match(x));
assert.equal(candidates.length,1);const pid=Number(candidates[0]);assert(match(String(pid)));
fs.writeSync(1,'KILLING_VERIFIED_NODE\n');process.kill(pid,'SIGKILL');
"""


class Gate:
    def __init__(self, parent, image_build_ci):
        self.parent = parent
        self.image_build_ci = image_build_ci
        self.root = parent + "/" + PREFIX
        self.events = []
        self.containers = {}
        self.images = {}
        self.created_root = False
        self.current_gate = "G01"
        self.evidence = {"runId": RUN_ID, "testedApplicationSha": SOURCE,
                         "taskBranchSha": PLAN["taskBranchSha"], "gates": {},
                         "scope": "DS918+ isolated synthetic gate, no production deployment",
                         "startedAtUTC":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
        PRIVATE.mkdir(parents=True, exist_ok=True)
        PUBLIC.mkdir(parents=True, exist_ok=True)

    def redact(self, value):
        if re.fullmatch(r"[a-f0-9]{12,64}",str(value)):return "$OBJECT_ID"
        return str(value).replace(self.root, "$RUNROOT").replace(self.parent, "$PRIVATE_PARENT")

    def save(self):
        (PRIVATE / "state.json").write_text(json.dumps({"root": self.root, "containers": self.containers,
            "images": self.images, "createdRoot": self.created_root}, indent=2))

    def ssh(self, command, check=True, timeout=90, input=None):
        r = subprocess.run(["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "nas-codex", command],
                           input=input, capture_output=True, timeout=timeout)
        if check and r.returncode:
            (PRIVATE / "last-error.txt").write_bytes(r.stderr)
            raise RuntimeError("SSH_COMMAND_FAILED:" + str(r.returncode))
        return r

    def python(self, code):
        return self.ssh("python3 - <<'PY'\n" + code + "\nPY").stdout.decode()

    def docker(self, args, check=True, timeout=90):
        start = time.monotonic()
        r = self.ssh(shlex.join(["sudo", "-n", "/usr/local/bin/docker"] + args), False, timeout)
        event = {"command": [self.redact(a) for a in args], "exitCode": r.returncode,
                 "wallSeconds": round(time.monotonic() - start, 3)}
        self.events.append(event)
        with (PRIVATE / "docker-output.jsonl").open("a") as f:
            f.write(json.dumps({**event, "stdout": r.stdout.decode(errors="replace"),
                               "stderr": r.stderr.decode(errors="replace")}) + "\n")
        if check and r.returncode:
            (PRIVATE / "last-error.txt").write_bytes(r.stderr)
            raise RuntimeError("DOCKER_COMMAND_FAILED:" + str(r.returncode))
        return r

    def inspect(self, name):
        return json.loads(self.docker(["inspect", name, "--format", "{{json .}}"], timeout=20).stdout)

    def service_snapshot(self):
        ids = self.docker(["ps", "-aq"]).stdout.decode().split()
        if not ids:
            raise RuntimeError("EXISTING_SERVICES_MISSING")
        fmt = '[{{json .Id}},{{json .Name}},{{json .State.Status}},{{json .State.StartedAt}},{{json .RestartCount}},{{with index .State "Health"}}{{json .Status}}{{else}}null{{end}}]'
        rows = [json.loads(x) for x in self.docker(["inspect", "--format", fmt] + ids).stdout.decode().splitlines()]
        return sorted([r for r in rows if not r[1].lstrip('/').startswith(PREFIX)], key=lambda r: r[0])

    def unchanged(self):
        after = self.service_snapshot()
        assert [r[:5] for r in after] == [r[:5] for r in self.before], "NON_TEST_SERVICE_CHANGED"
        return after

    def preflight(self):
        self.before = self.service_snapshot()
        (PRIVATE / "services-before.json").write_text(json.dumps(self.before))
        assert all(r[2] == "running" for r in self.before), "EXISTING_SERVICE_NOT_RUNNING"
        info = json.loads(self.python("""
import os,json,platform
parent=%r;root=%r
assert os.path.realpath(parent)==parent and os.stat(parent).st_uid==os.getuid()
assert os.access(parent,os.W_OK|os.X_OK) and not os.path.lexists(root)
mount=[x.split() for x in open('/proc/mounts') if x.split()[1]=='/volume2']
assert len(mount)==1 and mount[0][2]=='ext4' and 'ro' not in mount[0][3].split(',')
v={}
for x in open('/etc.defaults/VERSION'):
 k,_,value=x.partition('=')
 if k in ['productversion','buildnumber','smallfixnumber']:v[k]=value.strip().strip(chr(34))
s=os.statvfs(parent);assert s.f_bavail*s.f_frsize>4*1024**3
print(json.dumps({'kernel':platform.release(),'arch':platform.machine(),'model':open('/proc/sys/kernel/syno_hw_version').read().strip(),'dsm':v,'filesystem':'ext4','parentCanonicalOwnedWritable':True,'newRootAbsent':True,'freeBytes':s.f_bavail*s.f_frsize,'logicalCpus':os.cpu_count(),'memory':{x.split(':')[0]:x.split(':')[1].strip() for x in open('/proc/meminfo') if x.split(':')[0] in ['MemTotal','MemAvailable']}}))
""" % (self.parent, self.root)))
        info["docker"] = json.loads(self.docker(["version", "--format", "{{json .Server}}"] ).stdout)
        info["compose"] = self.ssh("sudo -n /usr/local/bin/docker-compose --version").stdout.decode().strip()
        self.uid_gid = self.python("import os,json;print(json.dumps([os.getuid(),os.getgid()]))").strip()
        self.uid_gid = ':'.join(str(x) for x in json.loads(self.uid_gid))
        self.evidence["environment"] = info
        self.evidence["existingServices"] = {"beforeCount": len(self.before), "allRunningBefore": True,
            "mathNameMatches": sum('math' in r[1].lower() for r in self.before),
            "wordNameMatches": sum(any(x in r[1].lower() for x in ['word','english']) for r in self.before),
            "scope": "Container ID/start/restart/status only, no learning data or application config read"}
        assert not self.docker(["ps", "-aq", "--filter", "label="+LABEL+'='+RUN_ID]).stdout.strip()
        for kind in ['formal','harness']:
            assert self.docker(["image", "inspect", PREFIX+':'+kind], False).returncode != 0
        self.progress("preflight", "PASS_READONLY")

    def progress(self, step, status):
        print(json.dumps({"step": step, "status": status, "runId": RUN_ID}), flush=True)

    def prepare(self):
        self.python("""
import os,json
root=%r;parent=%r
assert os.path.realpath(parent)==parent and os.stat(parent).st_uid==os.getuid()
os.mkdir(root,0o700)
with open(root+'/owner-marker.json','x') as f:
 json.dump(%r,f);f.flush();os.fsync(f.fileno())
for p in ['artifacts','evidence','work','work/tmp','work/scenario','work/scenario/data','work/scenario/media','work/scenario/content']:os.mkdir(root+'/'+p,0o700)
""" % (self.root, self.parent, {"runId": RUN_ID, "sourceSha": SOURCE, "resourcePrefix": PREFIX}))
        self.created_root = True
        self.save()

    def load(self):
        bundle = PRIVATE / "bundle"
        archive = bundle / "images.tar.gz"
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        assert digest == (bundle / "images.sha256").read_text().split()[0]
        assert json.loads((bundle / "run-plan.json").read_text()) == PLAN
        with tarfile.open(archive, "r:gz") as tar:
            manifest = json.load(tar.extractfile("manifest.json"))
        tags = sorted(t for x in manifest for t in x.get('RepoTags',[]))
        assert tags == sorted([PREFIX+':formal', PREFIX+':harness']), "UNPLANNED_ARCHIVE_TAG"
        expected = {x['RepoTags'][0]: x for x in map(json.loads, (bundle / 'image-inspect.jsonl').read_text().splitlines())}
        with archive.open('rb') as f:
            r = subprocess.run(['ssh','-o','BatchMode=yes','nas-codex', 'cat > '+shlex.quote(self.root+'/artifacts/images.tar.gz')],stdin=f,capture_output=True,timeout=180)
        assert r.returncode == 0, "ARCHIVE_UPLOAD_FAILED"
        remote_hash = self.python("import hashlib;h=hashlib.sha256();f=open(%r,'rb');\nfor b in iter(lambda:f.read(1024*1024),b''):h.update(b)\nprint(h.hexdigest())" % (self.root+'/artifacts/images.tar.gz'))
        assert remote_hash.strip() == digest
        self.docker(["load", "--input", self.root+'/artifacts/images.tar.gz'],timeout=240)
        for kind in ['formal','harness']:
            tag=PREFIX+':'+kind
            info=json.loads(self.docker(['image','inspect',tag]).stdout)[0]
            assert info['Id']==expected[tag]['Id'] and info['Config']['Labels'][LABEL]==RUN_ID
            assert info['Config']['Labels']['org.opencontainers.image.revision']==SOURCE
            assert info['Architecture']=='amd64' and info['Os']=='linux'
            self.images[tag]=info['Id'];self.save()
        self.evidence['images']={'archiveSha256':digest,'archiveBytes':archive.stat().st_size,'ids':dict(self.images),
                                'imageBuildCI':self.image_build_ci,'source':'Exact frozen official Dockerfile; harness derives FROM same formal image'}
        self.progress('image-load','PASS_TRANSFER_HASH_AND_IDS')

    def common(self, role):
        name=PREFIX+'-'+role
        assert name not in self.containers
        return ['--name',name,'--label',LABEL+'='+RUN_ID,'--user',self.uid_gid,'--read-only',
            '--network','none','--cpuset-cpus','0','--memory','512m','--cap-drop','ALL',
            '--security-opt','no-new-privileges','--tmpfs','/tmp:rw,noexec,nosuid,size=16m',
            '--log-driver','json-file','--log-opt','max-size=5m','--log-opt','max-file=2']

    def mounts(self, scenario='scenario'):
        return sum((['-v',self.root+'/work/'+scenario+'/'+x+':/'+x+(':'+('rw' if x=='data' else 'ro'))] for x in ['data','media','content']),[])

    def own(self, role):
        name=PREFIX+'-'+role;info=self.inspect(name)
        assert info['Config']['Labels'][LABEL]==RUN_ID and info['Image'] in self.images.values()
        self.containers[name]=info['Id'];self.save();return info

    def remove(self, role):
        name=PREFIX+'-'+role
        info=self.inspect(name)
        assert self.containers[name]==info['Id'] and info['Config']['Labels'][LABEL]==RUN_ID
        self.docker(['rm','-f',name]);del self.containers[name];self.save()

    def oneoff(self, role, image, args, work=False, check=True, env=None, mounts=False, timeout=120):
        options=self.common(role)
        if work: options+=['-v',self.root+'/work:/work:rw','-v',self.root+'/evidence:/app/.evidence:rw','-e','TMPDIR=/work/tmp']
        if mounts: options+=self.mounts()
        for k,v in (env or {}).items():options+=['-e',k+'='+v]
        self.docker(['create']+options+[PREFIX+':'+image]+args)
        self.own(role)
        try:
            self.docker(['start','-a',PREFIX+'-'+role],False,timeout)
            info=self.inspect(PREFIX+'-'+role);code=info['State']['ExitCode']
            logs=self.docker(['logs',PREFIX+'-'+role]).stdout.decode()
            stderr=self.docker(['logs',PREFIX+'-'+role]).stderr.decode()
            result={'exitCode':code,'stdout':logs,'stderr':stderr,'oomKilled':info['State']['OOMKilled']}
            assert not result['oomKilled'], 'TEST_CONTAINER_OOM'
            if check and code:
                (PRIVATE/'last-error.txt').write_text(result['stderr']+'\n'+result['stdout'])
                self.evidence['failedContainer']={'role':role,'exitCode':code,'stderr':self.redact(result['stderr'][-4000:]),'stdout':self.redact(result['stdout'][-2000:])}
                raise RuntimeError('TEST_CONTAINER_EXIT:'+str(code))
            return result
        finally:self.remove(role)

    def node(self, role, image, code, **kw):
        r=self.oneoff(role,image,['node','--input-type=module','-e',code],**kw)
        return json.loads(r['stdout'])

    def app(self, scenario='scenario',restart='no'):
        self.docker(['run','-d']+self.common('app')+['--init','--restart',restart,'--health-interval','2s',
            '--health-start-period','1s','--health-retries','1']+self.mounts(scenario)+[PREFIX+':formal'])
        self.own('app');self.ready()

    def app_info(self):return self.inspect(PREFIX+'-app')

    def ready(self):
        for _ in range(40):
            info=self.app_info()
            assert info['RestartCount']<=2,'RESTART_STORM'
            if info['State']['Status'] in ['exited','dead']:
                log=self.docker(['logs',PREFIX+'-app'])
                (PRIVATE/'last-error.txt').write_bytes(log.stdout+log.stderr)
                self.evidence['failedContainer']={'role':'app','exitCode':info['State']['ExitCode'],'stderr':self.redact(log.stderr.decode()[-4000:])}
                raise RuntimeError('FORMAL_STARTUP_FAILED')
            r=self.docker(['exec',PREFIX+'-app','node','scripts/healthcheck.ts'],False,20)
            if r.returncode==0:return
            time.sleep(.5)
        raise RuntimeError('FORMAL_READY_TIMEOUT')

    def wait_health(self, expected):
        for _ in range(25):
            info=self.app_info()
            assert info['RestartCount']<=2,'RESTART_STORM'
            if info['State']['Health']['Status']==expected:return
            time.sleep(.5)
        raise RuntimeError('HEALTH_STATUS_TIMEOUT:'+expected)

    def stop_app(self):
        self.docker(['stop','-t','10',PREFIX+'-app']);self.remove('app')

    def snapshot(self, scenario='scenario'):
        return self.node('snapshot','harness',SNAPSHOT,work=True,env={'GATE_SCENARIO':'/work/'+scenario})

    def test(self):
        self.unchanged()
        formal=self.node('runtime','formal',RUNTIME)
        harness=self.node('runtime','harness',RUNTIME)
        assert formal['node']==harness['node']=='v24.15.0' and formal['fsExt']==harness['fsExt']=='2.1.1'
        assert formal['hashes']==harness['hashes'] and formal['uid']!=0
        assert formal['productionHarnessExcluded'] and not harness['productionHarnessExcluded']
        lock=subprocess.check_output(['git','show',SOURCE+':package-lock.json'])
        assert hashlib.sha256(lock).hexdigest()==harness['lockfileSha']
        native=self.node('native','formal',NATIVE,mounts=True)
        assert native=={'flock':True,'hardlink':True,'fsync':True,'filesystemType':0xef53}
        self.app()
        info=self.app_info();config=info['HostConfig']
        assert config['ReadonlyRootfs'] and not config['Privileged'] and not config['PortBindings']
        assert config['NetworkMode']=='none' and config['Memory']==512*1024**2 and config['CpusetCpus']=='0'
        assert config['PidMode'] in ['', 'private'],'TEST_REQUIRES_PRIVATE_PID_NAMESPACE'
        assert config['CapDrop']==['ALL'] and 'no-new-privileges' in config['SecurityOpt']
        self.wait_health('healthy');self.stop_app()
        self.evidence['gates']['G01']={'status':'PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK','formalRuntime':formal,
            'harnessRuntime':harness,'nativeExt4Operations':native,'formalEmptyStartupReady':True,
            'isolation':{'nonRoot':True,'readOnlyRootfs':True,'network':'none','hostPorts':[],'memoryMiB':512,'cpuset':'0','capDrop':['ALL'],'noNewPrivileges':True,'testHealthIntervalSeconds':2,'productionHealthIntervalSeconds':20}}
        self.progress('G01','PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK')
        self.current_gate='G02'
        self.unchanged()
        start=time.monotonic()
        unit=self.oneoff('unit','harness',['node','--test','--test-concurrency=1','--test-reporter=junit',
            '--test-reporter-destination=.evidence/nas-junit.xml','tests/foundation/platform.test.ts',
            'tests/foundation/recovery.test.ts','tests/foundation/restart.test.ts','tests/foundation/writer-lock.test.ts',
            'tests/foundation/readiness.test.ts'],work=True,env={'NODE_ENV':'test'},timeout=240)
        self.evidence['unitRegression']={'exitCode':unit['exitCode'],'wallSecondsIncludingContainerSSH':round(time.monotonic()-start,3),'sourceSha':SOURCE}
        self.collect()
        cases=ET.parse(PRIVATE/'nas-junit.xml').findall('.//testcase')
        assert len(cases)==30 and all(x.find('failure') is None and x.find('error') is None and x.find('skipped') is None for x in cases)
        self.progress('R1-30-unit-tests','PASS_NAS')
        seed=self.node('seed','harness',SEED,work=True)
        self.app(restart='unless-stopped')
        loser=self.oneoff('contender','formal',[],mounts=True,check=False)
        assert loser['exitCode']==1 and 'WRITER_LOCKED_OR_UNWRITABLE' in loser['stderr']
        self.ready()
        blocked=self.oneoff('backup','harness',['node','scripts/maintenance.ts','backup','--root','/work/scenario','--out','/work/blocked-live-backup'],work=True,check=False)
        assert blocked['exitCode']==1 and 'WRITER_LOCKED_OR_UNWRITABLE' in blocked['stderr']
        stats=self.docker(['stats','--no-stream','--format','{{json .}}',PREFIX+'-app']).stdout.decode()
        stat=json.loads(stats);self.evidence['performanceSample']={k:stat[k] for k in ['CPUPerc','MemUsage','MemPerc','BlockIO','PIDs']}
        media=self.root+'/work/scenario/media'
        mode=int(self.python('import os;print(os.stat(%r).st_mode & 0o777)'%media))
        try:
            self.python('import os;os.chmod(%r,0)'%media)
            self.wait_health('unhealthy')
            h=json.loads(self.docker(['exec',PREFIX+'-app','node','--input-type=module','-e',HEALTH]).stdout)
            assert h=={'/health/live':200,'/health/ready':503}
            assert self.app_info()['RestartCount']==0 and self.app_info()['State']['Running']
        finally:self.python('import os;os.chmod(%r,%r)'%(media,mode))
        self.wait_health('healthy');time.sleep(11)
        killed=self.docker(['exec',PREFIX+'-app','node','--input-type=module','-e',KILL],False)
        if killed.returncode not in [0,137] or b'KILLING_VERIFIED_NODE' not in killed.stdout:
            (PRIVATE/'last-error.txt').write_bytes(killed.stderr)
            raise RuntimeError('VERIFIED_PROCESS_KILL_PROBE_FAILED:'+str(killed.returncode))
        for _ in range(35):
            count=self.app_info()['RestartCount']
            assert count<=2,'RESTART_STORM'
            if count>=1:break
            time.sleep(.5)
        assert count>=1,'AUTORESTART_NOT_OBSERVED'
        self.ready();self.wait_health('healthy');self.stop_app();snap=self.snapshot()
        self.app();self.docker(['kill','--signal','KILL',PREFIX+'-app'])
        assert int(self.docker(['wait',PREFIX+'-app']).stdout)==137
        self.remove('app');self.app();self.stop_app();self.snapshot()
        self.evidence['gates']['G02']={'status':'PASS_NAS','contenderExitCode':1,'liveOwnerNotEvicted':True,
            'activeBackupExitCode':1,'autoRestartCount':count,'autoRestartKillExecExitCode':killed.returncode,
            'autoRestartTrigger':'SIGKILL actual Node child of init, not docker kill','manualDockerKillExitCode':137,
            'recreateSameVolume':True,'exact11TableHashesPreserved':True,'receiptReplayed':snap['receiptReplayed'],
            'unhealthyAloneDidNotRestart':True,'noPublishedWriterLockDeleted':True}
        self.evidence['gates']['G03']={'status':'PASS_NAS','pragmas':snap['environment']['pragmas'],
            'runtimeReadiness503Live200OnOwnedFixtureFault':True,'restoredHealthy':True,
            'unitRegressionTests':30,'unitExitCode':0,'sqlEvidence':'readiness.json','rollbackAndCAS':'test-cases.json'}
        self.progress('G02-G03','PASS_NAS');self.unchanged()
        self.current_gate='G04'
        backup=self.oneoff('backup','formal',['node','scripts/maintenance.ts','backup','--root','/work/scenario','--out','/work/checkpoint'],work=True)
        restored=self.oneoff('restore','formal',['node','scripts/maintenance.ts','restore','--from','/work/checkpoint','--to','/work/restored'],work=True)
        duplicate=self.oneoff('restore','formal',['node','scripts/maintenance.ts','restore','--from','/work/checkpoint','--to','/work/restored'],work=True,check=False)
        assert duplicate['exitCode']==1 and 'RESTORE_TARGET_EXISTS' in duplicate['stderr']
        checkpoint=json.loads(backup['stdout'])['result'];other=json.loads(restored['stdout'])['result']
        assert checkpoint==other and checkpoint['tables']==seed['tables']
        self.snapshot('restored');self.app('restored');self.stop_app()
        self.evidence['gates']['G04']={'status':'PASS_NAS','backupExitCode':0,'restoreExitCode':0,
            'existingTargetRejectedExitCode':1,'formalImageRestoredHostReady':True,'exact11TableHashesPreserved':True,
            'receiptReplayed':True,'mediaAndContentHashVerified':True,'checkpointManifest':checkpoint}
        self.progress('G04','PASS_NAS')

    def collect(self):
        for name in ['nas-junit.xml','r1-ownership.json','r1-readiness.json','recovery.json']:
            r=self.ssh('cat '+shlex.quote(self.root+'/evidence/'+name),False)
            if r.returncode==0:(PRIVATE/name).write_bytes(r.stdout)

    def cleanup(self):
        errors=[]
        if self.created_root:
            self.evidence['ownedDirectoryBytesBeforeCleanup']=int(self.python("import os;root=%r;print(sum(os.lstat(os.path.join(p,n)).st_size for p,ds,ns in os.walk(root) for n in ns if not os.path.islink(os.path.join(p,n))))" % self.root))
        for name in list(self.containers):
            try:self.remove(name.removeprefix(PREFIX+'-'))
            except Exception as e:errors.append(type(e).__name__+':'+self.redact(str(e)))
        for tag,image_id in list(reversed(list(self.images.items()))):
            try:
                info=json.loads(self.docker(['image','inspect',tag]).stdout)[0]
                assert info['Id']==image_id and info['Config']['Labels'][LABEL]==RUN_ID
                assert all(x in [PREFIX+':formal',PREFIX+':harness'] for x in info['RepoTags'])
                self.docker(['image','rm',tag]);del self.images[tag];self.save()
            except Exception as e:errors.append(type(e).__name__+':'+self.redact(str(e)))
        left_containers=self.docker(['ps','-aq','--filter','label='+LABEL+'='+RUN_ID]).stdout.decode().split()
        left_images=self.docker(['images','-q','--filter','label='+LABEL+'='+RUN_ID]).stdout.decode().split()
        if self.created_root and not errors and not left_containers and not left_images:
            try:
                self.python("""
import os,json,shutil
root=%r;parent=%r
assert os.path.dirname(root)==parent and os.path.realpath(root)==root and not os.path.islink(root)
assert os.stat(root).st_uid==os.getuid()
assert json.load(open(root+'/owner-marker.json'))==%r
shutil.rmtree(root)
assert not os.path.lexists(root)
""" % (self.root,self.parent,{'runId':RUN_ID,'sourceSha':SOURCE,'resourcePrefix':PREFIX}))
                self.created_root=False;self.save()
            except Exception as e:errors.append(type(e).__name__+':'+self.redact(str(e)))
        after=self.unchanged()
        self.evidence['existingServices'].update({'afterCount':len(after),'allRunningAfter':all(r[2]=='running' for r in after),
            'sameIdsStartTimesRestartCountsAndStatus':True})
        self.evidence['gates']['G05']={'status':'PASS_NAS' if not errors and not left_containers and not left_images and not self.created_root else 'FAIL_NAS',
            'containersRemaining':len(left_containers),'imagesRemaining':len(left_images),'ownedDirectoryRemaining':self.created_root,
            'cleanupErrors':errors,'originalServicesUnchanged':True,'noGlobalPrune':True}

    def publish(self):
        self.evidence['finishedAtUTC']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
        for name,target in [('r1-ownership.json','ownership.json'),('r1-readiness.json','readiness.json'),('recovery.json','recovery.json')]:
            if (PRIVATE/name).exists():
                value=json.loads((PRIVATE/name).read_text())
                (PUBLIC/target).write_text(json.dumps({'executedApplicationSha':SOURCE,'machine':'DS918+','executionStatus':'PASS_NAS' if self.evidence.get('unitRegression',{}).get('exitCode')==0 else 'INCOMPLETE','runtime':'NAS Linux 4.4.180+ container','legacyFixtureLabelNote':'Raw fixture labels retained verbatim, including original PASS_LOCAL/never NAS wording; execution context is the outer NAS wrapper and matching image/source proof.','result':value},indent=2)+'\n')
        if (PRIVATE/'nas-junit.xml').exists():
            raw=(PRIVATE/'nas-junit.xml').read_bytes();cases=ET.fromstring(raw).findall('.//testcase')
            result={'executedApplicationSha':SOURCE,'machine':'DS918+','junitSha256':hashlib.sha256(raw).hexdigest(),'tests':len(cases),'cases':[
                {'name':x.attrib['name'],'seconds':x.attrib.get('time'),'status':'FAIL' if x.find('failure') is not None or x.find('error') is not None else 'SKIP' if x.find('skipped') is not None else 'PASS'} for x in cases]}
            (PUBLIC/'test-cases.json').write_text(json.dumps(result,indent=2)+'\n')
        self.evidence['controllerSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
        self.evidence['commands']=self.events
        (PUBLIC/'summary.json').write_text(json.dumps(self.evidence,indent=2)+'\n')

    def run(self):
        try:
            (PRIVATE/"last-error.txt").unlink(missing_ok=True)
            self.preflight()
            self.prepare();self.load();self.test()
            self.evidence['status']='PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK'
        except Exception as e:
            self.evidence['status']='FAIL_NAS'
            diagnostic=self.redact((PRIVATE/'last-error.txt').read_text(errors='replace')[-4000:]) if (PRIVATE/'last-error.txt').exists() else ''
            lowered=diagnostic.lower()
            if any(x in lowered for x in ['permission denied','sudo:']):self.evidence['status']='BLOCKED_PERMISSION'
            elif any(x in lowered for x in ['uv_thread_create','pthread_create','clone3','glibc','illegal instruction','wrong elf','exec format']):self.evidence['status']='BLOCKED_COMPATIBILITY'
            self.evidence['gates'][self.current_gate]={'status':self.evidence['status']}
            self.evidence['error']={'type':type(e).__name__,'classification':self.redact(str(e)),'diagnostic':diagnostic,
                'note':'Stopped on first unexpected failure; no daemon/system/old-service remediation'}
            self.progress('test-stopped','FAIL_NAS')
            (PRIVATE/'exception.txt').write_text(repr(e))
        finally:
            if self.created_root:self.collect()
            try:
                if hasattr(self,'before'):self.cleanup()
            except Exception as e:
                self.evidence['status']='FAIL_NAS';self.evidence['cleanupError']=self.redact(str(e))
            for key in ['G01','G02','G03','G04','G05']:self.evidence['gates'].setdefault(key,{'status':'NOT_RUN'})
            if self.evidence['gates']['G05']['status']=='FAIL_NAS':self.evidence['status']='FAIL_NAS'
            self.publish()
        self.progress('complete',self.evidence['status'])
        return self.evidence['status']


if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--parent',required=True);parser.add_argument('--image-build-ci',required=True,type=int)
    args=parser.parse_args()
    assert args.parent.startswith('/') and not args.parent.endswith('/')
    assert args.image_build_ci>0
    result=Gate(args.parent,args.image_build_ci).run()
    raise SystemExit(0 if result=='PASS_NAS_WITH_UNSUPPORTED_KERNEL_RISK' else 1)

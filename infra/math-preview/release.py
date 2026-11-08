#!/usr/bin/env python3
"""Versioned updates to the owned, data-free LAN preview. Keep prior containers for rollback."""
import argparse,json,pathlib,subprocess,shlex,time,urllib.request,re
from controller import Controller,PLAN,ROOT,APP,OLD_TLS,owned,validate_old,sha_file

class Release:
    def __init__(self):self.c=Controller()

    def app(self,sha):
        c=self.c
        row=c.state['releases'][sha] if sha else {'name':APP,'appId':c.state['appId'],'imageId':c.state['imageId'],'buildSha':c.state['buildSha'],'ip':PLAN['appIP']}
        expected_name=APP if sha is None else PLAN['resourcePrefix']+'-'+sha[:12]+'-app'
        assert row['name']==expected_name,'RELEASE_NAME_MISMATCH'
        meta=c.inspect(row['name']);owned(meta,row['name'])
        assert meta['Id']==row['appId'] and meta['Image']==row['imageId'] and not meta['Mounts'],'RELEASE_IDENTITY_CHANGED'
        assert meta['Config']['User']=='1024:100' and meta['HostConfig']['ReadonlyRootfs'],'RELEASE_HARDENING_CHANGED'
        return row,meta

    def verify(self,sha,public=False):
        c=self.c;row,_=self.app(sha)
        if public:
            opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
            for _ in range(60):
                try:
                    with opener.open(c.state['origin']+'/preview-api/v1/runtime',timeout=3) as response:data=json.load(response)
                    assert data['buildSha']==row['buildSha'] and data['lessons']==70 and data['database'] is False
                    return data
                except Exception:time.sleep(.25)
            raise RuntimeError('PUBLISHED_RELEASE_NOT_READY')
        script="""import http from 'node:http';const data=await new Promise((resolve,reject)=>http.get({host:%s,port:4179,path:'/preview-api/v1/runtime',headers:{Host:'192.168.2.100:38444'}},r=>{let b='';r.on('data',x=>b+=x);r.on('end',()=>resolve(JSON.parse(b)));}).on('error',reject));console.log(JSON.stringify(data));"""%json.dumps(row['ip'])
        for _ in range(60):
            try:
                data=json.loads(c.docker('exec',row['name'],'node','--input-type=module','-e',script))
                assert data['buildSha']==row['buildSha'] and data['lessons']==70 and data['database'] is False
                return data
            except Exception:time.sleep(.25)
        raise RuntimeError('INTERNAL_RELEASE_NOT_READY')

    def stage(self,archive,proof):
        c=self.c;c.preflight();c.wait_public()
        assert c.state.get('active')=='preview-http','EXISTING_HTTP_PREVIEW_REQUIRED'
        meta=json.loads(pathlib.Path(proof).read_text());sha=meta['buildSha']
        assert re.fullmatch('[a-f0-9]{40}',sha) and sha==subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'LATEST_HEAD_IMAGE_REQUIRED'
        assert meta['status']=='PASS_PREVIEW_IMAGE_CI' and meta['architecture']=='linux/amd64'
        assert meta['appMounts']==0 and meta['formalServerOrSQLiteInImage'] is False and meta['realLANHTTP'] is True
        assert sha_file(archive)==meta['archive']['sha256'] and pathlib.Path(archive).stat().st_size==meta['archive']['bytes']
        if sha in c.state.get('releases',{}):return self.verify(sha)
        c.ensure_root();remote=ROOT+'/artifacts/preview-'+sha+'.tar.gz'
        if c.python('import os;print(os.path.lexists(%r))'%remote)=='False':
            with open(archive,'rb') as f:
                command=shlex.join(['python3','-c',"import os,sys,shutil;f=open(%r,'xb');os.chmod(%r,0o600);shutil.copyfileobj(sys.stdin.buffer,f);f.close()"%(remote,remote)])
                result=subprocess.run(['ssh','-o','BatchMode=yes','nas-codex',command],stdin=f,capture_output=True,timeout=300)
                assert result.returncode==0,'OWNED_ARCHIVE_UPLOAD_FAILED'
        remote_hash=c.python("import os,hashlib;assert not os.path.islink(%r);f=open(%r,'rb');h=hashlib.sha256();\nfor b in iter(lambda:f.read(1048576),b''):h.update(b)\nprint(h.hexdigest())"%(remote,remote))
        assert remote_hash==meta['archive']['sha256'],'REMOTE_ARCHIVE_HASH_MISMATCH'
        c.docker('load','-i',remote);image=json.loads(c.docker('image','inspect',meta['imageId']))[0]
        assert image['Config']['Labels']['org.opencontainers.image.revision']==sha and image['Config']['Labels']['org.kevin-learning-home.mode']=='content-only-preview'
        assert image['Architecture']=='amd64' and image['Config']['User']=='node'
        tag=PLAN['resourcePrefix']+':'+sha[:12];c.docker('tag',image['Id'],tag)
        if meta.get('imageTag','').startswith('klh-content-ci:'):
            assert json.loads(c.docker('image','inspect',meta['imageTag']))[0]['Id']==image['Id']
            c.docker('image','rm',meta['imageTag'])
        net=PLAN['resourcePrefix']+'-net';network=json.loads(c.docker('network','inspect',net))[0]
        assert network['Labels'].get('org.kevin-learning-home.preview')==PLAN['runId']
        used={x['IPv4Address'].split('/')[0] for x in network['Containers'].values()}
        ip=next((f'172.30.244.{n}' for n in range(3,7) if f'172.30.244.{n}' not in used),None)
        assert ip,'OWNED_NETWORK_FULL_REQUIRES_REVIEWED_CLEANUP'
        name=PLAN['resourcePrefix']+'-'+sha[:12]+'-app';env=c.env(ip);env[-1]+=','+ip+'/32'
        app_id=c.docker('run','-d','--name',name,*c.hardening(),'--memory','256m','--network',net,'--ip',ip,*env,image['Id'])
        c.state.setdefault('releases',{})[sha]={'name':name,'appId':app_id,'imageId':image['Id'],'buildSha':sha,'imageTag':tag,'ip':ip}
        c.state['candidateRelease']=sha;c.save()
        self.verify(sha);c.invariance()
        return {'status':'STAGED_NO_HOST_PORT','release':sha,'imageId':image['Id'],'appId':app_id,'ip':ip,'currentUserEntryUnchanged':True}

    def activate(self,sha,remember=True):
        c=self.c;c.invariance();previous=c.state.get('activeRelease')
        row,meta=self.app(sha);old,old_meta=self.app(previous)
        tls=c.inspect(OLD_TLS);validate_old(tls,OLD_TLS)
        assert not tls['State']['Running'],'OLD_TLS_MUST_REMAIN_UNCHANGED_STOPPED'
        ports={'4179/tcp':[{'HostIp':'192.168.2.100','HostPort':'38444'}]}
        assert meta['HostConfig']['PortBindings'] in [None,{},ports]
        assert old_meta['HostConfig']['PortBindings']==ports
        if sha==previous:return self.verify(sha,public=True)
        try:
            if old_meta['State']['Running']:c.docker('stop',old['appId'])
            if not meta['HostConfig']['PortBindings']:
                c.docker('rm','-f',row['appId']);env=c.env(row['ip']);env[-1]+=','+row['ip']+'/32'
                row['appId']=c.docker('run','-d','--name',row['name'],*c.hardening(),'--memory','256m','--network',PLAN['resourcePrefix']+'-net','--ip',row['ip'],*env,'-p','192.168.2.100:38444:4179',row['imageId']);c.save()
            elif not meta['State']['Running']:c.docker('start',row['appId'])
            actual=self.verify(sha,public=True);c.invariance()
        except Exception:
            try:candidate=c.inspect(row['name'])
            except RuntimeError:candidate=None  # run may fail after the owned staging container was removed
            if candidate:
                owned(candidate,row['name'])
                assert candidate['Id']==row['appId'] and candidate['Image']==row['imageId'] and not candidate['Mounts']
                if candidate['State']['Running']:c.docker('stop',candidate['Id'])
            c.docker('start',old['appId']);self.verify(previous,public=True);c.invariance()
            raise
        if remember:c.state['rollbackRelease']=previous
        c.state['activeRelease']=sha;c.state['active']='preview-http';c.save()
        return {'status':'ACTIVE_VERSIONED_HTTP_RELEASE','origin':c.state['origin'],'buildSha':actual['buildSha'],'imageId':row['imageId'],'appId':row['appId'],'previousReleaseRetained':old['buildSha'],'protectedContainersUnchanged':len(c.state['protectedBefore'])}

    def rollback(self):
        assert 'rollbackRelease' in self.c.state,'NO_RECORDED_ROLLBACK_TARGET'
        return self.activate(self.c.state['rollbackRelease'],remember=False)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['stage','activate','rollback']);p.add_argument('--archive');p.add_argument('--proof');p.add_argument('--sha');args=p.parse_args();r=Release()
    if args.action=='stage':
        assert args.archive and args.proof;result=r.stage(args.archive,args.proof)
    elif args.action=='activate':result=r.activate(args.sha or r.c.state['candidateRelease'])
    else:result=r.rollback()
    print(json.dumps(result))

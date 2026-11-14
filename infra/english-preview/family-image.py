#!/usr/bin/env python3
"""Add a frozen family source bundle to an already CI-verified, staged content image.
Never changes an active container, a host port, TLS, protected services or real records.
"""
import argparse,hashlib,json,pathlib,re,shlex,subprocess,sys,tarfile,tempfile,io
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'math-preview'))
from release import Release
from controller import ROOT,PLAN,owned,sha_file
SOURCE='d0b42a8872a7e87433b96770519203630223b6f2'

def verify_bundle(directory):
    directory=pathlib.Path(directory).resolve()
    def read(name):
        p=directory/name
        assert not p.is_symlink() and p.resolve().is_relative_to(directory),'BUNDLE_SYMLINK_OR_ESCAPE'
        return p.read_bytes()
    seal=json.loads(read('seal.json'));raw=read('bundle.json')
    assert hashlib.sha256(raw).hexdigest()==seal['bundleSha256'],'BUNDLE_HASH_CHANGED'
    b=json.loads(raw)
    assert seal['sourceSha']==b['sourceSha']==SOURCE
    assert seal['scope']==b['scope']=='family-lan-source'
    assert seal['publicationApproved'] is False and b['publicationApproved'] is False
    assert hashlib.sha256(raw).hexdigest()==seal['bundleSha256']
    assert len(b['cards'])==6631 and len(b['groups'])==665 and len(b['exerciseAnswers'])==128
    files=['seal.json','bundle.json']
    for url,m in b['media'].items():
        assert re.fullmatch('media/[a-f0-9]{64}\\.webp',m['path'])
        assert url=='/preview-api/v1/english/'+m['path']
        data=read(m['path']);assert len(data)==m['bytes'] and hashlib.sha256(data).hexdigest()==m['sha256']
        files.append(m['path'])
    return directory,seal,files

def build(directory):
    r=Release();c=r.c;c.preflight();c.invariance()
    sha=c.state['candidateRelease'];assert re.fullmatch('[a-f0-9]{40}',sha)
    assert sha!=c.state.get('activeRelease'),'ACTIVE_RELEASE_MUST_NEVER_BE_REPLACED'
    row,meta=r.app(sha);assert not meta['HostConfig']['PortBindings'],'UNPUBLISHED_STAGE_REQUIRED'
    if row.get('englishSourceSha')==SOURCE:return {'status':'ALREADY_STAGED_FAMILY_IMAGE','buildSha':sha,'imageId':row['imageId']}
    directory,seal,files=verify_bundle(directory)
    base=row['imageId'];assert re.fullmatch('sha256:[a-f0-9]{64}',base)
    tag=PLAN['resourcePrefix']+':'+sha[:12]
    assert json.loads(c.docker('image','inspect',tag))[0]['Id']==base,'CI_BASE_IMAGE_CHANGED'
    dockerfile=f'''FROM {tag}\nCOPY --chown=1024:100 .english-family /app/.english-family\nLABEL org.kevin-learning-home.english-source={SOURCE} org.kevin-learning-home.english-scope=family-lan-source org.kevin-learning-home.english-bundle={seal['bundleSha256']}\n'''
    with tempfile.TemporaryDirectory(prefix='klh-english-private-context-') as td:
        archive=pathlib.Path(td)/'family-context.tar.gz'
        with tarfile.open(archive,'w:gz') as tar:
            data=dockerfile.encode();info=tarfile.TarInfo('Dockerfile');info.size=len(data);info.mode=0o600;tar.addfile(info,io.BytesIO(data))
            for name in files:tar.add(directory/name,arcname='.english-family/'+name,recursive=False)
        digest=sha_file(archive);remote=ROOT+'/artifacts/english-family-'+digest+'.tar.gz'
        if c.python('import os;print(os.path.lexists(%r))'%remote)=='False':
            code="import os,sys,shutil;f=open(%r,'xb');os.chmod(%r,0o600);shutil.copyfileobj(sys.stdin.buffer,f);f.close()"%(remote,remote)
            with archive.open('rb') as stream:
                p=subprocess.run(['ssh','-o','BatchMode=yes','nas-codex',shlex.join(['python3','-c',code])],stdin=stream,capture_output=True,timeout=300)
                assert p.returncode==0,'FAMILY_CONTEXT_UPLOAD_FAILED'
        remote_hash=c.python("import hashlib;f=open(%r,'rb');h=hashlib.sha256();\nfor x in iter(lambda:f.read(1048576),b''):h.update(x)\nprint(h.hexdigest())"%remote)
        assert remote_hash==digest,'REMOTE_CONTEXT_HASH_CHANGED'
        family_tag=PLAN['resourcePrefix']+'-family:'+sha[:12]
        with archive.open('rb') as stream:
            p=subprocess.run(['ssh','-o','BatchMode=yes','nas-codex',shlex.join(['sudo','-n','/usr/local/bin/docker','build','--network','none','-t',family_tag,'-'])],stdin=stream,capture_output=True,timeout=300)
            assert p.returncode==0,'OFFLINE_FAMILY_IMAGE_BUILD_FAILED'
    image=json.loads(c.docker('image','inspect',family_tag))[0]
    assert image['Config']['User']=='node' and image['Architecture']=='amd64'
    assert image['Config']['Labels']['org.opencontainers.image.revision']==sha
    assert image['Config']['Labels']['org.kevin-learning-home.english-bundle']==seal['bundleSha256']
    probe="""import {startPreview} from './apps/preview/server.ts';const s=await startPreview({enabled:true,port:0});try{const o='http://127.0.0.1:'+s.address().port;const r=await fetch(o+'/preview-api/v1/runtime').then(r=>r.json());if(r.database!==false||r.lessons!==70||r.english.cards!==6631||r.english.groups!==665)throw Error('RUNTIME_INVALID');console.log(JSON.stringify({status:'PASS_FAMILY_IMAGE',buildSha:r.buildSha,english:r.english,rss:process.memoryUsage().rss}));}finally{s.closeAllConnections();await new Promise(r=>s.close(r));}"""
    proof=json.loads(c.docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--user','1024:100',image['Id'],'node','--input-type=module','-e',probe))
    assert proof['buildSha']==sha
    old_image=row['imageId'];new_id=None
    try:
        if meta['State']['Running']:c.docker('stop',row['appId'])
        c.docker('rm',row['appId']);env=c.env(row['ip']);env[-1]+=','+row['ip']+'/32'
        new_id=c.docker('run','-d','--name',row['name'],*c.hardening(),'--memory','256m','--network',PLAN['resourcePrefix']+'-net','--ip',row['ip'],*env,image['Id'])
        row.update(appId=new_id,imageId=image['Id'],ciBaseImageId=old_image,englishSourceSha=SOURCE,englishBundleSha256=seal['bundleSha256'],englishContextSha256=digest)
        c.save();r.verify(sha);c.invariance()
    except Exception:
        # Active previous release has not been touched; restore the unpublished candidate.
        if new_id:c.docker('rm','-f',new_id)
        env=c.env(row['ip']);env[-1]+=','+row['ip']+'/32'
        row.update(appId=c.docker('run','-d','--name',row['name'],*c.hardening(),'--memory','256m','--network',PLAN['resourcePrefix']+'-net','--ip',row['ip'],*env,old_image),imageId=old_image)
        c.save();raise
    return {'status':'FAMILY_SOURCE_STAGED_NO_PORT_SWITCH','buildSha':sha,'imageId':image['Id'],'ciBaseImageId':base,'sourceSha':SOURCE,'bundleSha256':seal['bundleSha256'],'publicationApproved':False,'probe':proof,'realRecordsImported':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('bundle');p.add_argument('--output',required=True);args=p.parse_args();result=build(args.bundle)
    pathlib.Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

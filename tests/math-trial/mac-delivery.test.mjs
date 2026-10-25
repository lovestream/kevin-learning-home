import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync,chmodSync,existsSync,symlinkSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {deliver} from '../../infra/math-trial/mac-delivery.mjs';
import {validateDelivery,reserveRuntime,cleanRuntime,closeAfterLastPage} from '../../infra/math-trial/mac-entry.mjs';
import {EventEmitter} from 'node:events';
function fixture(){
  const root=realpathSync(mkdtempSync(join(tmpdir(),'klh-delivery-test-'))),repo=join(root,'repo'),dest=join(root,'delivery');
  mkdirSync(repo);mkdirSync(join(repo,'infra'));mkdirSync(join(repo,'infra/math-trial'));
  const privateDir=join(repo,'.trial-private');mkdirSync(privateDir,{mode:0o700});
  const plan={runId:'20261024-8f228391',lanIp:'192.168.2.100',port:38444};
  writeFileSync(join(repo,'infra/math-trial/plan.json'),JSON.stringify(plan));
  writeFileSync(join(privateDir,'credentials.json'),JSON.stringify({runId:plan.runId,origin:'https://192.168.2.100:38444',
    learner:{login:'synthetic-child',password:'fixture-child-secret'},parent:{login:'synthetic-parent',password:'fixture-parent-secret'}}),{mode:0o600});
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=Delivery unit CA','-keyout',join(root,'key'),'-out',join(privateDir,'ca.pem')],{stdio:'ignore'});
  execFileSync('openssl',['x509','-in',join(privateDir,'ca.pem'),'-outform','DER','-out',join(privateDir,'klh-trial-ca.cer')]);
  chmodSync(join(privateDir,'klh-trial-ca.cer'),0o600);
  return {root,repo,dest,privateDir,close:()=>rmSync(root,{recursive:true,force:true})};
}
test('fixed delivery is idempotent, private, public-CA-only, with no passwords in returned metadata or launcher',()=>{
  const f=fixture();try{
    const result=deliver(f.repo,f.dest);deliver(f.repo,f.dest);
    assert.equal(statSync(f.dest).mode&0o777,0o700);
    assert.equal(statSync(join(f.dest,'START-HERE.md')).mode&0o777,0o600);
    assert.equal(statSync(join(f.dest,'打开数学课堂.command')).mode&0o777,0o700);
    const safe=JSON.stringify(result)+readFileSync(join(f.dest,'打开数学课堂.command'),'utf8');
    assert(!safe.includes('fixture-child-secret')&&!safe.includes('fixture-parent-secret'));
    assert(!existsSync(join(f.dest,'ca.key'))&&!existsSync(join(f.dest,'credentials.json')));
    const d=validateDelivery(f.dest,f.repo);assert.equal(d.origin,'https://192.168.2.100:38444');
  }finally{f.close();}
});
test('unowned existing folder, symlink destination, readable private source and changed user guide are preserved',()=>{
  const f=fixture();try{
    mkdirSync(f.dest,{mode:0o700});assert.throws(()=>deliver(f.repo,f.dest));
    rmSync(f.dest,{recursive:true});symlinkSync(f.privateDir,f.dest);
    assert.throws(()=>deliver(f.repo,f.dest),/SYMLINK/);rmSync(f.dest);
    chmodSync(f.privateDir,0o755);assert.throws(()=>deliver(f.repo,f.dest),/MODE/);
    assert(!existsSync(f.dest));chmodSync(f.privateDir,0o700);deliver(f.repo,f.dest);
    writeFileSync(join(f.dest,'START-HERE.md'),'user notes');
    assert.throws(()=>deliver(f.repo,f.dest),/USER_EDITS/);
    assert.equal(readFileSync(join(f.dest,'START-HERE.md'),'utf8'),'user notes');
  }finally{f.close();}
});
test('one runtime per delivery: repeat launch does not create a second profile; unknown user file survives cleanup',()=>{
  const f=fixture();try{
    deliver(f.repo,f.dest);const d=validateDelivery(f.dest,f.repo),r=reserveRuntime(d);
    assert.equal(reserveRuntime(d).alreadyRunning,true);
    mkdirSync(r.profile,{mode:0o700});writeFileSync(join(r.runtime,'user-notes'),'keep');
    cleanRuntime(r);assert(!existsSync(r.profile));assert.equal(readFileSync(join(r.runtime,'user-notes'),'utf8'),'keep');
  }finally{f.close();}
});
test('closing the last visible tab releases the one-instance runtime; another open tab is preserved',async()=>{
  const context=new EventEmitter(),a=new EventEmitter(),b=new EventEmitter();
  let pages=[a],closed=0;context.pages=()=>pages;
  closeAfterLastPage(context,async()=>{closed++;});
  pages=[a,b];context.emit('page',b);pages=[b];a.emit('close');
  assert.equal(closed,0);pages=[];b.emit('close');await Promise.resolve();assert.equal(closed,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import https from 'node:https';
import { trustedProfile } from '../../infra/math-trial/browser-trust.mjs';

test('profile CA trust keeps chain, SAN, expiry checks and other profiles isolated', async () => {
  const d=mkdtempSync(join(tmpdir(),'klh-trust-test-'));
  const run=a=>execFileSync('openssl',a,{cwd:d,stdio:'ignore'});
  const opts={headless:true,executablePath:chromium.executablePath(),ignoreHTTPSErrors:false};
  let context,other,server,expired;
  const listen=async cert=>{
    const s=https.createServer({key:readFileSync(join(d,'server.key')),cert:readFileSync(join(d,cert))},(q,r)=>r.end('verified'));
    await new Promise(r=>s.listen(0,'127.0.0.1',r));return s;
  };
  try {
    run(['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=Disposable profile CA','-keyout','ca.key','-out','ca.crt']);
    run(['req','-newkey','rsa:2048','-nodes','-subj','/CN=localhost','-keyout','server.key','-out','server.csr']);
    writeFileSync(join(d,'extensions'),'subjectAltName=DNS:localhost\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n');
    const sign=(days,out)=>run(['x509','-req','-in','server.csr','-CA','ca.crt','-CAkey','ca.key','-CAcreateserial','-days',days,'-extfile','extensions','-out',out]);
    sign('1','server.crt');sign('0','expired.crt');
    server=await listen('server.crt');expired=await listen('expired.crt');
    context=await trustedProfile(chromium,join(d,'trusted'),join(d,'ca.crt'));
    let p=await context.newPage();
    assert.equal((await p.goto('https://localhost:'+server.address().port)).status(),200);
    assert.equal(await p.locator('body').innerText(),'verified');
    await assert.rejects(p.goto('https://127.0.0.1:'+server.address().port),/ERR_CERT_COMMON_NAME_INVALID/);
    await p.close();p=await context.newPage();
    await new Promise(r=>setTimeout(r,1100));
    await assert.rejects(p.goto('https://localhost:'+expired.address().port),/ERR_CERT_DATE_INVALID/);
    other=await chromium.launchPersistentContext(join(d,'untrusted'),opts);
    p=await other.newPage();
    await assert.rejects(p.goto('https://localhost:'+server.address().port),/ERR_CERT_AUTHORITY_INVALID/);
    await assert.rejects(trustedProfile(chromium,join(d,'trusted'),join(d,'ca.crt')),/EEXIST/);
  } finally {
    await context?.close();await other?.close();
    for(const s of [server,expired]) if(s){s.closeAllConnections();await new Promise(r=>s.close(r));}
    rmSync(d,{recursive:true,force:true});
  }
});

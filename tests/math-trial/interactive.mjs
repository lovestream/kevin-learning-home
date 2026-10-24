// Local-only human trial. Fresh profile; no credentials in args, logs or screenshots.
import {chromium} from '@playwright/test';
import {trustedProfile} from '../../infra/math-trial/browser-trust.mjs';
import {state} from './nas-evidence.mjs';
import {rmSync} from 'node:fs';
const profile='.trial-private/interactive-'+Date.now();
const c=await trustedProfile(chromium,profile,'.trial-private/tls/ca.crt',{headless:false});
c.on('close',()=>rmSync(profile,{recursive:true,force:true}));
const p=await c.newPage();await p.goto(state.origin+'/login');
await new Promise(resolve=>c.once('close',resolve));

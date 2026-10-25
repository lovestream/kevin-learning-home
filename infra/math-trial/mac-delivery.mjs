// Local delivery only. Does not write NAS, change credentials, or copy private keys.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,lstatSync,realpathSync,existsSync,chmodSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import os from 'node:os';
import {createHash,X509Certificate} from 'node:crypto';
export const defaultDelivery=()=>join(os.homedir(),'Documents','Kevin-Learning-Home-Trial');
export const digest=x=>createHash('sha256').update(x).digest('hex');
export const quote=x=>"'"+x.replaceAll("'","'\\''")+"'";
export function owned(path,mode){
  const s=lstatSync(path);
  assert(!s.isSymbolicLink()&&realpathSync(path)===resolve(path),'LOCAL_SYMLINK_REJECTED');
  assert.equal(s.uid,process.getuid(),'LOCAL_OWNER_MISMATCH');
  if(mode!==undefined)assert.equal(s.mode&0o777,mode,'LOCAL_MODE_MISMATCH');
  return s;
}
export function sourceMaterial(repo){
  repo=realpathSync(repo);owned(join(repo,'.trial-private'),0o700);
  const credentialsPath=join(repo,'.trial-private','credentials.json');owned(credentialsPath,0o600);
  const plan=JSON.parse(readFileSync(join(repo,'infra/math-trial/plan.json')));
  const credentials=JSON.parse(readFileSync(credentialsPath));
  const origin='https://'+plan.lanIp+':'+plan.port;
  assert.equal(origin,'https://192.168.2.100:38444');
  assert(credentials.runId===plan.runId&&credentials.origin===origin,'SYNTHETIC_SOURCE_MISMATCH');
  const caPath=join(repo,'.trial-private','klh-trial-ca.cer');owned(caPath,0o600);
  const caBytes=readFileSync(caPath),ca=new X509Certificate(caBytes);
  assert(ca.ca&&Date.parse(ca.validTo)>Date.now(),'TRIAL_CA_EXPIRED');
  return {repo,plan,credentials,origin,ca,caBytes};
}
export function deliver(repo,destination=defaultDelivery()){
  const m=sourceMaterial(repo);destination=resolve(destination);owned(dirname(destination));
  const markerPath=join(destination,'.delivery.json');
  let previous;
  if(existsSync(destination)){
    owned(destination,0o700);owned(markerPath,0o600);
    previous=JSON.parse(readFileSync(markerPath));
    assert(previous.repo===m.repo&&previous.runId===m.plan.runId,'UNOWNED_DELIVERY_DIRECTORY');
    // Keep user edits and unknown files; no overwrite of modified delivered files.
    for(const [name,h] of Object.entries(previous.files)){
      assert(['START-HERE.md','KLH-TRIAL-CA.cer','打开数学课堂.command'].includes(name));
      owned(join(destination,name));assert.equal(digest(readFileSync(join(destination,name))),h,'DELIVERED_FILE_HAS_USER_EDITS');
    }
  }
  const guide=[
    '# 从这里打开数学课堂（私密，请勿上传或分享）','',
    '**新数学入口：'+m.origin+'/**',
    '**旧 38443 是旧外壳，两科仍待迁入；这里的新账号与旧账号不同。**','',
    '## 只需三步','',
    '1. 在这个文件夹双击「打开数学课堂.command」。它在这台 Mac 打开专属 Chromium 窗口，完整验证本次测试证书。',
    '启动会出现一个终端运行窗口，体验时保持它打开；关闭专属浏览器后运行结束。',
    '2. 使用下面「孩子」的新账号和密码登录，首页应是「数学：只读课堂；英语：待迁入」。',
    '3. 点数学，再点「打开首课只读课堂」。六步、旋转与照片都可体验；刷新即重置，不保存学习记录。','',
    '## 新合成账户（密码只保存在本机私密文件）','',
    '孩子登录名：`'+m.credentials.learner.login+'`',
    '孩子密码：`'+m.credentials.learner.password+'`','',
    '家长登录名：`'+m.credentials.parent.login+'`',
    '家长密码：`'+m.credentials.parent.password+'`','',
    '家长登录后仍需再次输入家长密码解锁。登录有正式限速：5次/15分钟，遇429等自然窗口，不反复重试。','',
    '## 机器、固定入口和工作副本','',
    '当前 Mac：`'+os.hostname()+'`；本机账户：`'+os.userInfo().username+'`。',
    'Finder → 前往 → 前往文件夹，粘贴：`'+destination+'`',
    '唯一活动工作副本：`'+m.repo+'`',
    '原私密来源：`'+join(m.repo,'.trial-private','START-HERE.md')+'`',
    '这里有独立的可见指南和公开CA，不含CA私钥；其它项目文件夹先按整理清单处理，不要直接删。','',
    '## 证书和手机/iPad','',
    '测试证书有效至 '+new Date(m.ca.validTo).toISOString()+'。',
    '普通 Safari/手机/iPad 不信任这份私有CA，当前不能据此承诺可用。不要点继续访问、关闭验证或全局安装根证书。',
    '请先用本文件夹的专属 Mac 浏览器；手机/iPad仍为 NEEDS_USER_ACTION/NOT_RUN，受信任域名证书方案另行审查。',
    '若浏览器询问保存密码，选择 No Thanks（不保存）；不要将测试口令存入系统密码管理器。',
    '首次打开如遇macOS阻止运行或目录权限提示，先停止并反馈；不用更改系统安全设置。',
    '课堂直达：'+m.origin+'/subjects/math/lessons/G3-U01-B01','',
    '## 双击后','',
    '窗口标题应显示 Kevin 学习家园，地址端口为38444；请勿切回旧38443。',
    '浏览器已运行时再次双击不会生成第二份配置。关闭专属浏览器后本次临时配置清理，指南和公开CA继续保留。',
    '原始密钥/口令源仍在唯一活动工作副本；此目录是安全交付副本，不是Git仓库。',''
  ].join('\n');
  const command='#!/bin/zsh\nset -eu\ncd -- '+quote(m.repo)+'\nexec '+quote(process.execPath)+' '+quote(join(m.repo,'tests/math-trial/interactive.mjs'))+' --delivery '+quote(destination)+'\n';
  const files={'START-HERE.md':Buffer.from(guide),'KLH-TRIAL-CA.cer':m.caBytes,'打开数学课堂.command':Buffer.from(command)};
  if(!existsSync(destination))mkdirSync(destination,{mode:0o700});
  const hashes={};
  for(const [name,bytes] of Object.entries(files)){
    const path=join(destination,name);if(existsSync(path))owned(path);
    writeFileSync(path,bytes,{mode:name.endsWith('.command')?0o700:0o600});
    chmodSync(path,name.endsWith('.command')?0o700:0o600);hashes[name]=digest(bytes);
  }
  const marker={schema:1,repo:m.repo,runId:m.plan.runId,files:hashes};
  writeFileSync(markerPath,JSON.stringify(marker,null,2)+'\n',{mode:0o600});chmodSync(markerPath,0o600);
  // No credentials, guide text or key material returned to callers/logs.
  return {destination,guide:join(destination,'START-HERE.md'),publicCA:join(destination,'KLH-TRIAL-CA.cer'),
    launcher:join(destination,'打开数学课堂.command'),repo:m.repo,runId:m.plan.runId,
    caSha256:digest(m.ca.raw),directoryMode:'0700',privateFilesMode:'0600',launcherMode:'0700'};
}

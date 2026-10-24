#!/usr/bin/env python3
"""Offline evidence consistency gate. No old checkout, NAS, source execution or data."""
import hashlib, json, pathlib, re
from generate import MATH_SHA, WORD_SHA, ROOT, ROOTS, MANUAL_EDGES, allowed_path

DIR=ROOT/'docs/implementation/evidence/math-00'

def require(ok, code):
 if not ok:raise ValueError(code)

def validate(inv, contract):
 require(inv['source']['commit']==MATH_SHA and inv['englishExcluded']['commit']==WORD_SHA,'FREEZE_MISMATCH')
 require(inv['englishExcluded']['blobsRead']==0,'ENGLISH_OUT_OF_SCOPE')
 require(inv['sourceFilesCopied']==0 and not inv['oldBuildExecuted'] and not inv['nasAccessed'],'AUDIT_ONLY_BOUNDARY')
 require(inv['sourceBoundaryBefore']==inv['sourceBoundaryAfter'],'SOURCE_CHANGED')
 require(inv['sourceBoundaryBefore']['head']==MATH_SHA,'SOURCE_HEAD_MISMATCH')
 rows=inv['files']; by={x['path']:x for x in rows}
 require(len(by)==len(rows),'DUPLICATE_PATH')
 require(all(allowed_path(p) for p in by),'FORBIDDEN_PATH')
 require(all(r['gitMode'] in ['100644','100755'] for r in rows),'SOURCE_MODE_INVALID')
 require(inv['roots']==ROOTS,'AUDIT_ROOTS_CHANGED')
 require(all(re.fullmatch('[a-f0-9]{64}',r['sha256']) and re.fullmatch('[a-f0-9]{40}',r['sourceGitBlob']) and r['bytes']>0 for r in rows),'SOURCE_HASH_INVALID')
 require(all(r['decision'] in ['allow','adapt','exclude'] and r['purpose'] and r['targetModule'] and r['license'] for r in rows),'CLASSIFICATION_MISSING')
 require(all(r['decision']!='allow' for r in rows if r['path'].startswith(('server/','scripts/'))),'UNSAFE_ALLOW')
 prior=json.loads((ROOT/'docs/implementation/evidence/02b-nas-trial/source-freeze.json').read_text())['mathFiles']
 require(len(prior)==17 and all(p in by and by[p]['sha256']==v['sha256'] for p,v in prior.items()),'PRIOR17_MISMATCH')
 require(all(e['from'] in by and e['to'] in by for e in inv['edges']),'DEPENDENCY_NOT_INVENTORIED')
 edges={(e['from'],e['to'],e['kind']) for e in inv['edges']}
 require(all(e in edges for e in MANUAL_EDGES),'MANUAL_RESOURCE_EDGE_MISSING')
 require(not inv['nonliteralImports'],'UNREVIEWED_DYNAMIC_IMPORT')
 reachable=set(p for group in inv['roots'].values() for p in group)|{e[1] for e in MANUAL_EDGES}
 while True:
  after=reachable|{e['to'] for e in inv['edges'] if e['from'] in reachable}
  if reachable==after:break
  reachable=after
 require(reachable==set(by),'ORPHAN_SOURCE_NODE')
 require(inv['lessonInventory']['count']==70 and inv['lessonInventory']['uniqueLessonIds']==70 and inv['lessonInventory']['statusCounts']=={'draft':70} and len(inv['lessonInventory']['contentVersions'])==4,'LESSON_FREEZE_MISMATCH')
 first=inv['firstLesson']
 require((first['lessonId'],first['contentVersion'],first['editorialRevision'],first['status'])==('G3-U01-B01','2026-10-07.2','2026-10-09.4','draft'),'FIRST_LESSON_MISMATCH')
 require(first['taskSetCounts']=={'warmup':2,'core':3,'transfer':2,'challenge':1,'review':4},'TASK_INVENTORY_MISMATCH')
 require(all(len(first['taskIds'][k])==n for k,n in first['taskSetCounts'].items()),'TASK_IDS_MISSING')
 require(first['sourceAssetIds']==[] and first['externalBinaryAssetsForObserve']==[] and first['handsOnMode']=='observe' and not first['foldTemplatesRequired'],'FIRST_VISUAL_SCOPE')
 require(len(first['selectedSourcePaths'])==9 and all(p in by and by[p]['decision']!='exclude' for p in first['selectedSourcePaths']),'FIRST_CLOSURE_MISSING')
 require('/articleBlocks/*/referenceAnswer' in first['sensitiveFieldPaths'] and '/conceptScenes/*/expectedExplanation' in first['sensitiveFieldPaths'] and '/taskSets/review/*/responseSpec/expectedEvidence' in first['sensitiveFieldPaths'],'NESTED_ANSWER_AUDIT_MISSING')
 require(contract['status']=='PROPOSED_MATH01_NOT_IMPLEMENTED' and contract['sourceCommit']==MATH_SHA,'CONTRACT_SCOPE')
 require(not contract['featureFlag']['default'],'READONLY_DEFAULT_OFF')
 require(contract['contentVersion']==first['contentVersion'] and contract['editorialRevision']==first['editorialRevision'],'CONTRACT_SOURCE_MISMATCH')
 forbidden=set(contract['forbiddenResponseKeysAtAnyDepth'])
 require({'taskSets','expected','referenceAnswer','expectedExplanation','expectedEvidence','solution','wallet','pets','csrfToken'}<=forbidden,'ANSWER_POLICY_MISSING')
 require(all(not (set(v)&forbidden) for v in contract['objectFieldAllowlists'].values()),'PUBLIC_DTO_LEAK')
 require(contract['literalConstraints']['manifest.externalAssets']==[] and contract['literalConstraints']['spatial.mode']=='observe','ASSET_SCOPE')
 require(set(contract['acceptanceIds'])=={'A%02d'%i for i in range(1,13)},'ACCEPTANCE_COVERAGE')
 return {'status':'PASS_OFFLINE','files':len(rows),'dependencies':len(inv['edges']),'prior17Verified':True,'lessonIds':70,'firstLesson':'G3-U01-B01','courseFilesCopied':0}

def check_documents(inv):
 audit=(ROOT/'docs/implementation/MATH-00-SOURCE-AUDIT.md').read_text()
 acceptance=(ROOT/'docs/implementation/MATH-01-READONLY-ACCEPTANCE.md').read_text()
 for row in inv['files']:
  require(row['path'] in audit and row['sha256'] in audit,'FILE_ROW_NOT_DOCUMENTED')
 for i in range(1,13):require('A%02d'%i in acceptance,'ACCEPTANCE_NOT_DOCUMENTED')
 for name in ['source-inventory.json','readonly-contract.json']:
  digest=hashlib.sha256((DIR/name).read_bytes()).hexdigest()
  require(digest in audit,'EVIDENCE_DIGEST_NOT_DOCUMENTED')

if __name__=='__main__':
 inv=json.loads((DIR/'source-inventory.json').read_text());c=json.loads((DIR/'readonly-contract.json').read_text());r=validate(inv,c);check_documents(inv)
 print(json.dumps(r))

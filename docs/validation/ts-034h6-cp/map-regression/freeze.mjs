import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const here=import.meta.dirname,sha=b=>createHash('sha256').update(b).digest('hex');
// Independent literal results, fixed BEFORE compiling/executing the probe.
const rows=[
 ['script','before','empty','array []','LK',0,1,2],
 ['script','before','nonempty','element','LKEC',1,1,3],
 ['script','before','ordinary','element','LEC',1,1,3],
 ['script','before','undefined','element','LKEC',1,1,3],
 ['script','before','nondefault','unsupported map-species','LK',0,0,2],
 ['script','before','getthrow','exact abrupt','LKG',0,0,2],
 ['script','before','getnormal','element','LKGEC',1,1,3],
 ['script','before','badcallback','TypeError callback','L',0,0,2],
 ['legacy','before','empty','array []','LK',0,1,0],
 ['legacy','before','nonempty','element','LKEC',1,1,1],
 ['script','after','empty','unsupported map-species','LK',0,0,2],
 ['script','after','nonempty','unsupported map-species','LK',0,0,2],
 ['script','after','ordinary','element','LEC',1,1,3],
 ['script','after','undefined','element','LKEC',1,1,3],
 ['script','after','nondefault','unsupported map-species','LK',0,0,2],
 ['script','after','getthrow','exact abrupt','LKG',0,0,2],
 ['script','after','getnormal','element','LKGEC',1,1,3],
 ['script','after','badcallback','TypeError callback','L',0,0,2],
 ['legacy','after','empty','array []','LK',0,1,0],
 ['legacy','after','nonempty','element','LKEC',1,1,1]
];
const expectedByInput={};
for(const [id,element] of [['input-a','array [7]'],['input-b','array [11]']]) expectedByInput[id]=rows.map(([profile,stage,kind,outcome,effects,callbacks,allocations,steps])=>`${id} ${profile} ${stage} ${kind} | ${outcome==='element'?element:outcome} | effects=${effects} callbacks=${callbacks} allocations=${allocations} constructors=0 steps=${steps}`).join('\n')+'\n';
const hashes=Object.fromEntries(['probe.ts','freeze.mjs','../../../../src/array-map.ts','../../../../src/realm.ts','../../../../src/runtime.ts','../../../../src/script-execution-internal.ts','../input-a.js','../input-b.js'].map(p=>[p,sha(readFileSync(join(here,p)))]));
writeFileSync(join(here,'frozen.json'),JSON.stringify({status:'literal oracle frozen before execution; this is not a result',rows,expectedByInput,hashes},null,2)+'\n');
console.log('Frozen 20 rows per input; no execution');

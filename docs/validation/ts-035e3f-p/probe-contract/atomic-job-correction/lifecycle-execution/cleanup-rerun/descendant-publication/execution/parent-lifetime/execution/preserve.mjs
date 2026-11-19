// Preserve the one authorized main five-case invocation. No process creation.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,lstatSync,existsSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const here=import.meta.dirname,prior=resolve(here,'..'),repo=resolve(here,...Array(12).fill('..'));
const hash=b=>createHash('sha256').update(b).digest('hex'),write=(n,b)=>writeFileSync(join(here,n),b,{flag:'wx'}),json=(n,v)=>write(n,JSON.stringify(v,null,2)+'\n');
const root=join(repo,'typescript/build/ts035e3fp-atomic-job-lifecycle-parent-live'),files=[],directories=[];
const names=['descendant-pid.txt','leaf-ready.json','leaf-spawn.json','parent-ready.json'];
const pairNames=names.flatMap(n=>['death-with-live-descendant/'+n,'death-with-live-descendant/'+n+'.pending']);
function walk(p){for(const n of readdirSync(p).sort()){const q=join(p,n),s=lstatSync(q,{bigint:true});assert(!s.isSymbolicLink());const path=relative(root,q).replaceAll('\\','/');if(s.isDirectory()){directories.push(path);walk(q);}else{assert(s.isFile());assert.equal(s.nlink,pairNames.includes(path)?2n:1n,path);const b=readFileSync(q);files.push({path,bytes:b.length,sha256:hash(b),dev:String(s.dev),ino:String(s.ino),nlink:String(s.nlink),base64:b.toString('base64')});}}}walk(root);
const pairs=names.map(n=>[n,n+'.pending'].map(x=>files.find(r=>r.path==='death-with-live-descendant/'+x)));
for(const [a,b]of pairs){assert(a&&b);assert.equal(a.dev,b.dev);assert.equal(a.ino,b.ino);assert.equal(a.base64,b.base64);}
json('inventory.json',{root:relative(repo,root).replaceAll('\\','/'),directories,files:files.map(({base64,...r})=>r)});
json('hardlink-pairs.json',pairs.map(pair=>pair.map(({base64,...r})=>r)));
write('attempt-files.json.gz',gzipSync(Buffer.from(JSON.stringify(files)),{level:9}));
write('attempt.log',readFileSync(join(repo,'typescript/build/ts035e3fp-lifecycle-parent-live-attempt.log')));
write('prior-design.md',readFileSync(join(repo,'typescript/docs/script-build-provenance.md')));
const seal=readFileSync(join(prior,'manifest.json'));json('prior-manifest.json',{path:relative(repo,join(prior,'manifest.json')).replaceAll('\\','/'),bytes:seal.length,sha256:hash(seal)});
const rows=JSON.parse(readFileSync(join(root,'results.json')));assert.equal(rows.length,5);assert(rows.every(r=>r.status==='matched-future-literal'&&r.errors.length===0));assert(rows.slice(0,4).every(r=>r.emptyBeforeSafety===true&&r.safetyCleanup===false));
assert.equal(rows[4].id,'legacy-gap-control');assert.equal(rows[4].emptyBeforeSafety,false);assert.equal(rows[4].safetyCleanup,true);assert.deepEqual(rows[4].membersBeforeSafety,[18700]);
assert(!existsSync(root+'-diagnostic'));
write('results.json',readFileSync(join(root,'results.json')));
json('outcomes.json',{sourceCommit:'6b19f68513f3882cbe67f239f90d19bf59d8506b',authorizedMainInvocations:1,totalAuthorizedLifecycleInvocations:4,harnessExitCode:0,planned:5,attempted:5,matched:5,failed:0,unrun:0,diagnosticInvocations:0,scriptcInvocations:0,outerEmptyBeforeFallback:4,legacySurvivorsBeforeFallback:rows[4].membersBeforeSafety,safetyCleanupReturnedSuccessfully:1,rows});
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,r)=>n+r.bytes,0),matched:5,exactHardlinkPairs:4,outerEmptyBeforeFallback:4,legacySurvivorDetected:1,safetyCleanupReturnedSuccessfully:1,diagnosticInvocations:0}));

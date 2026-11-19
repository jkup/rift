import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync,unlinkSync} from 'node:fs';
const here='docs/validation/ts-035d2';
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const roots=readdirSync('docs/validation',{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='ts-035d2').map(e=>'docs/validation/'+e.name),backups=new Map(roots.flatMap(files).map(p=>[p,readFileSync(p)]));
mkdirSync(here+'/closure-correction',{recursive:true});let result;
try{
 const r=spawnSync(process.execPath,['docs/validation/ts-035c/new-host-suites.mjs'],{encoding:'utf8',timeout:1200000,maxBuffer:64*1024*1024});
 result={name:'C-host21',status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??'',provenance:'fresh after exact reviewed old-test migration'};
 writeFileSync(here+'/closure-correction/result.json',JSON.stringify(result,null,2)+'\n');writeFileSync(here+'/closure-correction/run.log',result.stdout+result.stderr);
 assert.ok(r.status===0&&!r.signal&&!r.error,result.stderr);
 const groups=JSON.parse(readFileSync('docs/validation/ts-035c/new-host-results.json'));assert.deepEqual(groups.map(g=>g.name),['codec','live-codec','launch','preflight','input']);assert.ok(groups.every(g=>g.status===0));
 const counts=groups.map(g=>Number(g.stdout.match(/tests (\d+)/)[1]));assert.deepEqual(counts,[3,2,6,4,6]);
}finally{
 for(const path of roots.flatMap(files)){const prior=backups.get(path),now=readFileSync(path);if(!prior||!prior.equals(now))copyFileSync(path,here+'/closure-correction/'+path.slice('docs/validation/'.length).replaceAll('/','__'));if(!prior)unlinkSync(path);}
 for(const [path,bytes] of backups){if(!readFileSync(path).equals(bytes))writeFileSync(path,bytes);assert.deepEqual(readFileSync(path),bytes);}
}
// Preserve original failures and retain passed pre-amendment runs; no unchanged rebuild.
const initial=JSON.parse(readFileSync(here+'/closure-attempt/required-suite-results.json'));
const unaffected=JSON.parse(readFileSync(here+'/unaffected-suite-results.json'));
const combined=[...initial.slice(0,3).map(r=>({...r,provenance:'retained pre-amendment pass; production unchanged'})),result,...unaffected.filter(r=>!r.name.startsWith('C-remaining-')).map(r=>({...r,provenance:'retained unaffected pass; production unchanged'}))];
assert.equal(combined.length,28);assert.ok(combined.every(r=>r.status===0&&r.signal===null&&r.error===null));
writeFileSync(here+'/required-suite-results.json',JSON.stringify(combined,null,2)+'\n');
console.log('PASS C host21 fresh; 28 required stages assembled with explicit retained/fresh provenance; historical evidence restored');

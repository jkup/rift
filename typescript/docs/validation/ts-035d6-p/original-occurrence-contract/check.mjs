import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parse} from '../../../build/node/src/parser.js';
const root=new URL('../../../../',import.meta.url),here=new URL('./',import.meta.url),json=p=>JSON.parse(readFileSync(new URL(p,here))),hash=b=>createHash('sha256').update(b).digest('hex'),results=[];
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});const record={args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr};results.push(record);if(r.status!==0||r.signal||r.error){let i=1;while(existsSync(new URL('failed-check-'+i+'.json',here)))i++;writeFileSync(new URL('failed-check-'+i+'.json',here),JSON.stringify(record,null,2)+'\n');}assert.equal(r.status,0,JSON.stringify(record));assert.equal(r.signal,null);assert.equal(r.error,undefined);}
run(['typescript/docs/validation/ts-035d6-p/verify.mjs']);
for(const name of readdirSync(here).filter(n=>n.endsWith('.mjs')))run(['--check','typescript/docs/validation/ts-035d6-p/'+name]);
for(const e of json('proposal-manifest.json').entries.filter(e=>e.originalSha256!==e.resultSha256)){
 run(['--check','typescript/docs/validation/ts-035d6-p/proposed/'+e.path]);
 const a=readFileSync(new URL(e.path,root),'utf8'),b=readFileSync(new URL('proposed/'+e.path,here),'utf8');
 assert.equal((a.match(/assert\./g)??[]).length+(e.path.includes('ts-035d4-p/wire.mjs')?2:0),(b.match(/assert\./g)??[]).length,e.path+' retained assertions');
}
for(const p of json('production-manifest.json')){
 assert.equal(hash(readFileSync(new URL('typescript/'+p.path,root))),p.originalSha256);
 assert.equal(hash(readFileSync(new URL('production-proposal/'+p.path,here))),p.resultSha256);
 if(p.path.endsWith('.mjs'))run(['--check','typescript/docs/validation/ts-035d6-p/production-proposal/'+p.path]);
}
const observer=readFileSync(new URL('typescript/src/script-observation.ts',root),'utf8'),proposal=readFileSync(new URL('production-proposal/src/script-observation.ts',here),'utf8');
const legacy=s=>s.slice(s.indexOf('        // Preserve independent legacy return certification'),s.indexOf('        return this.envelope(operation, site, rejection);'));
assert.equal(legacy(observer),legacy(proposal));
const matrix=json('semantic-matrix.json'),wire=json('wire-audit.json'),probe=json('probe-results.json'),controls=json('future-controls.json');
assert.equal(matrix.rows.length,102);assert.equal(matrix.rows.filter(r=>r.audit.kind==='blocked').length,56);assert.equal(matrix.rows.flatMap(r=>r.contexts).length,366);
assert.equal(probe.runtimeRuns,204);assert.equal(probe.inheritedChecks,360);assert(probe.results.every(r=>r.status===0&&!r.signal&&!r.error));
assert.equal(wire.accepted,192);assert.equal(wire.unimplemented,64);assert.equal(wire.rejections,77184);
assert.equal(controls.budgetRows.length,72);assert.equal(controls.readyRows.length,2);
for(const r of controls.noEffects)if(r.seed){const parsed=parse(r.seed.text);assert.equal(parsed.error,null);assert.deepEqual(parsed.body[1].loc,r.expected.history.location);assert.equal('completion' in r.expected.history,false);}
for(const r of controls.oracleMutations)assert.notDeepEqual(r.wrong,r.expected);
for(const [name,id] of [['alpha','R0'],['beta','R1']])assert.equal(readFileSync(new URL('inputs/'+name+'.js',here),'utf8'),matrix.rows.find(r=>r.id===id).text);
const history=readdirSync(new URL('original-history-contract/',here)).filter(n=>n!=='manifest.json').map(path=>({path,sha256:hash(readFileSync(new URL('original-history-contract/'+path,here)))}));
const manifestPath=new URL('original-history-contract/manifest.json',here);
if(existsSync(manifestPath))assert.deepEqual(JSON.parse(readFileSync(manifestPath)),history);else writeFileSync(manifestPath,JSON.stringify(history,null,2)+'\n');
writeFileSync(new URL('checks.json',here),JSON.stringify({claim:'Offline syntax/preservation/complete fixture verification; no future producer/native execution',results,legacyFallbackSha256:hash(legacy(observer)),rows:102,runtimeRuns:204,inheritedPreparations:360,wire,budgets:72,ready:2,history},null,2)+'\n');
console.log('PASS '+results.length+' offline checks; all literals, proposals and original history preserved');

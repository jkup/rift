import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {variants,blockers} from '../../../tools/test262/input.mjs';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const here='docs/validation/ts-035d8',json=p=>JSON.parse(readFileSync(p)),hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const allowed=new Set(['COORDINATION.md','TASKS.md','tools/build-native.mjs','docs/feature-inventory.md','src/parser.ts','src/script-observation.ts','src/script-observation-types.ts','tools/test262/script-driver-result.mjs','tools/test262/script-result.mjs','tools/test262/script-lexical-statement-dispatch.test.mjs',...JSON.parse(readFileSync('docs/validation/ts-035d8-p/proposal-manifest.json')).entries.filter(e=>e.originalSha256!==e.dispatchSha256).map(e=>e.path.replace(/^typescript\//,''))]);
const owned=p=>allowed.has(p)||p.startsWith('docs/validation/ts-035d8/')||p==='test/script-lexical-statement-dispatch.ts'||p.startsWith('test/fixtures/script-lexical-statement-dispatch/');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64e6}).trim();
for(const list of [git('diff','ff2117e','--name-only'),git('ls-files','--others','--exclude-standard')])assert.deepEqual(list.split('\n').filter(Boolean).map(p=>p.replace(/^typescript\//,'')).filter(p=>!owned(p)),[]);
for(const f of json('docs/validation/ts-035d8-p/audit.json').protectedInventory)if(!owned(f.path.replace(/^typescript\//,'')))assert.equal(hash('../'+f.path),f.sha256,f.path);
for(const e of json('docs/validation/ts-035d8-p/production-manifest.json').entries)assert.deepEqual(readFileSync(e.path),Buffer.from(e.proposedBytes,'base64'),e.path+' exact production');
const proposals=json('docs/validation/ts-035d8-p/old-test-proposals.json').entries;assert.equal(proposals.length,952);
for(const f of proposals){assert.deepEqual(readFileSync('../'+f.path),Buffer.from(f.dispatchResultBytes,'base64'),f.path+' exact proposed bytes');}
for(const name of ['alpha','beta']){
 const bytes=readFileSync('test/fixtures/script-lexical-statement-dispatch/'+name+'.js');
 assert.deepEqual(bytes,readFileSync('docs/validation/ts-035d8-p/inputs/'+name+'.js'));
 assert(bytes.includes(Buffer.from('\r\n')));
 if(name==='alpha')assert(bytes.toString().includes('😀'));
}
for(const f of json(here+'/source-closure.json'))assert.equal(hash(f.path),f.sha256,f.path+' validated source closure');
for(const f of json(here+'/historical-inventory.json'))assert.equal(hash(f.path),f.sha256,f.path+' restored history');
const normal=s=>s.replaceAll('\r\n','\n').trim();
const oldBuild=git('show','ff2117e:typescript/tools/build-native.mjs');
assert.equal(normal(readFileSync('tools/build-native.mjs','utf8')),normal(oldBuild.replace('["test/script-lexical-statement-audit.ts", "script-lexical-statement-audit"]])','["test/script-lexical-statement-audit.ts", "script-lexical-statement-audit"], ["test/script-lexical-statement-dispatch.ts", "script-lexical-statement-dispatch"]])')));
assert.equal(normal(readFileSync('TASKS.md','utf8').split('### TS-035D8 -')[0]),normal(git('show','ff2117e:typescript/TASKS.md').split('### TS-035D8 -')[0]));
assert.equal(normal(readFileSync('docs/feature-inventory.md','utf8').split('## TS-035D8 lexical Statement dispatch')[0]),normal(git('show','ff2117e:typescript/docs/feature-inventory.md')));
const baseline=json('docs/validation/ts-035d7/native-build-results.json'),gates=json(here+'/native-build-results.json');
assert.deepEqual(gates.map(g=>g.entry),[...baseline.map(g=>g.entry),'test/script-lexical-statement-dispatch.ts']);assert.equal(gates.length,71);
for(const g of gates){assert.equal(g.verdict,'PASS');assert.equal(probeVerdict({build:g.build,coverage:g.coverage,node:{status:0,signal:null,error:null,stdout:''},native:{status:0,signal:null,error:null,stdout:''}}),'PASS');}
for(const lane of ['node','native']){const records=json(here+'/guest-'+lane+'-results.json'),old=json('docs/validation/ts-035d7/guest-'+lane+'-results.json');assert.equal(records.length,212);assert(records.every(r=>r.verdict==='PASS'));assert.deepEqual(records.map(r=>({name:r.name,expected:r.expected})),old.map(r=>({name:r.name,expected:r.expected})));}
for(const [name,count] of [['source',2062],['D5-source',408],['D4-source',772],['D4-wire',96],['D4-metadata',48],['D4-controls',2],['D3-source',154],['D2-source',360],['D2-wire',64],['D2-extra',14],['D1-source',124],['D1-extra',24]]){const r=json(here+'/'+name+'-results.json');assert.equal(r.length,count,name);assert(r.every(x=>x.status===0&&x.signal===null),name);}
for(const [stage,file,count] of [['D6-source','source-results',1248],['D6-wire','wire-results',256]]){const r=json(here+'/inherited/'+stage+'/ts-035d6/'+file+'.json');assert.equal(r.length,count);assert(r.every(x=>x.status===0&&x.signal===null));}
const wire=json(here+'/wire-results.json');assert.equal(wire.length,320);assert(wire.every(r=>r.status===0&&r.signal===null&&r.error===null));
const d7=JSON.parse(gunzipSync(readFileSync(here+'/inherited/D7-matrix/ts-035d7/matrix-results.json.gz')));assert.equal(d7.length,2816);assert(d7.every(r=>r.status===0&&r.signal===null));
const suites=json(here+'/required-suite-results.json'),oldSuites=json('docs/validation/ts-035d7/required-suite-results.json');assert.equal(suites.length,50);assert.deepEqual(suites.slice(4).map(s=>s.name),oldSuites.map(s=>s.name));assert(suites.every(r=>r.status===0&&r.signal===null&&r.error===null));assert.equal(json(here+'/oracle-controls.json').controls.length,342);
assert.deepEqual(JSON.parse(suites.find(r=>r.name==='D8-malformed').stdout),{rows:320,accepted:320,unimplemented:0,rejections:95840,future:true});
const amendment=json(here+'/metadata-amendment.json');assert.equal(amendment.rows.length,9);for(const r of amendment.rows){assert.equal(r.request.id,'same');assert.equal(r.request.text,'let x; x=7; x;');assert.equal(r.original.unit.id,'valid-ready');assert.deepEqual(r.amended,{...r.original,unit:{...r.original.unit,id:'same'}});}
for(const [name,count] of [['A21',21],['runner20',20],['host73',73],['observations22',22]]){const out=suites.find(r=>r.name===name).stdout;assert.match(out,new RegExp('tests '+count+'\\b'));assert.match(out,new RegExp('pass '+count+'\\b'));}
const transport=json(here+'/inherited/C-real-transport/ts-035c/integration-latest.json');assert.equal(transport.length,172);
const host=json(here+'/inherited/C-host21/ts-035c/new-host-results.json');assert.equal(host.length,5);assert.equal(host.reduce((n,r)=>n+Number(r.stdout.match(/tests (\d+)/)[1]),0),21);assert(host.every(r=>r.status===0&&r.signal===null));
const probes=json(here+'/probe-results.json');assert.equal(probes.length,10);assert(probes.every(p=>p.verdict==='PASS'));
const manifest=json('fixtures/assistance/test262-starter-corpus/manifest.json'),planned=manifest.entries.flatMap(e=>{const m={flags:e.flags??[],features:e.features??[],includes:e.includes??[],locale:e.locale??[],negative:e.negative??null};return variants(m).map(v=>({id:e.id,variant:v,blockers:blockers(m,v,e.id)}));});assert.equal(planned.length,60);assert(planned.every(r=>r.blockers.length));
writeFileSync(here+'/preservation.json',JSON.stringify({base:'ff2117e',productionFiles:5,migrations:6,oldFiles:952,identities:946,guestRecordsPerHost:212,oldGates:70,newGates:1,zeroDynamic:true,inheritedStages:46,newStages:4,newMatrixRuns:2062,planned},null,2)+'\n');
console.log('PASS exact scope, history, 952 wholefiles, 212 both hosts, 70+1 gates, all inherited stages and 60 blocked variants');

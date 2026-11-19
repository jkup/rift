import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const root=new URL('../../../',import.meta.url); process.chdir(fileURLToPath(root));
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'});
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const normalize=x=>x.replaceAll('\r\n','\n');
assert.equal(git('diff','802f595','--','docs/validation/ts-031c-a','docs/validation/ts-031c-p','docs/syntax-certification.md'),'','historical return audits and contract unchanged');
const paths=git('ls-tree','-r','--name-only','802f595','--','src','test','tools','probes','fixtures','package.json','package-lock.json','tsconfig.json').trim().split('\n');
for(const p of paths) if(!['src/parser.ts','src/observation.ts','src/observation-json.ts','test/return-audit.ts','test/structured-outcomes.ts','tools/test262/driver-result.mjs','tools/test262/driver-result.test.mjs','tools/test262/observation.integration.mjs'].includes(p)) assert.equal(normalize(readFileSync(p,'utf8')),normalize(git('show','802f595:typescript/'+p)),p);
for(const lane of ['node','native']){
 const old=json(`docs/validation/ts-031c-a/guest-${lane}-results.json`),now=json(`build/guest-${lane}-results.json`);
 assert.equal(old.length,212);assert.deepEqual(now,old,`${lane} exact guest records`);
}
const gates=json('build/native-build-results.json'),oldGates=json('docs/validation/ts-031c-a/native-build-results.json');
assert.equal(gates.length,36); assert.deepEqual(gates.slice(0,36).map(x=>x.entry),oldGates.map(x=>x.entry));
const success={status:0,signal:null,error:null,stdout:''};
for(const g of gates)assert.equal(probeVerdict({...g,node:success,native:success}),'PASS',g.entry);
const report={baseline:'802f595',protectedFiles:paths.length-8,guestRecordsPerLane:212,oldGates:36,additiveGates:0,coverage:gates.map(x=>({entry:x.entry,report:x.coverage.stdout})),publicRows:json('docs/validation/ts-031c-b/results.json').length};
writeFileSync('docs/validation/ts-031c-b/preservation.json',JSON.stringify(report,null,2)+'\n');
console.log('212 exact old guest records per lane; 36 old gates; protected sources/tests/tools/config/fixtures unchanged.');

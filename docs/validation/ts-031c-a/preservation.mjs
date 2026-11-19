import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {probeVerdict} from '../../../tools/probe-verdict.mjs';
const root=new URL('../../../',import.meta.url); process.chdir(fileURLToPath(root));
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'});
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const normalize=x=>x.replaceAll('\r\n','\n');
const paths=git('ls-tree','-r','--name-only','38d1d9e','--','src','test','tools','probes','fixtures','package.json','package-lock.json','tsconfig.json').trim().split('\n');
for(const p of paths) if(!['src/parser.ts','tools/build-native.mjs'].includes(p)) assert.equal(normalize(readFileSync(p,'utf8')),normalize(git('show','38d1d9e:typescript/'+p)),p);
assert.equal(normalize(readFileSync('tools/build-native.mjs','utf8').replace(', ["test/return-audit.ts", "return-audit"]','')),normalize(git('show','38d1d9e:typescript/tools/build-native.mjs')));
for(const lane of ['node','native']){
 const old=json(`docs/validation/ts-031b-b/guest-${lane}-results.json`),now=json(`build/guest-${lane}-results.json`);
 assert.equal(old.length,212);assert.deepEqual(now,old,`${lane} exact guest records`);
}
const gates=json('build/native-build-results.json'),oldGates=json('docs/validation/ts-031b-b/native-build-results.json');
assert.equal(gates.length,36); assert.deepEqual(gates.slice(0,35).map(x=>x.entry),oldGates.map(x=>x.entry));
const success={status:0,signal:null,error:null,stdout:''};
for(const g of gates)assert.equal(probeVerdict({...g,node:success,native:success}),'PASS',g.entry);
const report={baseline:'38d1d9e',protectedFiles:paths.length-2,guestRecordsPerLane:212,oldGates:35,additiveGates:1,coverage:gates.map(x=>({entry:x.entry,report:x.coverage.stdout})),publicRows:json('docs/validation/ts-031c-a/results.json').length};
writeFileSync('docs/validation/ts-031c-a/preservation.json',JSON.stringify(report,null,2)+'\n');
console.log('212 exact old guest records per lane; 35 old gates plus audit gate; protected sources/tests/tools/config/fixtures unchanged.');

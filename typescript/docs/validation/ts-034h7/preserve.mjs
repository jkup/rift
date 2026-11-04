import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {blockers} from '../../../tools/test262/input.mjs';
const base='f58693f',here=import.meta.dirname;
const git=(...a)=>execFileSync('git',a,{cwd:new URL('../../../../',import.meta.url),encoding:'utf8',maxBuffer:64*1024*1024});const norm=s=>s.replaceAll('\r\n','\n');
const allowed=['typescript/TASKS.md','typescript/docs/feature-inventory.md','typescript/tools/build-native.mjs','typescript/test/harness-bundle.ts'];
const owned=p=>allowed.includes(p)||p.startsWith('typescript/docs/validation/ts-034h7/')||p.startsWith('typescript/test/fixtures/harness-bundle/');
const changed=git('diff','--name-only',base).trim().split('\n').filter(Boolean),untracked=git('ls-files','--others','--exclude-standard').trim().split('\n').filter(Boolean);
assert.ok(changed.every(p=>owned(p)||p==='typescript/COORDINATION.md'),changed.join('\n'));assert.ok(untracked.every(owned),untracked.join('\n'));
const tree=git('ls-tree','-r',base).trim().split('\n').map(line=>{const [head,path]=line.split('\t');return {path,blob:head.split(' ')[2]};});
const protectedFiles=tree.filter(e=>!owned(e.path)&&e.path!=='typescript/COORDINATION.md');assert.ok(protectedFiles.every(e=>!changed.includes(e.path)));
const oldBuild=norm(git('show',base+':typescript/tools/build-native.mjs')),build=norm(readFileSync('tools/build-native.mjs','utf8'));
assert.equal(build,oldBuild.replace('["test/harness-formatting.ts", "harness-formatting"]]','["test/harness-formatting.ts", "harness-formatting"], ["test/harness-bundle.ts", "harness-bundle"]]'));
const task=norm(readFileSync('TASKS.md','utf8')),oldTask=norm(git('show',base+':typescript/TASKS.md'));assert.equal(task.split('### TS-034H7')[0],oldTask.split('### TS-034H7')[0]);
const inventory=norm(readFileSync('docs/feature-inventory.md','utf8')),oldInventory=norm(git('show',base+':typescript/docs/feature-inventory.md'));assert.ok(inventory.startsWith(oldInventory));
const variants=JSON.parse(readFileSync('fixtures/assistance/test262-starter-corpus/manifest.json')).entries.flatMap(e=>e.variants.map(v=>({id:e.id,variant:v,blockers:blockers({flags:e.flags,features:e.features,negative:e.negative??null,locale:[]},v,e.id)})));assert.equal(variants.length,60);assert.ok(variants.every(v=>v.blockers.length));
const gates=JSON.parse(readFileSync(here+'/native-build-results.json')),old=JSON.parse(readFileSync('docs/validation/ts-034h6-c/native-build-results.json'));assert.equal(gates.length,59);assert.equal(old.length,58);assert.deepEqual(gates.slice(0,58).map(g=>g.entry),old.map(g=>g.entry));
for(const gate of gates){assert.equal(gate.verdict,'PASS');for(const r of [gate.build,gate.coverage]){assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);}const a=/statements analyzed\s+(\d+)/.exec(gate.coverage.stdout),s=/compile statically\s+(\d+)\s+\(100%\)/.exec(gate.coverage.stdout);assert.ok(a&&s);assert.equal(a[1],s[1]);assert.ok(!/in dynamic tier\s+[1-9]/.test(gate.coverage.stdout));}
for(const lane of ['node','native']){const name='guest-'+lane+'-results.json',records=JSON.parse(readFileSync(here+'/'+name)),oldRecords=JSON.parse(readFileSync('docs/validation/ts-034h6-c/'+name));assert.equal(records.length,212);assert.deepEqual(records,oldRecords);}
writeFileSync(here+'/preservation.json',JSON.stringify({base,changed,protectedFiles,oldTests:protectedFiles.filter(e=>e.path.startsWith('typescript/test/')).length,records:212,oldGates:58,newGates:1,variants},null,2)+'\n');console.log('PASS protected '+protectedFiles.length+';212 exact records/lane;58+1 static gates;60 blocked');

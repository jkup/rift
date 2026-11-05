// Render bounded implementation tests from the immutable reviewed controls.
// Never execute the old runners: their output paths belong to historical evidence.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const own='docs/validation/ts-035e2c', prior='docs/validation/ts-035e2c-p';
const identities=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
function replace(source,a,b){assert.equal(source.split(a).length,2,a);return source.replace(a,b);}
for(const [input,output] of [['probe.mjs','public.mjs'],['boundaries.mjs','boundaries.mjs'],['faults.mjs','faults.mjs'],['correction/faults.mjs','resolve-faults.mjs'],['correction/migrations.mjs','migrations.mjs']]) {
 const path=prior+'/'+input,bytes=readFileSync(path);let source=bytes.toString();
 if(output==='public.mjs'||output==='faults.mjs'||output==='resolve-faults.mjs') {
  source=replace(source,`const own=resolve('${prior}${input.startsWith('correction/')?'/correction':''}')`, `const own=resolve('${own}')`);
 }
 if(output==='public.mjs') source=source.split('\n').filter(line=>!line.startsWith('for(const proposal of read(join(own,')).join('\n');
 if(output==='faults.mjs'||output==='resolve-faults.mjs') source=source.split('\n').filter(line=>!line.startsWith('for(const p of read(join(own,')).join('\n');
 if(output==='boundaries.mjs') source=replace(source,`resolve('${prior}')`, `resolve('${own}')`);
 if(output==='migrations.mjs') {
  source=replace(source,`own=resolve(previous,'correction')`, `own=resolve('${own}')`);
  source=replace(source,"read(join(own,'proposal-manifest.json'))",`read('${prior}/correction/proposal-manifest.json')`);
  source=replace(source,'cpSync(p.proposed,join(root,p.path))','cpSync(p.path,join(root,p.path))');
 }
 // Record exact actual source before any isolated fault instrumentation.
 const marker="const root=join(run,'isolated');mkdirSync(root);";
 if(source.includes(marker)) source=replace(source,marker,marker+`
writeFileSync(join(run,'actual-source-identities.json'),JSON.stringify(['tools/test262/script-plan.mjs','tools/test262/script-ledger.mjs'].map(path=>({path,sha256:createHashForSource(readFileSync(path))})),null,2)+'\\n');
function createHashForSource(bytes){return sourceHash('sha256').update(bytes).digest('hex');}
`);
 if(source.includes('createHashForSource')) source="import {createHash as sourceHash} from 'node:crypto';\n"+source;
 source='// Adapted implementation controls; see test-source-identities.json. Production copies use actual checkout bytes.\n'+source;
 writeFileSync(own+'/'+output,source);
 identities.push({source:path,sha256:hash(bytes),output:own+'/'+output,outputSha256:hash(source)});
}
writeFileSync(own+'/test-source-identities.json',JSON.stringify(identities,null,2)+'\n');

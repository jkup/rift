// Final host validation. Historical runners are inputs only; every consumer
// writing acceptance evidence executes in a new isolated tree.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,mkdtempSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {migrateExtended} from './migrate-extended.mjs';
const own=resolve('docs/validation/ts-035e2c'),output=mkdtempSync(join(own,'validation-'));
const results=[],identities=[],hash=b=>createHash('sha256').update(b).digest('hex');
function run(name,args,cwd=process.cwd()){
 console.log('RUN '+name);const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:32e6,timeout:600000});
 writeFileSync(join(output,name+'.txt'),r.stdout+r.stderr);
 results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null});
 writeFileSync(join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
 assert.equal(r.status,0,r.stdout+r.stderr);assert.equal(r.signal,null);console.log(name+': 0');
}
function copy(root,path){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});cpSync(path,target,{recursive:true});if(path!=='node_modules/yaml')identities.push({root,path,sha256:hash(readFileSync(path))});}
run('preservation-before',['docs/validation/ts-035e2c/preservation.mjs']);
const replay=join(output,'replay');mkdirSync(replay);
for(const path of ['tools/test262/input.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-capabilities.json','tools/test262/script-plan.mjs','tools/test262/script-plan.test.mjs','tools/test262/script-ledger.mjs','tools/test262/script-ledger.test.mjs','fixtures/assistance/test262-starter-corpus/manifest.json','package.json','package-lock.json','node_modules/yaml','docs/validation/ts-035e2a/support.mjs','docs/validation/ts-035e2a/selection-literals.json','docs/validation/ts-035e2a/input-literals.json','docs/validation/ts-035e2-p/second-check-literals.json','docs/validation/ts-035e2b/support.mjs','docs/validation/ts-035e2b/extended.mjs','docs/validation/ts-035e2b-p/design-selections.json','docs/validation/ts-035e2b-p/supplemental-literals.json','docs/validation/ts-035e2b-p/report-literals.json'])copy(replay,path);
writeFileSync(join(output,'source-copy-identities.json'),JSON.stringify(identities,null,2)+'\n');
if(!process.argv.includes('--extended-only'))run('E2b149-28',['--test','tools/test262/script-ledger.test.mjs'],replay);
if(!process.argv.includes('--unaffected')){
 writeFileSync(join(output,'approved-migration.json'),JSON.stringify(migrateExtended(replay),null,2)+'\n');
 run('E2b338-and-review',['docs/validation/ts-035e2b/extended.mjs'],replay);
}
if(!process.argv.includes('--extended-only')){
run('E2a8-24-11',['--test','tools/test262/script-plan.test.mjs'],replay);
const e1=join(output,'e1');mkdirSync(e1);
for(const path of ['tools/test262/script-capabilities.test.mjs','tools/test262/script-capabilities.mjs','tools/test262/script-capabilities.json','tools/test262/input.mjs','fixtures/assistance/test262-starter-corpus/manifest.json','docs/validation/ts-035e-p/e1-literals.json'])copy(e1,path);
writeFileSync(join(output,'source-copy-identities.json'),JSON.stringify(identities,null,2)+'\n');
run('E1-133',['--test',join(e1,'tools/test262/script-capabilities.test.mjs')]);
run('host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]);
run('decoders21',['--test','tools/test262/script-result.test.mjs','tools/test262/script-driver-result.test.mjs']);
run('observations22',['tools/test262/observation.integration.mjs']);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
}
run('preservation-after',['docs/validation/ts-035e2c/preservation.mjs']);
console.log(JSON.stringify({output,stages:results.length,extendedIncluded:!process.argv.includes('--unaffected')}));

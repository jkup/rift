import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync,mkdtempSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const own=resolve('docs/validation/ts-035e2b');
const output=mkdtempSync(join(own,'run-'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const results=[];
function run(name,args,cwd=process.cwd()) {
  console.log('RUN '+name);
  const result=spawnSync(process.execPath,args,{cwd,encoding:'utf8',maxBuffer:32e6,timeout:300000});
  writeFileSync(join(output,name+'.txt'),result.stdout+result.stderr);
  results.push({name,status:result.status,signal:result.signal,error:result.error?.message??null});
  writeFileSync(join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
  console.log(name+': '+result.status);
  assert.equal(result.status,0,result.stdout+result.stderr);assert.equal(result.signal,null);
}
function copy(root,path) {
  const target=join(root,path);mkdirSync(dirname(target),{recursive:true});cpSync(path,target,{recursive:true});
}
// Only the verifier's output destination changes. All 5811 identity comparisons
// and the exact whole-file proposal checks execute against the actual checkout.
let verifier=readFileSync('docs/validation/ts-035e2b-p/verify.mjs','utf8');
const needle="writeFileSync(own+'/verify-results.json',";
assert.equal(verifier.split(needle).length,2);
verifier=verifier.replace(needle,'writeFileSync('+JSON.stringify(join(output,'preservation.json'))+',');
writeFileSync(join(output,'verify.mjs'),verifier);
run('preservation-before',[join(output,'verify.mjs'),'--proposed']);
if(!process.argv.includes('--inherited-only')) {
  run('E2b',['--test','tools/test262/script-ledger.test.mjs']);
  run('E2b-extended',['docs/validation/ts-035e2b/extended.mjs']);
}
const replay=join(output,'e2a');mkdirSync(replay);
const e2aPaths=['tools/test262/input.mjs','tools/test262/script-capabilities.mjs',
  'tools/test262/script-capabilities.json','tools/test262/script-plan.mjs','tools/test262/script-plan.test.mjs',
  'tools/test262/script-ledger.mjs','fixtures/assistance/test262-starter-corpus/manifest.json',
  'package.json','package-lock.json','node_modules/yaml','docs/validation/ts-035e2a/support.mjs',
  'docs/validation/ts-035e2a/selection-literals.json','docs/validation/ts-035e2a/input-literals.json',
  'docs/validation/ts-035e2-p/second-check-literals.json'];
for(const path of e2aPaths)copy(replay,path);
run('E2a',['--test','tools/test262/script-plan.test.mjs'],replay);
const e1=join(output,'e1');mkdirSync(e1);
const e1Paths=['tools/test262/script-capabilities.test.mjs','tools/test262/script-capabilities.mjs',
  'tools/test262/script-capabilities.json','tools/test262/input.mjs',
  'fixtures/assistance/test262-starter-corpus/manifest.json','docs/validation/ts-035e-p/e1-literals.json'];
for(const path of e1Paths)copy(e1,path);
writeFileSync(join(output,'replay-identities.json'),JSON.stringify([...e2aPaths.filter(p=>p!=='node_modules/yaml').map(path=>({suite:'E2a',path,sha256:hash(readFileSync(join(replay,path)))})),
  ...e1Paths.map(path=>({suite:'E1',path,sha256:hash(readFileSync(join(e1,path)))}))],null,2)+'\n');
run('E1',['--test',join(e1,'tools/test262/script-capabilities.test.mjs')]);
run('host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]);
run('decoders21',['--test','tools/test262/script-result.test.mjs','tools/test262/script-driver-result.test.mjs']);
run('observations22',['tools/test262/observation.integration.mjs']);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
run('preservation-after',[join(output,'verify.mjs'),'--proposed']);
console.log('PASS '+output);

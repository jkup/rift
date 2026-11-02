import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { probeVerdict } from '../../../tools/probe-verdict.mjs';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const evidence = new URL('./', import.meta.url);
const base = 'b029661';
const git = args => execFileSync('git', args, {cwd:root,encoding:'utf8'});
const baseline = path => git(['show', base + ':typescript/' + path]);
const preserved = ['test/cases.json','tools/run-guests.mjs','tools/build-native.mjs','src/conversion.ts',
 'src/number-radix.ts','src/number-radix-internal.ts','test/number-radix.ts',
 'fixtures/assistance/radix-formatter-options/oracle.mjs','docs/validation/ts-032p/corpus.txt','docs/validation/ts-032p/vectors.json'];
for(const path of preserved) assert.equal(readFileSync(root+path,'utf8').replaceAll('\r\n','\n'),baseline(path));
assert.equal(git(['diff','--name-only',base,'--','docs/validation/ts-021p','docs/validation/ts-032a','../src','../test']), '');
const invoke=(command,args,env=process.env)=>{
 const r=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:600000,maxBuffer:64*1024*1024,env});
 return {command,args,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
};
const backend=invoke(process.execPath,['tools/test-number-radix.mjs','--build'],{...process.env,RIFT_RADIX_EVIDENCE:'../docs/validation/ts-032b/backend/'});
writeFileSync(new URL('backend.log',evidence),JSON.stringify(backend,null,2));
assert.equal(backend.status,0);assert.equal(backend.error,null);
const decimals=JSON.parse(readFileSync(root+'docs/validation/ts-021p/results.json')).rows.filter(row=>row[2]==='10');
assert.equal(decimals.length,18);
const compiler=root+'node_modules/scriptc/bin/scriptc.exe';
const decimalSource=root+'docs/validation/ts-021p/decimal.ts';
const decimalExe=root+'build/native/ts032b-decimal.exe';
const build=invoke(compiler,['build',decimalSource,'--tier','static-only','-o',decimalExe]);
const coverage=invoke(compiler,['coverage',decimalSource]);
const success={status:0,signal:null,error:null,stdout:''};
const verdict=probeVerdict({build,coverage,node:success,native:success});
writeFileSync(new URL('decimal-build.json',evidence),JSON.stringify({build,coverage,verdict},null,2));assert.equal(verdict,'PASS');
const runs=[];
for(const lane of ['node','native']) {
 for(const [id,token,,expected] of decimals) {
  const result=invoke(lane==='node'?process.execPath:decimalExe,lane==='node'?[decimalSource,token]:[token]);runs.push({lane,id,...result});
  writeFileSync(new URL('decimal-results.json',evidence),JSON.stringify(runs,null,2));
  assert.equal(result.status,0);assert.equal(result.error,null);assert.equal(result.signal,null);assert.equal(result.stdout,expected+'\n');
 }
 const path=`build/guest-${lane}-results.json`;const guests=JSON.parse(readFileSync(root+path));
 assert.equal(guests.length,212);assert.ok(guests.every(r=>r.verdict==='PASS'));
 copyFileSync(root+path,new URL(`guest-${lane}-results.json`,evidence));
}
const builds=JSON.parse(readFileSync(root+'build/native-build-results.json'));
assert.equal(builds.length,37);assert.ok(builds.every(r=>r.verdict==='PASS'));
copyFileSync(root+'build/native-build-results.json',new URL('native-build-results.json',evidence));
copyFileSync(root+'build/probe-results.json',new URL('probe-results.json',evidence));
const vectors=JSON.parse(readFileSync(root+'docs/validation/ts-032p/vectors.json'));
assert.equal(readFileSync(root+'test/fixtures/number-tostring-vectors.txt','utf8'),vectors.map(v=>`${v.bits} ${v.radix} ${v.expected}`).join('\n')+'\n');
const report={base,preserved,guestCasesPerLane:212,gates:37,decimalControlsPerLane:18,literalVectors:24,signedRuntimeVectorRuns:48};
writeFileSync(new URL('preservation.json',evidence),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

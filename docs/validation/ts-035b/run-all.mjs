import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,unlinkSync,copyFileSync} from 'node:fs';
const here='docs/validation/ts-035b';
const zig='C:/Users/jonku/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.17.0';
const rows=[];
function run(name,args) {
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:1200000,maxBuffer:64*1024*1024,env:{...process.env,PATH:zig+';'+process.env.PATH}});
 const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
 rows.push(row);writeFileSync(here+'/suite-results.json',JSON.stringify(rows,null,2)+'\n');console.log(name+': '+r.status);
 assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));
}
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
run('native61',['tools/build-native.mjs']);
const gates=JSON.parse(readFileSync('build/native-build-results.json'));assert.equal(gates.length,61);assert.ok(gates.every(g=>g.verdict==='PASS'));
writeFileSync(here+'/gate.json',JSON.stringify(gates.at(-1),null,2)+'\n');
run('inspection',[here+'/validate.mjs']);
run('guest-node212',['tools/run-guests.mjs','node']);
run('guest-native212',['tools/run-guests.mjs','native']);
// Historical runners write into their evidence trees. Preserve every file
// recursively, including nested reductions, and retain new results separately.
function files(dir) {return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const oldRoots=readdirSync('docs/validation',{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='ts-035b').map(e=>'docs/validation/'+e.name);
const backups=new Map(oldRoots.flatMap(files).map(p=>[p,readFileSync(p)]));
mkdirSync(here+'/inherited',{recursive:true});
try {
 const h7='docs/validation/ts-034h7',c='docs/validation/ts-034h6-c';
 writeFileSync(h7+'/gate.json',JSON.stringify(gates.find(g=>g.entry==='test/harness-bundle.ts'),null,2)+'\n');
 run('H7',[h7+'/validate.mjs']);
 for(const name of ['validate','validate-map','replay-errors-b','replay-catch','replay-switch','replay-for-update','replay-nonstrict','replay-construct','replay-errors-a','node-slots','replays/validate','replays/node-boundary','replays/bounded-boundary','replays/replays']) run(name,[c+'/'+name+'.mjs']);
 run('A-both-serializer-lanes',['docs/validation/ts-035a/capture.mjs']);
 run('A21',['--test','tools/test262/script-driver-result.test.mjs','tools/test262/script-result.test.mjs']);
} finally {
 for(const path of oldRoots.flatMap(files)) {
  const prior=backups.get(path),now=readFileSync(path);
  if(!prior||!prior.equals(now)) copyFileSync(path,here+'/inherited/'+path.slice('docs/validation/'.length).replaceAll('/','__'));
  if(!prior) unlinkSync(path);
 }
 for(const [path,bytes] of backups) {if(!readFileSync(path).equals(bytes))writeFileSync(path,bytes);assert.deepEqual(readFileSync(path),bytes);}
}
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]);
run('observations22',['tools/test262/observation.integration.mjs']);
run('probes10',['tools/run-probes.mjs']);
for(const f of ['native-build-results.json','guest-node-results.json','guest-native-results.json','probe-results.json'])copyFileSync('build/'+f,here+'/'+f);
console.log('PASS full TS035B validation; historical evidence restored');

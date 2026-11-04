import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync,writeFileSync,readdirSync,copyFileSync } from 'node:fs';
const here='docs/validation/ts-035a';
const zig='C:/Users/jonku/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.17.0';
const results=[];
function run(name,args) {
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:1200000,maxBuffer:64*1024*1024,env:{...process.env,PATH:zig+';'+process.env.PATH}});
 const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};
 results.push(row);writeFileSync(here+'/suite-results.json',JSON.stringify(results,null,2)+'\n');
 console.log(name+': '+r.status);assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));
}
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
run('native60',['tools/build-native.mjs']);
const gates=JSON.parse(readFileSync('build/native-build-results.json'));assert.equal(gates.length,60);assert.ok(gates.every(g=>g.verdict==='PASS'));
writeFileSync(here+'/gate.json',JSON.stringify(gates.at(-1),null,2)+'\n');
run('guest-node212',['tools/run-guests.mjs','node']);
run('guest-native212',['tools/run-guests.mjs','native']);
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('old-host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')&&!f.startsWith('script-')).map(f=>'tools/test262/'+f)]);
run('observations22',['tools/test262/observation.integration.mjs']);
run('probes10',['tools/run-probes.mjs']);
run('new-host',['--test','tools/test262/script-driver-result.test.mjs','tools/test262/script-result.test.mjs']);
for(const f of ['native-build-results.json','guest-node-results.json','guest-native-results.json','probe-results.json']) copyFileSync('build/'+f,here+'/'+f);
console.log('PASS all TS-035A required suites');

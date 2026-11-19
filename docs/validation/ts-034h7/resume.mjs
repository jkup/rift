import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync,unlinkSync,copyFileSync} from 'node:fs';
const here='docs/validation/ts-034h7',old='docs/validation/ts-034h6-c';
const zig='C:/Users/jonku/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.17.0';
const rows=[];
function run(name,args){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:1200000,maxBuffer:64*1024*1024,env:{...process.env,PATH:zig+';'+process.env.PATH}});const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};rows.push(row);writeFileSync(here+'/resume-results.json',JSON.stringify(rows,null,2)+'\n');console.log(name+': '+r.status);assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));}
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
copyFileSync('build/native-build-results.json',here+'/full-native-before-strengthening.json');
run('h7-native-only',[here+'/build.mjs']);
const gates=JSON.parse(readFileSync('build/native-build-results.json'));assert.equal(gates.length,59);gates[58]=JSON.parse(readFileSync(here+'/gate.json'));writeFileSync('build/native-build-results.json',JSON.stringify(gates,null,2)+'\n');
run('bundle',[here+'/validate.mjs']);run('oracle',[here+'/oracle-audit.mjs']);
run('supplementary',[here+'/supplementary.mjs']);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const backups=new Map(files(old).map(f=>[f,readFileSync(f)]));mkdirSync(here+'/inherited',{recursive:true});
try{
 for(const name of ['replay-e2','replay-e1','replay-plans','replay-baseline','replay-metadata','replay-stress','replay-global','replay-bootstrap','replay-d2'])run(name,[old+'/replays/'+name+'.mjs','node','native']);
}finally{
 for(const path of files(old)){const prior=backups.get(path),now=readFileSync(path);if(!prior||!prior.equals(now))copyFileSync(path,here+'/inherited/'+path.slice(old.length+1).replaceAll('/','__'));if(!prior)unlinkSync(path);}
 for(const [path,bytes] of backups)writeFileSync(path,bytes);
 for(const [path,bytes] of backups)assert.deepEqual(readFileSync(path),bytes);
}
run('runner20',['--test','tools/probe-verdict.test.mjs']);
run('host73',['--test',...readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')).map(f=>'tools/test262/'+f)]);
run('observations22',['tools/test262/observation.integration.mjs']);run('probes10',['tools/run-probes.mjs']);
for(const f of ['native-build-results.json','guest-node-results.json','guest-native-results.json','probe-results.json'])copyFileSync('build/'+f,here+'/'+f);
console.log('PASS complete H7 and inherited pipeline');

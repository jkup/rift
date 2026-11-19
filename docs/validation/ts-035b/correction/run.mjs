import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,unlinkSync,copyFileSync} from 'node:fs';
const here='docs/validation/ts-035b',out=here+'/correction',rows=[];
const resume=process.argv.includes('--resume');
const zig='C:/Users/jonku/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.17.0';
function run(name,args){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:240000,maxBuffer:64*1024*1024,env:{...process.env,PATH:zig+';'+process.env.PATH}});const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};rows.push(row);writeFileSync(out+(resume?'/results-resumed.json':'/results.json'),JSON.stringify(rows,null,2)+'\n');console.log(name+': '+r.status);assert.ok(r.status===0&&!r.signal&&!r.error,JSON.stringify(row));}
if(!resume){
run('typecheck',['node_modules/typescript/bin/tsc','-p','tsconfig.json']);
run('B-both-inputs-both-hosts',[here+'/validate.mjs']);
run('observed-boundary',[here+'/boundary.mjs']);
}
const all=JSON.parse(readFileSync(here+'/native-build-results.json')),gate=JSON.parse(readFileSync(here+'/gate.json'));
assert.equal(all.length,61);assert.equal(gate.verdict,'PASS');assert.equal(all.at(-1).entry,gate.entry);all[60]=gate;
writeFileSync(here+'/native-build-results.json',JSON.stringify(all,null,2)+'\n');
writeFileSync('build/native-build-results.json',JSON.stringify(all,null,2)+'\n');
// Reuse the 60 unchanged native executables/gates from the prior full run.
// Node modules were rebuilt above. These targeted replays exercise original
// dispatch/setup/first-abrupt/cleanup semantics beside the new B native driver.
const c='docs/validation/ts-034h6-c';
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);}
const roots=readdirSync('docs/validation',{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='ts-035b').map(e=>'docs/validation/'+e.name);
const backups=new Map(roots.flatMap(files).map(p=>[p,readFileSync(p)]));mkdirSync(out+'/inherited',{recursive:true});
try {
 if(!resume)for(const name of ['replays/validate','replays/node-boundary','replays/bounded-boundary','node-slots'])run(name,[c+'/'+name+'.mjs']);
 for(const name of ['replay-erb-reduce','replay-restricted','replay-accessors','replay-e3b','replay-e3a','node-host-negatives','replay-e3a-reduce','replay-e3a-reachability'])run(name,[c+'/replays/'+name+'.mjs','node','native']);
}finally{
 for(const path of roots.flatMap(files)){const before=backups.get(path),now=readFileSync(path);if(!before||!before.equals(now))copyFileSync(path,out+'/inherited/'+path.slice('docs/validation/'.length).replaceAll('/','__'));if(!before)unlinkSync(path);}
 for(const [path,bytes] of backups){if(!readFileSync(path).equals(bytes))writeFileSync(path,bytes);assert.deepEqual(readFileSync(path),bytes);}
}
run('approved-diff-audit',[out+'/audit.mjs']);
run('preservation',[here+'/preserve.mjs']);
console.log('PASS correction; prior full suites reused, targeted identity/cleanup replays restored');

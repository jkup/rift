import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const e='docs/validation/ts-034h6-c',rows=[];
const steps=[['typecheck','node_modules/typescript/bin/tsc','-p','tsconfig.json'],['native','tools/build-native.mjs'],['guest-node','tools/run-guests.mjs','node'],['guest-native','tools/run-guests.mjs','native'],['formatting',e+'/validate.mjs'],['map',e+'/validate-map.mjs'],['errors-b',e+'/replay-errors-b.mjs'],['features',e+'/feature-checks.mjs'],['inherited',e+'/replays/replays.mjs'],['runner','--test','tools/probe-verdict.test.mjs'],['host','--test',...[]],['observations','tools/test262/observation.integration.mjs'],['probes','tools/run-probes.mjs']];
// Node's own test glob expansion is explicit, avoiding shell interpretation.
steps[10]=['host','--test',...(await import('node:fs')).readdirSync('tools/test262').filter(f=>f.endsWith('.test.mjs')).map(f=>'tools/test262/'+f)];
for(const [name,...args] of steps){const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:1200000,maxBuffer:64*1024*1024});const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};rows.push(row);writeFileSync(e+'/suite-results.json',JSON.stringify(rows,null,2)+'\n');console.log(name+': '+r.status);if(r.status!==0||r.signal||r.error){console.error(row.stdout,row.stderr);process.exit(1);}}

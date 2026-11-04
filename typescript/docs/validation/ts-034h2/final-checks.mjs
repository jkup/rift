import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const steps=[['guest-native','tools/run-guests.mjs','native'],['switch','docs/validation/ts-034h2/validate.mjs'],['catch','docs/validation/ts-034h2/replay-catch.mjs'],['E4','docs/validation/ts-034h2/replays/validate.mjs'],['inherited','docs/validation/ts-034h2/replays/replays.mjs'],['Node reflection','docs/validation/ts-034h2/replays/node-boundary.mjs']];
const results=[];
for(const [name,...args] of steps){
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:900000,maxBuffer:32*1024*1024});
 const row={name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};results.push(row);
 writeFileSync(import.meta.dirname+'/final-checks.json',JSON.stringify(results,null,2)+'\n');console.log(name+': '+r.status);
 if(r.status!==0||r.signal||r.error){console.error(row.stdout,row.stderr);process.exit(1);}
}

import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const results=[];
for(const name of ['replay-erb-reduce','replay-restricted','replay-accessors','replay-e3b','replay-e3a','node-host-negatives','replay-e3a-reduce','replay-e3a-reachability','replay-e2','replay-e1','replay-plans','replay-baseline','replay-metadata','replay-stress','replay-global','replay-bootstrap','replay-d2']){
 const r=spawnSync(process.execPath,['docs/validation/ts-034h6-c/replays/'+name+'.mjs','node','native'],{encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});
 results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
 writeFileSync(import.meta.dirname+'/replays-results.json',JSON.stringify(results,null,2)+'\n');
 console.log(name+': '+r.status); if(r.status!==0||r.signal||r.error){console.error(r.stdout,r.stderr);process.exit(1);}
}

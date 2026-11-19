import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../../../..');
const results=[];
for(const name of process.argv.slice(2)){
 const r=spawnSync('npm.cmd',['run',name],{cwd:root,encoding:'utf8',shell:true,timeout:600000,maxBuffer:32*1024*1024});
 results.push({name,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
 writeFileSync(join(import.meta.dirname,'suite-'+process.argv[2].replaceAll(':','-')+'.json'),JSON.stringify(results,null,2)+'\n');
 console.log(name+': '+r.status);if(r.status!==0||r.signal||r.error){console.error(r.stdout,r.stderr);process.exit(1);}
}

import {spawnSync} from 'node:child_process';
import {writeFileSync,readdirSync} from 'node:fs';
const results=[];
for(const name of process.argv.slice(2)){
 const command=name==='guests-node'?['tools/run-guests.mjs','node']:name==='typecheck'?['node_modules/typescript/bin/tsc','-p','tsconfig.json']:name==='runner'?['--test','tools/probe-verdict.test.mjs']:name==='host'?['--test',...readdirSync('tools/test262').filter(n=>n.endsWith('.test.mjs')).map(n=>'tools/test262/'+n)]:name==='observations'?['tools/test262/observation.integration.mjs']:['tools/run-probes.mjs'];
 const r=spawnSync(process.execPath,command,{encoding:'utf8',timeout:900000,maxBuffer:32*1024*1024});
 results.push({name,command,status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''});
 writeFileSync(import.meta.dirname+'/suites-'+process.argv.slice(2).join('-')+'.json',JSON.stringify(results,null,2)+'\n');
 console.log(name+': '+r.status);if(r.status!==0||r.signal||r.error){console.error(r.stdout,r.stderr);process.exitCode=1;}
}

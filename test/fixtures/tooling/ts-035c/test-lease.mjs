import { readFixtureFile as readFile } from "../../../../tools/test262/test-support/fixture-files.mjs";
// C's drift tests temporarily alter only C-owned artifacts. Serialize C suites
// across node --test worker processes so another launch cannot observe a fault.
import { open, unlink, mkdir } from "node:fs/promises";
import {resolve} from 'node:path';
export async function acquireScriptTestLease(){
 await mkdir('build',{recursive:true});const path=resolve('build/script-observe-tests.lock'),owner=String(process.pid),deadline=Date.now()+600000;
 while(true){try{const file=await open(path,'wx');await file.writeFile(owner);await file.close();break;}catch(e){if(e.code!=='EEXIST')throw e;let stale=false;try{const pid=Number(await readFile(path,'utf8'));if(Number.isInteger(pid)&&pid>0){try{process.kill(pid,0);}catch(error){stale=error.code==='ESRCH';}}}catch(error){if(error.code==='ENOENT')continue;throw error;}if(stale){await unlink(path);continue;}if(Date.now()>deadline)throw Error('Script test lease timeout');await new Promise(r=>setTimeout(r,100));}}
 return async()=>{try{if((await readFile(path,'utf8'))===owner)await unlink(path);}catch(e){if(e.code!=='ENOENT')throw e;}};
}

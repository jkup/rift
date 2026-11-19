import {spawnSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const executable=fileURLToPath(new URL('./native-observer',import.meta.url));
const scratch=mkdtempSync('/var/tmp/rift-test262-observation-');
export function observeScripts(request) {
  const output=join(scratch,'result.json');
  const args=['script-observation',request.action,request.nonce,request.requestSha256,'-',output,String(request.steps),String(request.calls)];
  for(const unit of request.units) {
    const path=join(scratch,unit.id+'.js');
    writeFileSync(path,unit.text);
    args.push(unit.id,unit.role,path);
  }
  const result=spawnSync(executable,args,{encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
  if(result.error || result.signal || result.status!==0) throw new Error('native observation subprocess: '+JSON.stringify({status:result.status,signal:result.signal,error:result.error?.code,stderr:result.stderr}));
  const observed=JSON.parse(readFileSync(output,'utf8'));
  if(observed.nonce!==request.nonce || observed.requestSha256!==request.requestSha256) throw new Error('native observation identity mismatch');
  return observed;
}

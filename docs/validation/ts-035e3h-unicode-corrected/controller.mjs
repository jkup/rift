import * as fs from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {boundedInventory} from './inventory.mjs';
export const sha256=b=>createHash('sha256').update(b).digest('hex');
const need=(b,s)=>{if(!b)throw Error(s);};
export function noAliases(path,allowMissing=false) {
  const chain=[];for(let p=resolve(path);;p=dirname(p)){chain.unshift(p);if(dirname(p)===p)break;}
  for(const p of chain){let s;try{s=fs.lstatSync(p);}catch(e){if(allowMissing&&e.code==='ENOENT')continue;throw e;}
    need(!s.isSymbolicLink(),'alias:'+p);if(s.isFile())need(s.nlink===1,'hardlink:'+p);
  }
}
export function readBound(row) {
  noAliases(row.path);const fd=fs.openSync(row.path,'r');
  try {const a=fs.fstatSync(fd),p=fs.lstatSync(row.path);need(a.isFile()&&a.nlink===1&&a.dev===p.dev&&a.ino===p.ino,'identity:'+row.path);const b=fs.readFileSync(fd),z=fs.fstatSync(fd);need(a.size===z.size&&a.mtimeMs===z.mtimeMs&&a.ctimeMs===z.ctimeMs,'changed-during-read');need(b.length===row.bytes&&sha256(b)===row.sha256,'hash:'+row.path);return b;}finally{fs.closeSync(fd);}
}
export function preflight(contract,bindings) {
  need(contract.inheritEnvironment===false,'inherit-env');need(Object.keys(contract.environment).length===10,'env-count');
  need(contract.environment.HOME===contract.environment.USERPROFILE,'home');need(contract.environment.TEMP===contract.environment.TMP,'temp');
  need(contract.cwd===contract.root,'cwd');need(contract.limits.launches===1&&contract.limits.retries===0,'attempts');
  const env={SystemRoot:'C:\\WINDOWS',WINDIR:'C:\\WINDOWS',TEMP:join(contract.root,'tmp'),TMP:join(contract.root,'tmp'),USERPROFILE:join(contract.root,'home'),HOME:join(contract.root,'home'),APPDATA:join(contract.root,'home/AppData/Roaming'),LOCALAPPDATA:join(contract.root,'home/AppData/Local'),POWERSHELL_TELEMETRY_OPTOUT:'1',POWERSHELL_UPDATECHECK:'Off'};
  need(Object.keys(env).every(k=>contract.environment[k]===env[k]),'exact-env');
  for(const [k,v] of Object.entries({timeoutMs:5000,cleanupMs:5000,stdoutBytes:8192,stderrBytes:8192,inputBytes:1024}))need(contract.limits[k]===v,'limit:'+k);
  noAliases(dirname(contract.root));try{fs.lstatSync(contract.root);throw Error('existing-root');}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const row of bindings)readBound(row);readBound(contract.executable);for(const row of contract.inputs)readBound(row);
  return {rootAbsent:true,boundFiles:bindings.length,tools:1,knownProcessOnly:true};
}
export function stage(contract,bindings,io=fs) {
  preflight(contract,bindings);const created=[];const write=(p,b)=>{const fd=io.openSync(p,'wx');try{let offset=0;while(offset<b.length){const n=io.writeSync(fd,b,offset,b.length-offset);need(n>0,'zero-write');offset+=n;}io.fsyncSync(fd);created.push(p);}finally{io.closeSync(fd);}};
  try {io.mkdirSync(contract.root);for(const suffix of ['tmp','home','home/AppData','home/AppData/Roaming','home/AppData/Local'])io.mkdirSync(join(contract.root,suffix));
    for(const row of contract.inputs){need(dirname(row.destination)===contract.root,'destination');write(row.destination,readBound(row));}
    return {created,write};
  } catch(error){error.stagedFiles=created;throw error;} // Partial files/root are deliberately retained.
}

// Transport consumes at most credit bytes: remaining stream cap plus one overflow sentinel.
// The sentinel is retained in status, and no further stream bytes are consumed after overflow.
export function capture(contract,transport,clock,sink) {
  return new Promise(resolveResult=>{
    const state={events:[],firstFailure:null,pid:null,exit:null,spawned:false,spawnError:null,killRequested:false,killSucceeded:null,cleanupConfirmed:false,teardownFailures:[],completeEOF:{stdout:false,stderr:false},bytes:{stdout:0,stderr:0},overflow:{stdout:null,stderr:null},knownProcessOnly:true,descendantCensus:false};
    let finished=false,handle=null,deadline=null,cleanup=null;
    const event=(type,detail)=>state.events.push({type,at:clock.now(),detail});
    const failure=reason=>{state.firstFailure??=reason;};
    const finish=()=>{if(finished)return;finished=true;clock.clear(deadline);clock.clear(cleanup);try{state.teardownFailures=handle?.close()??[];}catch(e){state.teardownFailures.push({operation:'transport.close',error:String(e)});}if(state.teardownFailures.length){failure('transport-close');for(const error of state.teardownFailures)event('close-error',error);}resolveResult(state);};
    const cleanupWait=()=>{if(cleanup===null)cleanup=clock.set(()=>{failure(state.cleanupConfirmed?'incomplete-eof':'cleanup-unconfirmed');finish();},contract.limits.cleanupMs);};
    const stop=reason=>{failure(reason);cleanupWait();if(handle&&state.pid&&!state.cleanupConfirmed&&!state.killRequested){state.killRequested=true;try{state.killSucceeded=handle.kill()===true;if(!state.killSucceeded)event('kill-failed',false);}catch(e){state.killSucceeded=false;event('kill-error',String(e));}}};
    const done=()=>{if(state.cleanupConfirmed&&state.completeEOF.stdout&&state.completeEOF.stderr)finish();};
    const credit=stream=>state.overflow[stream]===null?contract.limits[stream+'Bytes']-state.bytes[stream]+1:0;
    const receive=e=>{if(finished)return;event(e.type,e.stream??e.code??null);
      if(e.type==='spawn'){if(state.spawned||!Number.isSafeInteger(e.pid)||e.pid<=0){stop('invalid-spawn');return;}state.spawned=true;state.pid=e.pid;if(state.firstFailure)stop(state.firstFailure);}
      else if(e.type==='data'){
        const stream=e.stream;if(!['stdout','stderr'].includes(stream)||!Buffer.isBuffer(e.bytes)||e.bytes.length>credit(stream)||state.completeEOF[stream]){stop('transport-contract');return;}
        const room=contract.limits[stream+'Bytes']-state.bytes[stream],n=Math.min(room,e.bytes.length);
        try{if(n)sink(stream,e.bytes.subarray(0,n));state.bytes[stream]+=n;}catch(error){event('write-error',String(error));stop('capture-write');return;}
        if(e.bytes.length>n){state.overflow[stream]=e.bytes[n].toString(16).padStart(2,'0');stop(stream+'-cap');}
      }else if(e.type==='eof'){if(!['stdout','stderr'].includes(e.stream)){stop('transport-contract');return;}state.completeEOF[e.stream]=true;done();}
      else if(e.type==='exit'){if(state.exit!==null){stop('duplicate-exit');return;}state.exit={code:e.code,signal:e.signal};state.cleanupConfirmed=true;if(e.code!==0||e.signal!==null)failure('exit');cleanupWait();done();}
      else if(e.type==='error'){state.spawnError=String(e.message);stop('transport-error');}
      else stop('transport-contract');
    };
    deadline=clock.set(()=>stop('timeout'),contract.limits.timeoutMs);
    try{handle=transport.start({executable:contract.executable.path,argv:[...contract.argv],cwd:contract.cwd,env:{...contract.environment},inheritEnvironment:false},receive,credit);if(state.firstFailure)stop(state.firstFailure);}catch(e){state.spawnError=String(e);failure('start-error');finish();}
  });
}
export function review(state,stdout,stderr,replacement,preserved) {
  if(state.firstFailure)return {outcome:'stopped',reason:state.firstFailure};
  if(!state.spawned||!state.cleanupConfirmed||!state.completeEOF.stdout||!state.completeEOF.stderr)return {outcome:'stopped',reason:'incomplete-transport'};
  if(state.exit?.code!==0||state.exit?.signal!==null)return {outcome:'stopped',reason:'exit'};
  if(stderr.length)return {outcome:'stopped',reason:'stderr'};
  if(stdout.equals(replacement))return {outcome:'replacement-observed-review-required',authority:'none'};
  if(stdout.equals(preserved))return {outcome:'preservation-observed-review-required',authority:'none'};
  return {outcome:'stopped',reason:'stdout-mismatch'};
}
export function finalizeFiles(files,io=fs){
  const failures=[];
  for(const [stream,fd] of Object.entries(files))for(const [operation,attempt] of [['fsync',()=>io.fsyncSync(fd)],['close',()=>io.closeSync(fd)]]){
    try{attempt();}catch(error){failures.push({stream,operation,error:String(error)});}
  }
  return failures;
}
export async function run(contract,bindings,transport,clock,expected,io=fs) {
  const staged=stage(contract,bindings),files={},chunks={stdout:[],stderr:[]};let state,captureFailure=null,finalizationFailures=[];
  try{
    for(const stream of ['stdout','stderr'])files[stream]=io.openSync(join(contract.root,contract.outputs[stream]),'wx');
    state=await capture(contract,transport,clock,(stream,b)=>{let o=0;while(o<b.length){const n=io.writeSync(files[stream],b,o,b.length-o);need(n>0,'zero-write');o+=n;}chunks[stream].push(Buffer.from(b));});
  }catch(error){captureFailure=String(error);}finally{finalizationFailures=finalizeFiles(files,io);}
  if(!state)state={firstFailure:'capture-exception',cleanupConfirmed:false,knownProcessOnly:true,descendantCensus:false};
  if(finalizationFailures.length)state.firstFailure??='finalization';
  let integrity=true;try{for(const row of bindings)readBound(row);readBound(contract.executable);for(const row of contract.inputs){readBound(row);readBound({...row,path:row.destination});}}catch(e){integrity=false;state.firstFailure??='post-integrity';state.integrityError=String(e);}
  const inventory=boundedInventory(contract);
  if(!inventory.complete)state.firstFailure??='inventory';
  const result={state,captureFailure,finalizationFailures,integrity,inventory,review:review(state,Buffer.concat(chunks.stdout),Buffer.concat(chunks.stderr),expected.replacement,expected.preserved)};
  staged.write(join(contract.root,contract.outputs.status),Buffer.from(JSON.stringify(result,null,2)+'\n'));
  staged.write(join(contract.root,contract.outputs.inventory),Buffer.from(JSON.stringify(inventory,null,2)+'\n'));return result;
}

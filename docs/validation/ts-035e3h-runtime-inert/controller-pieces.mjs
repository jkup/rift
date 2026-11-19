import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import {join,resolve,relative,sep} from 'node:path';
import {ordinary,readIdentity,reserve,stage,snapshot,hash} from './files.mjs';
import {classify} from './policy.mjs';
import {assess} from './status-model.mjs';
import {decode,review} from './format.mjs';
const keys=(x,n)=>assert.deepEqual(Object.keys(x).sort(),n.slice().sort());
export function verifyInputs(rows,attributes){return rows.map(r=>readIdentity(r.path,r,attributes).identity);}
export function stageInputs(root,dirs,copies,attributes,onReserved=()=>{}){
 assert.equal(resolve(root),root);assert.equal(new Set(dirs).size,dirs.length);assert.equal(new Set(copies.map(r=>r.to)).size,copies.length);
 for(const p of [...dirs,...copies.map(r=>r.to)]){assert(p&&!p.includes('..')&&!p.includes('\\')&&!p.includes(':')&&!p.startsWith('/'));assert(resolve(root,p).startsWith(root+sep));}
 const before=verifyInputs(copies.map(r=>({...r,path:r.from})),attributes);
 const owner=reserve(root,attributes); // The root and partial files are retained on any later failure.
 onReserved(owner.root);
 const inputs=stage(owner,dirs,copies,[],attributes);
 assert.deepEqual(verifyInputs(before,attributes),before);
 return {root,sourceIdentities:before,inputs};
}
export function readOutputs(root,attributes){
 const raw=(name,limit)=>{const path=ordinary(join(root,name),false,attributes),s=fs.lstatSync(path,{bigint:true});assert(s.size<=BigInt(limit));const b=fs.readFileSync(path),after=fs.lstatSync(path,{bigint:true});for(const k of ['dev','ino','nlink','size'])assert.equal(s[k],after[k]);assert.equal(BigInt(b.length),s.size);return b;};
 const statusBytes=raw('supervisor-status.json',1048576),status=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(statusBytes));
 const streams={stdout:raw('compiler.stdout.bin',8388608),stderr:raw('compiler.stderr.bin',8388608),supervisorStdout:raw('supervisor.stdout.bin',1048577),supervisorStderr:raw('supervisor.stderr.bin',1048577)};
 return {status,statusBytes,streams};
}
export function readParentStreams(root,attributes){
 const result={stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)};
 for(const [key,name] of [['supervisorStdout','supervisor.stdout.bin'],['supervisorStderr','supervisor.stderr.bin']]){const p=ordinary(join(root,name),false,attributes),s=fs.lstatSync(p);assert(s.size<=1048577);const b=fs.readFileSync(p);result[key]=readIdentity(p,{bytes:s.size,sha256:hash(b)},attributes).bytes;}
 return result;
}
export function collect(root,policy,dirs,attributes){
 const tree=snapshot(root,{maxFiles:policy.root.filesMaximum,maxBytes:policy.root.totalBytesMaximum},attributes),errors=tree.failures.slice();
 const captureRows=tree.rows.filter(r=>r.path.startsWith('capture/')),other=tree.rows.filter(r=>r.path!=='capture'&&!r.path.startsWith('capture/'));
 const temp=policy.opaqueTemp;
 const decision=classify(other,{fixed:policy.fixed,opaqueTemp:{maxDepth:temp.depthMaximum,maxFiles:temp.filesMaximum,maxFileBytes:temp.fileBytesMaximum,maxTotalBytes:temp.totalBytesMaximum},maxFiles:policy.root.filesMaximum,maxBytes:policy.root.totalBytesMaximum},dirs);
 errors.push(...decision.failures);if(!tree.complete)errors.push('incomplete-tree');
 const allFiles=tree.rows.filter(r=>r.kind!=='directory');if(allFiles.length>policy.root.filesMaximum||allFiles.reduce((n,r)=>n+(r.bytes??0),0)>policy.root.totalBytesMaximum)errors.push('root-cap');
 if(captureRows.length>policy.capture.filesMaximum)errors.push('capture-file-cap');
 if(captureRows.reduce((n,r)=>n+(r.bytes??0),0)>policy.capture.totalBytesMaximum)errors.push('capture-byte-cap');
 const files=[];
 for(const r of captureRows){const name=r.path.slice(8);if(name.includes('/')||r.kind!=='file'||r.nlink!==1){errors.push('capture-kind:'+name);continue;}
  const limit=name==='first-command.bin'?policy.capture.record.bytesMaximum:policy.capture.identityBytes;
  if(r.bytes>limit||!r.sha256){errors.push('capture-size:'+name);continue;}
  const b=readIdentity(join(root,r.path),r,attributes).bytes;files.push({name,hex:b.toString('hex')});
 }
 return {tree,files,errors,complete:errors.length===0};
}
export function checkStaged(state,policy,dirs,attributes){
 assert.deepEqual(verifyInputs(state.inputs,attributes),state.inputs);assert.deepEqual(verifyInputs(state.sourceIdentities,attributes),state.sourceIdentities);
 const snap=collect(state.root,policy,dirs,attributes);assert(snap.complete);assert.equal(snap.files.length,0);
 const actual=snap.tree.rows.filter(r=>r.kind!=='directory').map(r=>r.path).sort(),expected=state.inputs.map(r=>relative(state.root,r.path).replaceAll('\\','/')).sort();
 assert.deepEqual(actual,expected);return snap;
}
export function reviewEnvelope({outer,status,streams,expected}){
 const out=(phase,detail)=>({outcome:'refused-stop-review',phase,detail,totalAttempts:null,attemptCoverage:'unproven',authority:'none'});
 if(!transportValid(outer,streams,expected))return out('transport','outer-command-or-stream');
 let signal;try{signal=assess(status);}catch{return out('status','SHAPE');}if(signal.kind!=='stop-hint-only')return out('status',signal.code);
 for(const [n,k] of [['stdout','Stdout'],['stderr','Stderr']])if(streams[n].length!==status[k].ObservedBytes||hash(streams[n])!==status[k].ObservedSha256)return out('status','RAW_STREAM');
 return null;
}
export function reviewObservation({outer,status,streams,observation,expected,oracle,inputs}){
 const out=(phase,detail)=>({outcome:'refused-stop-review',phase,detail,totalAttempts:null,attemptCoverage:'unproven',authority:'none'});
 const envelope=reviewEnvelope({outer,status,streams,expected});if(envelope)return envelope;
 if(!observation.complete||observation.errors.length)return out('snapshot','incomplete-or-disallowed');
 const rows=new Map(observation.tree.rows.map(r=>[r.path,r]));
 for(const input of inputs){const r=rows.get(input.relative);if(!r||r.kind!=='file'||r.nlink!==1||r.bytes!==input.bytes||r.sha256!==input.sha256)return out('snapshot','staged-input-drift');}
 const publication=review({files:observation.files,cleanup:{reported:status.CleanupConfirmed,active:status.FinalActiveProcesses,pipesClosed:status.Stdout.Eof&&status.Stderr.Eof}});
 if(publication.outcome!=='captured-attempt-count-unproven')return out('publication',publication.outcome);
 const record=decode(Buffer.from(observation.files.find(f=>f.name==='first-command.bin').hex,'hex'));
 if(record.pid!==status.Pid)return out('identity','root-pid-mismatch');
 for(const k of ['rawHex','cwdHex','imageHex','environmentHex','argvApi','argvHex'])if(JSON.stringify(record[k])!==JSON.stringify(oracle.decodedLiteral[k]))return out('fields',k);
 return {...publication,phase:'complete',observedIdentity:{pid:record.pid,creationTime:record.creationTime},suppliedEnvironmentChecked:true,observedEnvironmentChecked:true,holdEvidence:'consistent-with-marker-stop-and-forced-exit; not independent instruction trace'};
}

export function transportValid(outer,streams,expected){
 try{
  keys(outer,['exe','argv','cwd','environment','spawned','pid','error','exit','signal','watchdog','killRequested','killReturned','closeObserved','streams','ioErrors']);
  for(const k of ['exe','argv','cwd','environment'])assert.deepEqual(outer[k],expected[k]);
  assert.equal(outer.spawned,true);assert(Number.isInteger(outer.pid)&&outer.pid>0);assert.equal(outer.exit,0);assert.equal(outer.error,null);assert.equal(outer.signal,null);assert.equal(outer.watchdog,false);assert.equal(outer.killRequested,false);assert.equal(outer.killReturned,null);assert.equal(outer.closeObserved,true);assert.deepEqual(outer.ioErrors,[]);
  keys(outer.streams,['stdout','stderr']);keys(streams,['stdout','stderr','supervisorStdout','supervisorStderr']);
  for(const n of ['stdout','stderr']){const r=outer.streams[n];keys(r,['bytes','overflow']);assert.equal(r.overflow,false);assert.equal(r.bytes,0);assert(Buffer.isBuffer(streams[n])&&streams[n].length<=8388608);const b=streams[n==='stdout'?'supervisorStdout':'supervisorStderr'];assert(Buffer.isBuffer(b)&&b.length===0);}
 }catch{return false;}
 return true;
}

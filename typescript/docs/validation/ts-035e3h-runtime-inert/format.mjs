// Synthetic binary validator. No host APIs, process execution or filesystem access.
export const LIMITS=Object.freeze({recordBytes:1048576,textUnits:32767,environmentUnits:131072,arguments:4096,attempts:64,files:132});
export function decode(b){
 let p=0;const reject=(code,offset=p)=>{throw {captureError:true,code,offset};};
 try{
  if(!Buffer.isBuffer(b))reject('TYPE',0);if(b.length>LIMITS.recordBytes)reject('SIZE_LIMIT',0);
  const need=n=>{if(n>b.length-p)reject('TRUNCATED',p);};
  const u32=()=>{need(4);const v=b.readUInt32LE(p);p+=4;return v;};
  const u64=()=>{need(8);const v=b.readBigUInt64LE(p).toString();p+=8;return v;};
  need(8);const magic=b.subarray(0,8).toString('latin1');p=8;
  if(!['RCAP0001','RENT0001','RWIN0001','RDON0001','RERR0001'].includes(magic))reject('MAGIC',0);
  const pid=u32(),detail=u32(),creationTime=u64();if(pid===0||creationTime==='0')reject('IDENTITY',8);
  if(magic!=='RERR0001'&&detail!==0)reject('RESERVED',12);
  if(magic!=='RCAP0001'){
   const tail=u64();if(p!==b.length)reject('TRAILING',p);
   if(['RENT0001','RWIN0001'].includes(magic)&&tail!=='0')reject('RESERVED',24);
   if(magic==='RDON0001'&&(BigInt(tail)<48n||BigInt(tail)>1048576n))reject('RECORD_LENGTH',24);
   if(magic==='RERR0001'&&(![1,2,3,10,11,12,13,14,15,16,17,18,19,20,255].includes(detail)||BigInt(tail)<1n||BigInt(tail)>7n))reject('ERROR_FIELDS',12);
   return {kind:{RENT0001:'entry',RWIN0001:'winner',RDON0001:'complete',RERR0001:'failure'}[magic],pid,creationTime,detail,tail};
  }
  const units=(max,environment=false,nonempty=false)=>{
   const at=p,n=u32();if(n>max)reject('UNIT_LIMIT',at);if(nonempty&&n===0)reject('EMPTY_FIELD',at);need(n*2);
   const start=p;p+=n*2;
   if(environment){
    if(n<2||b.readUInt32LE(p-4)!==0)reject('ENV_TERMINATOR',start);
    for(let j=0;j<n-2;j++)if(b.readUInt16LE(start+j*2)===0&&b.readUInt16LE(start+j*2+2)===0)reject('ENV_EARLY_END',start+j*2);
   }else for(let j=start;j<p;j+=2)if(b.readUInt16LE(j)===0)reject('EMBEDDED_NUL',j);
   return b.subarray(start,p).toString('hex');
  };
  const rawHex=units(LIMITS.textUnits),cwdHex=units(LIMITS.textUnits,false,true),imageHex=units(LIMITS.textUnits,false,true),environmentHex=units(LIMITS.environmentUnits,true);
  const at=p,count=u32();if(count>LIMITS.arguments)reject('ARGUMENT_LIMIT',at);
  const argvHex=[];for(let i=0;i<count;i++)argvHex.push(units(LIMITS.textUnits));
  if(p!==b.length)reject('TRAILING',p);
  return {kind:'capture',pid,creationTime,rawHex,cwdHex,imageHex,environmentHex,argvApi:'CommandLineToArgvW',argvHex};
 }catch(e){if(e?.captureError)return {kind:'rejected',code:e.code,offset:e.offset};throw e;}
}
export function review(state){
 const out=(outcome,registeredAttempts=null)=>({outcome,registeredAttempts,totalAttempts:null,attemptCoverage:'unproven',authority:'none'});
 const keys=(v,k)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join('|')===k.slice().sort().join('|');
 if(!keys(state,['files','cleanup'])||!Array.isArray(state.files)||!keys(state.cleanup,['reported','active','pipesClosed'])||typeof state.cleanup.reported!=='boolean'||typeof state.cleanup.pipesClosed!=='boolean'||!Number.isInteger(state.cleanup.active)||state.cleanup.active<0)return out('state-schema');
 if(!state.cleanup.reported||state.cleanup.active!==0||!state.cleanup.pipesClosed)return out('cleanup-unconfirmed');
 if(state.files.length>LIMITS.files)return out('file-limit');
 const names=new Set(),files=new Map();
 for(const f of state.files){
  if(!keys(f,['name','hex'])||typeof f.name!=='string'||typeof f.hex!=='string'||!/^(?:[0-9a-f]{2})*$/.test(f.hex))return out('file-schema');
  if(names.has(f.name.toLowerCase()))return out('duplicate-file');names.add(f.name.toLowerCase());
  if(!/^(?:entry|failure)-[0-9a-f]{8}-[0-9a-f]{16}\.bin$/.test(f.name)&&!['winner.bin','first-command.bin','record-complete'].includes(f.name))return out('unknown-file');
  if(f.hex.length>LIMITS.recordBytes*2)return out('file-size-limit');
  files.set(f.name,decode(Buffer.from(f.hex,'hex')));
 }
 for(const [name,r] of [...files].sort((a,b)=>a[0].localeCompare(b[0]))){
  if(r.kind==='rejected')return out('invalid-file');
  const want=name.startsWith('entry-')?'entry':name.startsWith('failure-')?'failure':({'winner.bin':'winner','first-command.bin':'capture','record-complete':'complete'})[name];
  if(r.kind!==want)return out('file-kind');
  if(name.startsWith('entry-')||name.startsWith('failure-')){
   const suffix=r.pid.toString(16).padStart(8,'0')+'-'+BigInt(r.creationTime).toString(16).padStart(16,'0')+'.bin';
   if(name!==want+'-'+suffix)return out('filename-identity');
  }
 }
 const entries=[...files.values()].filter(r=>r.kind==='entry');if(entries.length>LIMITS.attempts)return out('attempt-limit');
 if(entries.length>1)return out('duplicate-attempts',entries.length);
 if([...files.values()].some(r=>r.kind==='failure'))return out('capture-failure',entries.length);
 if(entries.length===0)return out('no-registered-attempt',0);
 const w=files.get('winner.bin'),r=files.get('first-command.bin'),m=files.get('record-complete');
 if(!w||!r||!m)return out('publication-incomplete',1);
 for(const v of [w,r,m])if(v.pid!==entries[0].pid||v.creationTime!==entries[0].creationTime)return out('publication-identity',1);
 const bytes=state.files.find(f=>f.name==='first-command.bin').hex.length/2;if(m.tail!==String(bytes))return out('publication-length',1);
 if(r.argvHex.some(a=>a.startsWith('4000')))return out('response-file-unexpanded',1);
 return out('captured-attempt-count-unproven',1);
}

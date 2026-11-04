// C proposal only, derived from the accepted M nonstrict getter amendment.
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
const traces=[];
for(const construct of [false,true])for(const throwing of [false,true]) {
 const source=construct?'new String(m);':'String(m);', sourceTicks=construct?4:3;
 const columns=construct?[1,1,5,12,1,1,1,1,14,throwing?20:21]:[1,1,8,1,1,1,1,14,throwing?20:21];
 if(construct&&!throwing)columns.push(1);
 const getterStart=sourceTicks+2, getterEnd=getterStart+4, N=columns.length;
 const events=columns.map((column,i)=>({column,source:i>=getterStart&&i<getterEnd?'getter':'input',realm:i<sourceTicks?'caller':i>=getterStart&&i<getterEnd?'H':'A',phase:i>=getterStart&&i<getterStart+2?'instantiation':'body',effect:!throwing&&i===getterEnd-1?'M':''}));
 const t={id:(construct?'new':'call')+(throwing?'-throw':'-return'),source, getterSource:throwing?'function g(){throw marker;}':'function g(){return method;}',sourceTicks,events,inputs:{}};
 for(const [id,payload] of [['input-a','seven'],['input-b','eleven']]) {
  const expected=throwing?'exact marker; guest throw; no prototype Get or String allocation':construct?'StringData '+payload+'; prototype A':'string '+payload;
  t.inputs[id]={expected,prefixes:[0,7].flatMap(seed=>Array.from({length:N+2},(_,k)=>({seed,limit:seed+k,steps:seed+Math.min(k+1,N),outcome:k<N?'resource steps':throwing?'guest throw':'normal',effect:!throwing&&k>=getterEnd?'M':'',source:k<N?(events[k].source==='input'?id:'getter'):throwing?'getter':null,realm:k<N?events[k].realm:throwing?'H':null,phase:k<N?events[k].phase:throwing?'body':null,column:k<N?columns[k]:throwing?14:null,publication:k>=N&&!throwing?'return value':'none'}))),calls:[0,7].flatMap(seed=>[0,1,2,3].map(limit=>({seed,limit,steps:seed+(limit===0?sourceTicks:limit===1?getterStart:N),outcome:limit<2?'resource calls':throwing?'guest throw':'normal',effect:limit>=2&&!throwing?'M':'',source:limit<2?id:throwing?'getter':null,realm:limit===0?'caller':limit===1?'A':throwing?'H':null,column:limit<2?1:throwing?14:null})))};
 }
 traces.push(t);
}
writeFileSync(join(import.meta.dirname,'parsed-traces.json'),JSON.stringify({status:'UNEXECUTED C proposal',setup:'Own accessor m.toString = g in H; @@toPrimitive absent; getter returns host builtin method that records M and returns seven/eleven with zero arguments and exact m receiver. Setup runs in a separate session; execution still charges function instantiation AND nonstrict lexical setup. No tick for Get itself or host method body. Two nested calls are sequential, not concurrent.',cleanup:'Every outcome restores full frame, Realm, permit, calls/depth; both original owners reuse with +3 String(7) where immutable budget permits; exhausted owners reject at next guard. Raw call/construct attempts denied inside finally/live/idle. Host/unsupported sentinels at method retain identity and H origin; no later allocation on abrupt.',traces},null,2)+'\n');

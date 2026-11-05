import {Realm} from '../../../build/node/src/realm.js';
import {prepareBoundedScript} from '../../../build/node/src/script-record.js';
import {createScriptSession,evaluateScript} from '../../../build/node/src/script-execution.js';
const rows=[];
for(const count of [0,1,2]){
 const realm=new Realm((_line)=>{},'script'),session=createScriptSession({maxSteps:10000,maxCalls:64});
 const seed=prepareBoundedScript({id:'history',text:'let sentinel = 41; throw 3;'},realm);
 if(seed.kind!=='ready')throw Error('seed');
 const evaluation=evaluateScript(session,seed.record);
 const snapshot=()=>{const s=session.inspect(),h=s.lastAbrupt;return {steps:s.steps,calls:s.calls,depth:s.depth,active:s.active,lastAbrupt:h===null?null:{sameRecord:h.record===seed.record,sameRealm:h.realm===realm,unitId:h.unitId,loc:h.loc}};};
 const beforePrefix=snapshot();
 for(let i=0;i<count;i++){const p=prepareBoundedScript({id:'u'+i,text:i===0?'0;':'1;'},realm);if(p.kind!=='ready')throw Error('prefix');evaluateScript(session,p.record);}
 const beforeReject=snapshot();const rejected=prepareBoundedScript({id:'same',text:'42=7;'},realm);
 rows.push({count,completion:evaluation.completion,beforePrefix,beforeReject,afterReject:snapshot(),rejected});
}
console.log(JSON.stringify(rows,null,2));

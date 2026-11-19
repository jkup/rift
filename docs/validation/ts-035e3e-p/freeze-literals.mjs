// One-time independent literal author. Never imports or executes the proposal.
import {readFileSync as read,writeFileSync as write} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=new URL('./',import.meta.url), root=new URL('../../../',here);
const sha=b=>createHash('sha256').update(b).digest('hex');
const sources=JSON.parse(read(new URL('construction-source.json',here)));
const names=['undefined','NaN','Infinity','console','Number','Error','TypeError','ReferenceError','RangeError','SyntaxError','String','Object'];
const ids=[null,'B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16','N01','N02','I01'];
const rows=[];
for(const control of ids){
 const purpose=control===null?'main':'conformance-preflight-v1';
 const construction=control===null?['new Attempt','new Script Realm test','register actual Realm as test']:['new Attempt','new Script Realm test','register actual Realm as test','controlSetup '+control+' with alpha or beta'];
 const realms=[];
 for(const id of control==='B09'?['test','other']:['test']) realms.push({id,profile:'script',outputFault:id==='test'?'unexpected Script output':'control output',globals:names.map((n,i)=>[n,i>=3,false,i>=3]),hostServices:[{path:'console.log',name:'log',length:0,writable:true,enumerable:false,configurable:true,effect:'display arguments separated by spaces; call output sink; sink throws host Error',guard:'profile first, then one-use Script builtin permit',definingRealm:id}]});
 const extensions=control==='B09'?[{targetRealm:'test',name:'Other',value:'other intrinsic ReferenceError constructor',definingRealm:'other',writable:true,enumerable:false,configurable:true}]:[];
 if(control==='B09') construction.push('new Script Realm other','register actual Realm as other','define Other on test from other.ReferenceError');
 const data={descriptorVersion:1,kind:'script-host-services-description',purpose,control,mode:'conformance',preflightControl:control!==null,construction,realms,extensions,sourceBinding:'actual ExecutableScript and Realm map identity; unit ID alone is insufficient',session:'fresh per Attempt; shared across ordered occurrences; finally restores calls/depth/active',lifetime:'discard all control Realms, ASTs, globals, callbacks, sessions and completions; reload original ordered sources into fresh main Attempt',sourceSnapshot:sources,currentSourceVerified:false,buildCertification:'unavailable',authority:'none'};
 rows.push({args:[purpose,control],expected:{data,sha256:sha(JSON.stringify(data))}});
}
write(new URL('descriptor-literals.json',here),JSON.stringify(rows,null,2)+'\n');
const proposal=new URL('proposals/script-host-services.mjs',here);
write(proposal,read(proposal,'utf8').replace('SOURCE_SNAPSHOT_PLACEHOLDER',JSON.stringify(sources,null,2)));
const preflight='docs/validation/ts-035e3d-p/correction/future-literals.json';
const b=read(new URL(preflight,root));
write(new URL('request-literal-reference.json',here),JSON.stringify({path:preflight,sha256:sha(b),count:JSON.parse(b).length,claim:'Complete original/transformed texts, ordered occurrences, seven limits, mode/variant/role and full child/report expectations; unchanged accepted E3d literals. No new guest results.'},null,2)+'\n');
console.log('20 independent full descriptor literals; 160 retained request literals');

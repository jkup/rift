import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const here=import.meta.dirname, put=(p,v)=>writeFileSync(join(here,p),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const traces=[];
// Explicit counts from each listed source event sequence, including no-dispatch T19.
const sourceEventCounts={T01:3,T02:4,T03:4,T04:4,T05:3,T06:4,T07:4,T08:3,T09:3,T10:5,T11:5,T12:3,T13:3,T14:4,T15:3,T16:4,T17:2,T18:3,T19:2,T20:4,T21:3};
function add(id,source,events,expected,rows){
 const parsed=events.map(([column,event,effect=''])=>({column,event,effect}));
 const sourceTicks=sourceEventCounts[id];
 traces.push({id,source,events:parsed,expected,rows,sourceTicks,contexts:['same-Realm','constructor/method A transferred into caller B'],
  prefixes:[0,7].flatMap(seed=>Array.from({length:parsed.length+2},(_,k)=>({seed,limit:seed+k,
   outcome:k<parsed.length?'resource steps':'normal',steps:seed+Math.min(k+1,parsed.length),
   line:k<parsed.length?1:null,column:k<parsed.length?parsed[k].column:null,
   effects:parsed.slice(0,Math.min(k,parsed.length)).map(e=>e.effect).join(''),
   realm:k<sourceTicks?'caller':'builtin',phase:'body',source:'input-a/input-b',published:k>=parsed.length}))),
  abruptVariants:parsed.flatMap((e,i)=>e.effect?[{atTick:i+1,effect:e.effect,steps:i+1,
    variants:['guest-number-7','foreign-Error-exact-identity','unsupported-completion-exact-identity','host-sentinel-exact-identity'],
    effects:parsed.slice(0,i+1).map(e=>e.effect).join(''),laterEffects:'none',publication:'none',cleanup:'prior permit/frame/Realm restored; active null,calls0,depth0 at session boundary'}]:[])});
}
const ev=(columns,names,effects={})=>columns.map((c,i)=>[c,names[i],effects[i+1]??'']);
const call=['statement','call expression','argument m'], construct=['statement','new expression','identifier E','argument m'];
add('T01','E(7);',ev([1,1,3,1],[...call,'allocation']), 'Error message "7"; no cause',['E01','E03','E12','E30']);
add('T02','new E(7);',ev([1,1,5,7,1],[...construct,'allocation']), 'Error message "7"; no cause',['E01','E03','E12','E30']);
add('T03','E("x",o);',ev([1,1,3,7,1,1,1],['statement','call expression','message literal','options identifier','allocation','HasProperty cause','Get cause']), 'message x,cause7; own data cause',['E04','E05','E30']);
add('T04','E("x",o);',ev([1,1,3,7,1,1],['statement','call expression','message literal','options identifier','allocation','HasProperty cause']), 'message x; absent cause; no Get',['E05','E30']);
add('T05','E(m);',ev([1,1,3,1,1,1],[...call,'allocation','Get @@toPrimitive','Get/call toString'],{6:'M'}),'message seven/eleven',['E06','E07','E29','E32','E33']);
add('T06','E(m,o);',ev([1,1,3,5,1,1,1,1,1],['statement','call expression','m identifier','o identifier','allocation','Get @@toPrimitive','Get/call toString','HasProperty cause','Get cause'],{7:'M',9:'C'}),'message seven/eleven,cause7; inherited getter',['E04','E05','E06','E29','E32','E33']);
add('T07','E(m,o);',ev([1,1,3,5,1,1,1,1],['statement','call expression','m identifier','o identifier','allocation','Get/call @@toPrimitive','HasProperty cause','Get cause'],{6:'M',8:'C'}),'message seven/eleven,cause7',['E06','E07','E29','E32','E33']);
add('T08','fmt(o);',ev([1,1,5,1,1],['statement','call expression','o identifier','Get name','Get message']),'X: y',['E08','E09','E10','E30']);
add('T09','fmt(o);',ev([1,1,5,1,1,1,1,1,1],['statement','call expression','o identifier','Get name','name Get @@toPrimitive','name Get/call toString','Get message','message Get @@toPrimitive','message Get/call toString'],{4:'N',6:'n',7:'M',9:'m'}),'X: seven/eleven; n replaces message getter before M',['E10','E32','E33']);
add('T10','new E(m,o);',ev([1,1,5,7,9,1,1,1,1,1],['statement','new expression','identifier E','m identifier','o identifier','allocation','Get @@toPrimitive','Get/call toString','HasProperty cause','Get cause'],{8:'M',10:'C'}),'message seven/eleven,cause7',['E06','E12','E29','E32','E33']);
add('T11','new E(m,o);',ev([1,1,5,7,9,1,1,1,1],['statement','new expression','identifier E','m identifier','o identifier','allocation','Get/call @@toPrimitive','HasProperty cause','Get cause'],{7:'M',9:'C'}),'message seven/eleven,cause7',['E06','E07','E12','E29']);
add('T12','E(m);',ev([1,1,3,1,1,1,1],[...call,'allocation','Get @@toPrimitive','Get/call toString','Get/call valueOf'],{6:'M',7:'V'}),'both ordinary methods return object: TypeError in E Realm at tick7; no public Error result',['E07','E29']);
// T12's normal-budget terminal is a language throw, not resource failure.
for(const p of traces.at(-1).prefixes) if(p.outcome==='normal'){p.outcome='engine TypeError';p.published=false;}
add('T13','String(m);',ev([1,1,8,1,1],['statement','call expression','m identifier','Get @@toPrimitive','Get/call toString'],{5:'M'}),'seven/eleven; C ONLY',['F03','F05','F12']);
add('T14','new String(m);',ev([1,1,5,12,1,1,1],['statement','new expression','identifier String','m identifier','Get @@toPrimitive','Get/call toString','box allocation'],{6:'M'}),'StringData seven/eleven; C ONLY',['F03','F04','F05','F09','F12']);
add('T15','Object(o);',ev([1,1,8],['statement','call expression','o identifier']),'exact o, no Get/coercion/allocation; C ONLY',['F07','F09','F12']);
add('T16','new Object(o);',ev([1,1,5,12],['statement','new expression','identifier Object','o identifier']),'exact o, no Get/coercion/allocation; C ONLY',['F07','F09','F12']);
add('T17','Object();',ev([1,1,1],['statement','call expression','allocation']),'fresh empty object; C ONLY',['F06','F12']);
add('T18','new Object();',ev([1,1,5,1],['statement','new expression','identifier Object','allocation']),'fresh empty object; C ONLY',['F06','F12']);
add('T19','missing;',ev([1,1],['statement','unresolved identifier']),'fresh ReferenceError, message missing is not defined; engine-diagnostic, no allocation tick',['E15','E30']);
for(const p of traces.at(-1).prefixes){p.realm='caller';if(p.outcome==='normal'){p.outcome='engine ReferenceError';p.published=false;}}
add('T20','E(s,o);',ev([1,1,3,5,1],['statement','call expression','symbol identifier','options identifier','allocation']),'primitive Symbol message -> TypeError; no options Has/Get',['E07','E24','E29']);
for(const p of traces.at(-1).prefixes)if(p.outcome==='normal'){p.outcome='engine TypeError';p.published=false;}
add('T21','fmt(o);',ev([1,1,5,1],['statement','call expression','o identifier','Get name']),'Symbol name -> TypeError; no Get message',['E09','E10']);
for(const p of traces.at(-1).prefixes)if(p.outcome==='normal'){p.outcome='engine TypeError';p.published=false;}
const inputs=[{id:'input-a',payload:'seven',number:7,source:'E(7);\n'},{id:'input-b',payload:'eleven',number:11,source:'E(11);\n'}];
for(const t of traces){
 t.sourcesByInput={'input-a':t.source+'\n','input-b':(t.id==='T01'||t.id==='T02'?t.source.replace('(7)','(11)'):t.source)+'\n'};
 // These are algorithm-derived literals for each input, never execution output.
 t.expectedByInput=Object.fromEntries(inputs.map(input=>[input.id,
  t.id==='T01'||t.id==='T02'?`Error message "${input.number}"; no cause`:t.expected.replaceAll('seven/eleven',input.payload)]));
 delete t.expected; // A shared terminal oracle must not accidentally select input-a.
 for(const p of t.prefixes)if(p.outcome!=='resource steps')p.expectedByInput={...t.expectedByInput};
 t.calls=t.id==='T19'?{note:'no call dispatch; maxCalls0 still engine ReferenceError at2'}:{
  maxCalls0:{steps:t.sourceTicks,loc:{line:1,column:1},realm:'caller',effects:'',origin:'resource calls count0 limit0'},
  maxCalls1:t.source.startsWith('fmt')?{steps:3,loc:{line:1,column:1},realm:'formatter alias',effects:'',origin:'resource calls count1 limit1 before method'}:
   t.events.some(e=>e.effect)?{steps:t.events.findIndex(e=>e.effect)+1,loc:{line:1,column:1},realm:'builtin',effects:'',origin:'resource calls count1 limit1 before first hook'}:{outcomeByInput:{...t.expectedByInput}},
  sufficient:t.source.startsWith('fmt')?(t.events.some(e=>e.effect)?3:2):2,
  sufficientExpectationByInput:Object.fromEntries(inputs.map(input=>[input.id,{outcome:t.expectedByInput[input.id],steps:t.events.length,effects:t.events.map(e=>e.effect).join('')}]))};
}
for(const input of inputs){const name=input.id+'.js';put(name,input.source);input.file=name;input.sha256=createHash('sha256').update(input.source).digest('hex');}
const guards=['raw construct callback','fabricated context','wrong Realm/profile','copied builtin slot','mismatched callable/constructor records','altered args-array identity','altered loc identity','reused permit','retained owner context during another live session','nested sessions success/language/host'];
const guardRows=guards.map((setup,i)=>({id:'G'+String(i+1).padStart(2,'0'),setup,
 beforeEffects:['verify owner session active','verify profile/record/captured callee','check/reserve call depth','switch Realm/frame','issue tagged permit','consume exact tuple once'],
 expected:i===9?'nested session restores outer consumed permit; return, exact guest throw, exact host sentinel each restore finally':'host rejection; no unauthorized prototype Get/callback/tick',
 controls:i===9?['outer Error message hook starts inner session','inner normal','inner language q','inner host sentinel','outer context resumed','next session succeeds']:['direct tuple with fresh context','same attempt inside authorized make callback','unchanged counters/poison prototype/callback count','ordinary H5 shell positive','ordinary createBuiltin negative'],
 caveat:[5,6].includes(i)?'See REVIEW.md: no public path exposes an unused valid constructor permit; negative tuple checks alone cannot isolate field sensitivity.':'',status:'UNEXECUTED'}));
put('frozen-traces.json',{status:'UNEXECUTED; algorithm-derived before B/C implementation',inputs,traces,guards:guardRows,
 permitCrossKind:['active call permit -> raw construct rejected','active construct callback -> raw call invoke rejected','authorized context.call in construct succeeds via separate call permit and restores consumed construct permit'],
 rules:'Prefix resource failure occurs before effects of its tick; successful tick callbacks may abruptly stop. Seeds execute 0;0;0; then ; (seven ticks). Every matrix row repeats for both inputs. Host hooks add no source ticks. Cross-Realm hook callbacks temporarily enter hook Realm; tick events and failures before hooks belong to builtin Realm. No production execution used.'});
const matrix=readFileSync(join(here,'../ts-034h6-p/matrix.md'),'utf8');
const rows=matrix.split(/\r?\n/).filter(l=>/^\| [EF]\d\d \|/.test(l)).map(l=>{
 const fields=l.split('|').map(s=>s.trim()),id=fields[1];
 return {id,sourceOrSetup:fields[2],literalExpected:fields.slice(3,-1).join('|'),slice:id[0]==='F'?'C deferred':'B proposed',
  driver:id[0]==='F'?'future test/harness-errors-c.ts':'future test/harness-errors-b.ts',case:id,inputs:inputs.map(i=>i.id),
  traces:traces.filter(t=>t.rows.includes(id)).map(t=>t.id),status:'UNEXECUTED; retain every clause of source matrix row'};
});
put('matrix-map.json',[...rows,...guardRows.map(g=>({...g,driver:'future test/harness-errors-b.ts',inputs:inputs.map(i=>i.id)}))]);
console.log(JSON.stringify({traces:traces.length,prefixesPerInput:traces.reduce((n,t)=>n+t.prefixes.length,0),rows:rows.length+guardRows.length}));

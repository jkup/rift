// Algorithm-derived proposal only. Does not import or execute Rift.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const here=import.meta.dirname;
const put=(p,x)=>writeFileSync(join(here,p),JSON.stringify(x,null,2)+'\n');
const inputs=[{id:'input-a',number:7,payload:'seven',source:'String(7);\n'},{id:'input-b',number:11,payload:'eleven',source:'String(11);\n'}];
for(const i of inputs){i.file=i.id+'.js';i.sha256=createHash('sha256').update(i.source).digest('hex');writeFileSync(join(here,i.file),i.source);}
const prior=JSON.parse(readFileSync(join(here,'../ts-034h6-bp/frozen-traces.json')));
const traces=prior.traces.filter(t=>/^T1[3-8]$/.test(t.id));
for(const t of traces){
 t.status='UNEXECUTED C proposal';
 t.expectedByInput=Object.fromEntries(inputs.map(i=>[i.id,t.expectedByInput[i.id].replace('; C ONLY','')]));
 // Retain accepted schedules, but supply minimum sufficient calls (one for no hook).
 t.minimumCalls=t.events.some(e=>e.effect)?2:1;
}
function add(id,sources,columns,sourceTicks,events,expected,effectAt=0,terminal='normal'){
 traces.push({id,sourcesByInput:Object.fromEntries(inputs.map((i,n)=>[i.id,sources[n]+'\n'])),sourceTicks,
 events:columns.map((column,n)=>({column,event:events[n],effect:n+1===effectAt?'M':''})),
 expectedByInput:{'input-a':expected[0],'input-b':expected[1]},terminal,minimumCalls:effectAt?2:1,status:'UNEXECUTED C proposal'});
}
add('C01',['String(7);','String(11);'],[1,1,8],3,['statement','call expression','argument literal'],['string "7"','string "11"']);
add('C02',['new String(7);','new String(11);'],[1,1,5,12,1],4,['statement','new expression','identifier String','argument literal','box allocation'],['StringData "7"; own keys 0,length; String prototype A','StringData "11"; own keys 0,1,length; String prototype A']);
add('C03',['String(s);','String(s);'],[1,1,8],3,['statement','call expression','symbol identifier'],['string "Symbol(x)"','string "Symbol(x)"']);
add('C04',['new String(s);','new String(s);'],[1,1,5,12],4,['statement','new expression','identifier String','symbol identifier'],['TypeError A; no String allocation/prototype Get','TypeError A; no String allocation/prototype Get'],0,'engine TypeError');
for(const [id,source,cols,count] of [['C05','String(m);',[1,1,8,1],3],['C06','new String(m);',[1,1,5,12,1],4]])
 add(id,[source,source],cols,count,[...cols.slice(0,count).map((_,n)=>n===0?'statement':n===1?'expression':'source operand'),'Get/call @@toPrimitive'],['TypeError A; returned Symbol; M once; no String allocation/prototype Get','TypeError A; returned Symbol; M once; no String allocation/prototype Get'],cols.length,'engine TypeError');
for(const [id,source,cols,count] of [['C07','String(w);',[1,1,8,1],3],['C08','new String(w);',[1,1,5,12,1],4]])
 add(id,[source,source],cols,count,[...cols.slice(0,count).map((_,n)=>n===0?'statement':n===1?'expression':'source operand'),'Get/call inherited Symbol @@toPrimitive'],['TypeError A after Symbol wrapper primitive extraction; no String allocation/prototype Get','TypeError A after Symbol wrapper primitive extraction; no String allocation/prototype Get'],0,'engine TypeError');
// Symbol wrapper invokes one nested method even though it has no custom effect letter.
for(const t of traces.filter(t=>['C07','C08'].includes(t.id)))t.minimumCalls=2;
for(const [id,source,cols,count] of [['C09','Object(p);',[1,1,8,1],3],['C10','new Object(p);',[1,1,5,12,1],4]])
 add(id,[source,source],cols,count,[...cols.slice(0,count).map((_,n)=>n===0?'statement':n===1?'expression':'source operand'),'box allocation'],['genuine NumberData 7; Number prototype A','genuine NumberData 11; Number prototype A']);
for(const t of traces){
 t.terminal??='normal'; const N=t.events.length;
 t.contexts=['same Realm A','constructor A transferred into caller B; optional hook H'];
 t.prefixesByInput={};t.callsByInput={};t.abruptByInput={};
 for(const input of inputs){
  const expected=t.expectedByInput[input.id];
  t.prefixesByInput[input.id]=[0,7].flatMap(seed=>Array.from({length:N+2},(_,k)=>({seed,limit:seed+k,steps:seed+Math.min(k+1,N),
   outcome:k<N?'resource steps':t.terminal,expected:k<N?'step limit exceeded':expected,
   effects:t.events.slice(0,Math.min(k,N)).map(e=>e.effect).join(''),
   loc:k<N?{line:1,column:t.events[k].column}:t.terminal==='normal'?null:{line:1,column:1},phase:'body',source:input.id,
   realm:k<N?(k<t.sourceTicks?'caller':'A'):(t.terminal==='normal'?null:'A'),
   publication:k>=N&&t.terminal==='normal'?'return value':'none',cleanup:'active null; calls0; depth0; prior frame/Realm/permit restored'})));
  const nested=t.minimumCalls===2,first=t.events.findIndex(e=>e.effect)+1||N;
  t.callsByInput[input.id]=[0,7].map(seed=>({seed,maxCalls0:{steps:seed+t.sourceTicks,effects:'',outcome:'resource calls',count:0,limit:0,realm:'caller',source:input.id,loc:{line:1,column:1}},
   maxCalls1:nested?{steps:seed+first,effects:'',outcome:'resource calls',count:1,limit:1,realm:'A',source:input.id,loc:{line:1,column:1}}:{steps:seed+N,effects:'',outcome:t.terminal,expected,source:input.id,realm:t.terminal==='normal'?null:'A',loc:t.terminal==='normal'?null:{line:1,column:1}},
   sufficient:{limit:t.minimumCalls,steps:seed+N,effects:t.events.map(e=>e.effect).join(''),outcome:t.terminal,expected,source:input.id,realm:t.terminal==='normal'?null:'A',loc:t.terminal==='normal'?null:{line:1,column:1}},cleanup:'active null; calls0; depth0; prior frame/Realm/permit restored'}));
  t.abruptByInput[input.id]=t.events.flatMap((e,index)=>e.effect?[{atTick:index+1,effects:t.events.slice(0,index+1).map(e=>e.effect).join(''),
   freshSteps:index+1,seededSteps:index+8,minimumStepLimits:[index+1,index+8],minimumCalls:2,
   source:input.id,loc:{line:1,column:1},realm:'H (A when same-Realm)',
   variants:[{kind:'guest-number',expected:'exact guest Value number7; throw; catchable'},{kind:'foreign-error',expected:'exact foreign GuestError q; throw; catchable'},{kind:'unsupported',expected:'exact unsupported completion; bypass catch'},{kind:'host',expected:'exact host sentinel; escapes host; bypass catch'}],
   laterEffects:'none',stringPrototypeGet:'none',stringAllocation:'none',publication:'none',
   cleanup:'hook finally restores A; dispatch finally restores caller; active null/calls0/depth0; reuse BOTH original sessions with +3 for String(7) and exact "7"; retained raw callback rejected without effects'}]:[]);
 }
 // Remove inherited ambiguous shared consumers; all expectations above are per-input.
 delete t.prefixes;delete t.calls;delete t.abruptVariants;delete t.source;
}
put('frozen-traces.json',{status:'UNEXECUTED; no engine execution or feasibility claim',inputs,traces,
 seed:'0;0;0; then ; = seven ticks, same session before target; source events caller Realm; builtin events A',
 rules:'Failing tick has no corresponding effect. String conversion before constructor.prototype Get before allocation tick. Object exact-object path has no Get/coercion/allocation; nullish and box paths charge exactly one allocation tick. Host hooks add no source ticks. maxCalls1 blocks before hook body even if its lookup tick succeeded. Generated TypeError after returned Symbol belongs to A; exact abrupt from hook belongs to H. Source is runtime input, line1, call/new col1. Internal TypeError allocation adds no tick.'});
const matrix=readFileSync(join(here,'../ts-034h6-p/matrix.md'),'utf8').split(/\r?\n/).filter(l=>/^\| F\d\d \|/.test(l));
const details=[
 ['"", "undefined", "null", "0"','"", "undefined", "null", "0"'],
 ['String(s)="Symbol(x)"; new String(s)=TypeError A','String(s)="Symbol(x)"; new String(s)=TypeError A'],
 ['wrapper call/new and hook-returned Symbol call/new all TypeError A; M once only for hook','wrapper call/new and hook-returned Symbol call/new all TypeError A; M once only for hook'],
 ['StringData ab; keys 0,1,length; a,b Wfalse/Etrue/Cfalse; length2 Wfalse/Efalse/Cfalse; prototype A','StringData ab; keys 0,1,length; a,b Wfalse/Etrue/Cfalse; length2 Wfalse/Efalse/Cfalse; prototype A'],
 ['M once with string hint; call="seven"; new StringData seven; abrupt exact q before prototype Get/allocation','M once with string hint; call="eleven"; new StringData eleven; abrupt exact q before prototype Get/allocation'],
 ['each nullish/missing call/new fresh ordinary A object; no own keys; all distinct','each nullish/missing call/new fresh ordinary A object; no own keys; all distinct'],
 ['call/new exact q; no Get/conversion/prototype lookup/allocation tick','call/new exact q; no Get/conversion/prototype lookup/allocation tick'],
 ['call/new boxes NumberData7, BooleanDatafalse, StringDataa, SymbolData exact s; prototypes A','call/new boxes NumberData7, BooleanDatafalse, StringDataa, SymbolData exact s; prototypes A'],
 ['A boxes/fresh objects, exact existing q keeps original prototype; caller B/source input-a restored','A boxes/fresh objects, exact existing q keeps original prototype; caller B/source input-b restored'],
 ['name String/Object length1 Wfalse/Efalse/Ctrue; prototype Wfalse/Efalse/Cfalse; constructor/global Wtrue/Efalse/Ctrue; Function prototype; appended keys; five legacy globals unchanged','name String/Object length1 Wfalse/Efalse/Ctrue; prototype Wfalse/Efalse/Cfalse; constructor/global Wtrue/Efalse/Ctrue; Function prototype; appended keys; five legacy globals unchanged'],
 ['"[object Object]"; exact thrown guest number7','"[object Object]"; exact thrown guest number7'],
 ['String(7)="7"; new String(7) data "7"; Object(o)/new Object(o) exact o','String(11)="11"; new String(11) data "11"; Object(o)/new Object(o) exact o']
];
put('matrix-map.json',matrix.map((line,n)=>({id:'F'+String(n+1).padStart(2,'0'),originalRow:line,status:'UNEXECUTED',expectedByInput:{'input-a':details[n][0],'input-b':details[n][1]},driver:'future test/harness-errors-c.ts',mandatory:'Every clause in original row; both lanes, both inputs; no H7 bundle claim'})));
console.log(JSON.stringify({traces:traces.length,prefixesPerInput:traces.reduce((n,t)=>n+t.prefixesByInput['input-a'].length,0),rows:matrix.length}));

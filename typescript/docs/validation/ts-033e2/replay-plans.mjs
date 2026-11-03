import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../../..'),here=import.meta.dirname;
const scratch=join(root,'build/ts033d1-plans');mkdirSync(scratch,{recursive:true});
const rows=JSON.parse(readFileSync(join(root,'fixtures/script-declarations/literal.json')));
const conflicts={
 'G04':[0,'x',17,24],'G04-reversed':[0,'x',24,17],'G04-nested':[0,'x',17,25],
 'G05':[0,'x',17,24],'L02':[1,'x',18,26],'L03':[1,'f',23,38],
 'L03-let':[1,'f',18,30],'L04-neighbor':[1,'a',24,31],
 'L06':[1,'x',30,38],'T01-removed':[0,'x',17,24],
};
const results=[];
function run(lane,id,text){
 const file=join(scratch,'source.js');writeFileSync(file,text);
 const args=[file,id];if(lane==='node')args.unshift('build/node/test/script-declarations.js');
 const r=spawnSync(lane==='node'?process.execPath:join(root,'build/native/script-declarations.exe'),args,{cwd:root,encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024});
 results.push({lane,id,sourceUnits:text.length,sourceSha256:createHash('sha256').update(text).digest('hex'),status:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout,stderr:r.stderr});
 assert.equal(r.status,0,id);assert.equal(r.signal,null,id);assert.equal(r.error,undefined,id);assert.equal(r.stderr,'',id);
 const record=JSON.parse(r.stdout),p=record.plan;
 assert.deepEqual(p.unit,{id,text},id+' exact source');assert.equal(p.goal,'Script');
 assert.equal(Object.hasOwn(p,'body'),false);assert.equal(Object.hasOwn(p,'ast'),false);
 if(p.kind==='complete'||p.kind==='conflict')assert.equal(p.consumedUnits,text.length,id+' EOF');
 else assert.deepEqual(Object.keys(p).sort(),['kind','goal','unit','rejection','diagnostic'].sort());
 if(p.kind==='conflict')assert.deepEqual(Object.keys(p).sort(),['kind','goal','unit','consumedUnits','conflict','diagnostic'].sort());
 return record;
}
const prefix='"use strict";';
try{
for(const lane of process.argv.slice(2)){
 assert.ok(['node','native'].includes(lane));
 for(const row of rows){
  const record=run(lane,row.id,row.text),p=record.plan;
  if(row.expected){const {unit,...actual}=p;assert.deepEqual(actual,row.expected,row.id+' literal complete plan');assert.deepEqual(record.winners[0],row.winners,row.id+' winners');}
  else {assert.equal(p.kind,row.kind,row.id);assert.equal(p.kind==='conflict'?p.conflict.kind:p.rejection.capabilityCode,row.detail,row.id);}
  if(p.kind==='conflict'){
   const [scope,name,a,b]=conflicts[row.id];const site=start=>({name,start,end:start+1,loc:{line:1,column:start+1}});
   assert.deepEqual(p.conflict,{kind:row.detail,scope,first:site(a),second:site(b)});
   assert.deepEqual(p.diagnostic,{phase:'parse',name:'SyntaxError',message:row.detail+': '+name,loc:{line:1,column:Math.max(a,b)+1}});
  }
  if(row.id==='L10')assert.equal(p.diagnostic.message,'non-strict block function planning is unsupported');
  if(row.id==='preorder')assert.deepEqual(p.declarations.map(d=>[d.id,d.site.name,d.scope,d.variableScope]),[[0,'a',0,0],[1,'x',1,1],[2,'b',0,0]]);
  // New planner grammar must remain rejected in every legacy entry.
  if(row.text.includes('var ')||['G03','G05','L03','L04','L03-function'].includes(row.id)){
   assert.notEqual(record.legacy.error,null,row.id+' legacy remains closed');assert.equal(record.audit.kind,'blocked');assert.equal(record.metadata.kind,'blocked');
  }
 }
 for(const id of ['R05-unit-A','R05-unit-B']){
  const text='"use strict";/*💡*/\r\nvar x = (function(a){\u2028var tail;\u2029}); //end\r\n';
  const p=run(lane,id,text).plan;
  const strictness={ownStrict:true,inheritedStrict:false,strict:true,directives:[{start:0,end:12,statementEnd:13,loc:{line:1,column:1},raw:'"use strict"',useStrict:true}]};
  const inherited={ownStrict:false,inheritedStrict:true,strict:true,directives:[]};
  assert.deepEqual(p,{kind:'complete',goal:'Script',unit:{id,text},consumedUnits:64,strictness,
   scopes:[{id:0,kind:'script',parent:null,start:0,end:64,strict:true,formals:[],lexicalDeclarations:[],varDeclarations:[0],lexicalNames:[],varNames:['x']},
    {id:1,kind:'function',parent:0,start:41,end:54,strict:true,formals:[{name:'a',start:39,end:40,loc:{line:2,column:19}}],lexicalDeclarations:[],varDeclarations:[1],lexicalNames:[],varNames:['tail']}],
   declarations:[{id:0,kind:'var',site:{name:'x',start:25,end:26,loc:{line:2,column:5}},scope:0,variableScope:0,functionScope:null,initializer:{start:29,end:55}},
    {id:1,kind:'var',site:{name:'tail',start:47,end:51,loc:{line:3,column:5}},scope:1,variableScope:1,functionScope:null,initializer:null}],
   functions:[{scope:1,declaration:null,start:30,end:54,strictness:inherited}]});
 }
 // Every expression child position is visited, including dead branches and
 // initializer bodies. Each isolated fixture has one source-authored terminal
 // function; expected offsets come from the literal surrounding segments.
 const visitorRows=[
  ['array','[null,',',null];'],['object','({x:',',y:1});'],
  ['unary','!',';'],['binary-left','(', ')+1;'],['binary-right','1+',';'],
  ['assign-target','a[',']=1;'],['assign-value','a=',';'],
  ['compound-target','a[',']+=1;'],['compound-value','a+=',';'],
  ['conditional-test','(',')?1:2;'],['conditional-consequent','true?',' :2;'],['conditional-alternate','true?1:',';'],
  ['member-base','(',').x;'],['member-key','a[','];'],
  ['call-callee','(',')();'],['call-argument','a(1,',',2);'],
  ['if-test','if(','){}'],['while-test','while(','){}'],
 ];
 for(const [label,before,after] of visitorRows){
  const text=prefix+before+'function(){var tail;}'+after;
  const p=run(lane,'visitor-'+label,text).plan,start=13+before.length;
  assert.equal(p.kind,'complete');assert.deepEqual(p.scopes[0].varNames,[]);
  assert.deepEqual(p.functions,[{scope:1,declaration:null,start,end:start+21,strictness:{ownStrict:false,inheritedStrict:true,strict:true,directives:[]}}]);
  assert.deepEqual(p.declarations,[{id:0,kind:'var',site:{name:'tail',start:start+15,end:start+19,loc:{line:1,column:start+16}},scope:1,variableScope:1,functionScope:null,initializer:null}]);
 }
 for(const keyword of ['return','throw']){
  const text=prefix+'function f(){'+keyword+' function(){var tail;};}';
  const p=run(lane,'visitor-'+keyword,text).plan,start=27+keyword.length;
  assert.equal(p.kind,'complete');assert.deepEqual(p.scopes[0].varNames,['f']);assert.deepEqual(p.scopes[1].varNames,[]);assert.deepEqual(p.scopes[2].varNames,['tail']);
  assert.deepEqual(p.functions.map(f=>[f.scope,f.declaration,f.start,f.end]),[[1,0,13,text.length],[2,null,start,start+21]]);
 }
 for(const [id,text,strict,kind] of [
  ['empty','',false,'complete'],['directive-only',prefix,true,'complete'],
  ['parenthesized-directive','("use strict");var x;',false,'complete'],
  ['late-directive',';"use strict";var x;',false,'complete'],
  ['block-directive','{"use strict";function f(){}}',false,'blocked'],
  ['non-strict-repeat','function f(){}function f(){}',false,'complete'],
 ]){const p=run(lane,id,text).plan;assert.equal(p.kind,kind);if(kind==='complete')assert.equal(p.strictness.strict,strict);else assert.equal(p.rejection.capabilityCode,'parse.declaration-statement');}
 {
  const text=prefix+'var a=call(1,2),b=[1,2],c={x:1,y:2};';
  const p=run(lane,'initializer-commas',text).plan;
  assert.equal(p.kind,'complete');assert.deepEqual(p.scopes[0].varNames,['a','b','c']);
  assert.deepEqual(p.declarations.map(d=>d.initializer),[{start:19,end:28},{start:31,end:36},{start:39,end:48}]);
 }
 const ordering=[
  ['duplicate-before-var','let x; var x; let y; let y;','duplicate-lexical',0,'y'],
  ['scope-before-child','let x; var x; {let y; let y;}','lexical-var',0,'x'],
  ['lexical-before-formal','function f(a){let a; var a;}','lexical-var',1,'a'],
  ['formal-order','function f(a,b){let b; let a;}','formal-lexical',1,'a'],
  ['lexical-order','let b; let a; var a,b;','lexical-var',0,'b'],
 ];
 for(const [id,body,kind,scope,name] of ordering){const p=run(lane,id,prefix+body).plan;assert.equal(p.kind,'conflict');assert.equal(p.conflict.kind,kind);assert.equal(p.conflict.scope,scope);assert.equal(p.conflict.first.name,name);}
 for(const [id,text,code] of [
  ['non-strict-veto','let x;let x;{function f(){}}','parse.declaration-statement'],
  ['non-strict-tail','let x;let x;{function f(){}}const y=1;','parse.unexpected'],
  ['formal-veto',prefix+'let x;let x;function f(a,a){}','parse.duplicate-parameter'],
  ['var-no-name',prefix+'var ;','parse.binding-identifier'],
  ['var-no-semicolon',prefix+'var x','parse.expected-token'],
  ['var-no-init',prefix+'var x=;','parse.unexpected'],
 ]){const p=run(lane,id,text).plan;assert.equal(p.kind,'blocked');assert.equal(p.rejection.capabilityCode,code);}
 {
  const p=run(lane,'flat-var-list',prefix+'var '+Array(12000).fill('x').join(',')+';').plan;
  assert.equal(p.kind,'complete');assert.equal(p.scopes.length,1);assert.equal(p.declarations.length,12000);
  for(let i=0;i<12000;i++){assert.equal(p.scopes[0].varDeclarations[i],i);assert.deepEqual(p.declarations[i].site,{name:'x',start:17+2*i,end:18+2*i,loc:{line:1,column:18+2*i}});}
 }
 // Frozen source-cap and nesting expectations R01/R02.
 for(const conflict of [false,true])for(const count of [100000,100001]){
  const begin=prefix+(conflict?'let x; let x;':'var x;');const text=begin+' '.repeat(count-begin.length);
  const p=run(lane,`R01-${conflict}-${count}`,text).plan;
  assert.equal(p.kind,count===100001?'blocked':conflict?'conflict':'complete');
  if(count===100001)assert.deepEqual(p.rejection,{kind:'resource-limit',guardCode:'source-units',count:100001,limit:100000});
 }
 for(const kind of ['blocks','parentheses'])for(const n of [126,127,128,129]){
  const text=prefix+(kind==='blocks'?'{'.repeat(n)+'var x;'+'}'.repeat(n):'('.repeat(n)+'1'+')'.repeat(n)+';');
  const p=run(lane,`R02-${kind}-${n}`,text).plan;const pass=n<=(kind==='blocks'?127:126);
  assert.equal(p.kind,pass?'complete':'blocked');
  if(pass){assert.equal(p.scopes.length,kind==='blocks'?n+1:1);if(kind==='blocks')for(let i=0;i<=n;i++){assert.deepEqual(p.scopes[i].varDeclarations,[0]);assert.deepEqual(p.scopes[i].varNames,['x']);}}
  else assert.deepEqual(p.rejection,{kind:'resource-limit',guardCode:'parse-depth',count:129,limit:128});
 }
 for(const distinct of [false,true]){
  const count=distinct?6000:12000;const names=Array.from({length:count},(_,i)=>distinct?'x'+i:'x');
  const text=prefix+names.map(n=>'var '+n+';').join('');const p=run(lane,'R03-'+distinct,text).plan;
  assert.equal(p.kind,'complete');assert.equal(p.scopes.length,1);assert.deepEqual(p.scopes[0].varNames,names);assert.deepEqual(p.scopes[0].varDeclarations,Array.from({length:count},(_,i)=>i));
  let start=17;for(let i=0;i<count;i++){assert.deepEqual(p.declarations[i],{id:i,kind:'var',site:{name:names[i],start,end:start+names[i].length,loc:{line:1,column:start+1}},scope:0,variableScope:0,functionScope:null,initializer:null});start+=5+names[i].length;}
 }
 for(const kind of ['binary','member','call'])for(const tail of ['plain','function','unsupported']){
  const chain=kind==='binary'?'1'+'+1'.repeat(15000):'a'+(kind==='member'?'.x':'()').repeat(15000);
  const fn='function(){'+(tail==='unsupported'?'const':'var')+' tail;}';
  const ending=tail==='plain'?';':kind==='binary'?'+('+fn+');':kind==='member'?'['+fn+'];':'('+fn+');';
  const text=prefix+chain+ending,p=run(lane,`R04-${kind}-${tail}`,text).plan;
  assert.equal(p.kind,tail==='unsupported'?'blocked':'complete');
  if(tail==='unsupported')assert.equal(p.rejection.capabilityCode,'parse.unexpected');
  else {assert.deepEqual(p.scopes[0].varNames,[]);assert.equal(p.functions.length,tail==='plain'?0:1);if(tail==='function'){
   const start=kind==='binary'?30016:30015;assert.deepEqual(p.functions[0],{scope:1,declaration:null,start,end:start+21,strictness:{ownStrict:false,inheritedStrict:true,strict:true,directives:[]}});
   assert.deepEqual(p.declarations[0],{id:0,kind:'var',site:{name:'tail',start:start+15,end:start+19,loc:{line:1,column:start+16}},scope:1,variableScope:1,functionScope:null,initializer:null});
  }}
 }
 console.log(lane+': '+rows.length+' literal rows; R05 two units; 39 visitor/ordering/grammar/flat-list controls; 23 resource/flat/deep controls passed');
}
}finally{writeFileSync(join(here,'plans-results.json'),JSON.stringify(results,null,2)+'\n');}

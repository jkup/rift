// Expand explicitly selected fixture spans into literal numeric expectations.
// This is an editorial fixture tool, NOT a grammar or eligibility detector.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(readFileSync(new URL('sources.json',import.meta.url)));
const selections={
 P01:['function f(a,a){}'],P02:['function f(a,a){"use strict";}'],P03:['function f(a,a){}'],P08:['function(a,a){}'],P14:['function f(a,a){}','function g(b,b){}'],
 E16:['function(a,a){}'],E17:['function f(a,a){}'],E18:['function(a,a){"use strict";}'],E19:['function f(a,a,a,b,b){"use strict";}'],E20:["function f(a,a){\"other\\n\"; /*x*/ 'use strict';}"],E24:['function f(a,a){("use strict");}'],E26:['function f(a,a){"use strict";}'],E35:['function f(a,a){"use strict"; var a; function a(){}}'],E41:['function f(a,a){"use strict";}'],E42:['function f(a,a){"use strict"; function g(b,b){}}','function g(b,b){}'],
 E43:['function(a,a){"use strict";}'],E44:['function(a,a){"use strict";}'],E45:['function(a,a){"use strict";}'],E46:['function(a,a){"use strict";}'],E47:['function f(a,a,b,c){"use strict";}'],Q01:['function f(a,a){"use strict";}'],Q03:['function f(a,a){"use strict";}'],Q05:['function f(a,a){"use strict";'+'{'.repeat(126)+';'+'}'.repeat(126)+'}'],
 R0:['function alpha(left,left){}'],R1:['function(right,right){}'],S21:['function _13_1_5_fun(param, param) { }']
};
const scope=new Set(['P04','P06','P07','P15','E12','E13','E14','E15','E21','E23','E25','E27','E33','E50','E51','S21-raw']);
const conflict=new Set(['E28','E29','E30','E31','E32','E34','E49']);
// Literal codes from source inspection, cross-checked with separately authored
// same-width distinct-formal controls in grammar-controls.json.
const grammar={P09:'lex.string-escape',P10:'parse.expected-token',P11:'parse.binding-identifier',P12:'parse.unexpected',P13:'parse.expected-token',E01:'parse.unexpected',E02:'parse.unexpected',E03:'parse.return-context',E04:'parse.assignment-target',E05:'parse.declaration-statement',E06:'lex.indeterminate-string-end',E07:'parse.unexpected',E08:'parse.binding-identifier',E09:'parse.binding-identifier',E10:'parse.expected-token',E11:'parse.unexpected',E22:'parse.expected-token',E37:'parse.expected-token',E38:'parse.binding-identifier',E39:'lex.operator',E40:'parse.expected-token',E48:'parse.binding-identifier'};
function site(text,name,start){const prefix=text.slice(0,start).split(/\r\n|[\r\n\u2028\u2029]/);return {name,start,end:start+name.length,loc:{line:prefix.length,column:prefix.at(-1).length+1}};}
const matrix=rows.map(({id,text,futureKind})=>{
 const expected={kind:futureKind};
 if(futureKind==='blocked'){
  expected.reason=scope.has(id)?'scope-restriction':conflict.has(id)?'other-conflict':'grammar-or-resource';
  if(['L06','Q04','Q06'].includes(id))expected.rejection={kind:'resource-limit',guardCode:'parse-depth',count:129,limit:128};
  if(id==='Q02')expected.rejection={kind:'resource-limit',guardCode:'source-units',count:100001,limit:100000};
  if(conflict.has(id))expected.rejection=null;
  if(scope.has(id))expected.rejection={kind:'unsupported-syntax',capabilityCode:id==='E25'?'parse.delete-identifier':['E27','E33','E51'].includes(id)?'parse.declaration-statement':'parse.duplicate-parameter'};
  if(grammar[id])expected.rejection={kind:'unsupported-syntax',capabilityCode:grammar[id]};
  assert('rejection' in expected,id);
 }else{
  expected.sourceUnits=text.length;expected.consumedUnits=text.length;
  if(futureKind==='eligible'){
   assert(selections[id],id);
   expected.candidates=[];
   for(const fragment of selections[id]){
    const functionStart=text.indexOf(fragment);assert(functionStart>=0,id);assert.equal(text.indexOf(fragment,functionStart+1),-1,id);
    const open=fragment.indexOf('('),close=fragment.indexOf(')');
    const header=fragment.slice(open+1,close);const first=new Map();
    const pattern=/[A-Za-z_$][A-Za-z0-9_$]*/g;
    for(const token of header.matchAll(pattern)){
     const s=site(text,token[0],functionStart+open+1+token.index);
     if(first.has(s.name))expected.candidates.push({ruleCode:'duplicate-strict-parameter',functionStart,functionEnd:functionStart+fragment.length,first:first.get(s.name),second:s});
     else first.set(s.name,s);
    }
   }
   expected.candidates.sort((a,b)=>a.second.start-b.second.start||a.first.start-b.first.start);
   assert(expected.candidates.length>0,id);
  }
 }
 return {id,text,expected};
});
writeFileSync(new URL('future-matrix.json',import.meta.url),JSON.stringify(matrix,null,2)+'\n');
console.log(JSON.stringify({rows:matrix.length,eligible:matrix.filter(x=>x.expected.kind==='eligible').length,candidates:matrix.flatMap(x=>x.expected.candidates??[]).length,claim:'Editorial future expectations, not executed behavior'}));

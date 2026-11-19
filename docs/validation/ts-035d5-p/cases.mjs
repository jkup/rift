// Editorial expectations, not a parser or a future implementation oracle.
import blockedLiterals from './blocked-expectations.json' with {type:'json'};
export const rows=[];
const add=(id,text,kind,reason=null,code=null,sites=[])=>rows.push({id,text,expected:{kind,...(reason?{reason,code}:{}),...(kind==='eligible'?{sites}: {})}});
const eligible=(id,text,markers)=>add(id,text,'eligible',null,null,markers.map(([token,operator,occurrence=0])=>({token,operator,occurrence})));
const blocked=(id,text,code,reason='grammar-or-resource')=>add(id,text,'blocked',reason,code);
for(const [i,op] of ['=','+=','-=','*=','/=','%='].entries()) {
 eligible('N'+i,'42 '+op+' 7;',[['42',op]]);
 eligible('P'+i,'"use strict"; ((42)) '+op+' 7;',[['42',op]]);
}
for(const [i,n] of ['0','0.5','42.','42.25','9999999999999999999999999999999999999999'].entries())eligible('D'+i,n+'=7;',[[n,'=']]);
eligible('CHAIN','1=2=3;',[['1','='],['2','=']]);
eligible('RHS','let x; x=(42=7);',[['42','=']]);
eligible('NEST','function f(){return function(){42=7;};}',[['42','=']]);
eligible('DEAD','if(false){42=7;} else {43+=8;}',[['42','='],['43','+=']]);
eligible('OWN','function f(){"use strict";42=7;}',[['42','=']]);
eligible('SLOPPY','function f(){delete x;}42=7;',[['42','=']]);
eligible('EFFECT','this.effect=1;42=guest();',[['42','=']]);
eligible('TRIVIA','42 /* = 99; */ = 7; // tail\r\n',[['42','=']]);
eligible('R0','/*😀*/\r\n((42))=7;',[['42','=']]);
eligible('R1','"use strict";\r\nfunction f(){ /*😀*/ (53.5) += 8; }',[['53.5','+=']]);
for(const [i,text] of ['let x; x=7;','let x; (x)=7;','let x; ((x))+=7;','let o={}; o.x=7;','let o={}; (o.x)+=7;','let o={}; o["x"]=7;','(42).x=7;','42..x=7;','let x=0;x++;','NaN=7;','Infinity=7;','undefined=7;','42;','7;'].entries())add('V'+i,text,'none');
for(const [i,text] of ['-42=7;','+42=7;','(1+2)=7;','true=7;','null=7;','"42"=7;','this=7;','f()=7;','[a]=b;','({a:b})=c;','(a?b:c)=7;','(a=1)=7;','42++;','42\n++;','++42;','42=7;f()=8;','42=7;true=8;'].entries())blocked('U'+i,text,i===13?'parse.line-terminator':i===14?'parse.unexpected':'parse.assignment-target');
for(const [i,text,code] of [[0,'1e2=7;','lex.numeric-literal'],[1,'0x2=7;','lex.numeric-literal'],[2,'01=7;','lex.leading-zero'],[3,'.5=7;','parse.unexpected'],[4,'42**=7;','lex.operator'],[5,'42&&=7;','parse.unexpected'],[6,'42=7;`late`;','lex.character'],[7,'42=7;"unterminated','lex.indeterminate-string-end'],[8,'42=7;class C{}','parse.unexpected'],[9,'42=7;let x=;','parse.unexpected'],[10,'42=7;function f(){class C{}}','parse.unexpected'],[11,'42=7;while(true) let x;','parse.declaration-statement'],[12,'42=(7;','parse.expected-token'],[13,'42=;','parse.unexpected'],[14,'42=7;}','parse.unexpected'],[15,'(42,43)=7;','parse.expected-token']])blocked('G'+i,text,code);
for(const [i,tail,reason,code] of [
 [0,'let x;let x;','other-conflict',null],
 [1,'let x;var x;','other-conflict',null],
 [2,'function f(a){let a;}','other-conflict',null],
 [3,'try{}catch(e){let e;}','scope-restriction','parse.declaration-statement'],
 [4,'delete x;','scope-restriction','parse.delete-identifier'],
 [5,'{function f(){}function f(){}}','other-conflict',null],
 [6,'switch(0){case 0:function f(){}function f(){}}','other-conflict',null],
 [7,'function f(a,a){}','grammar-or-resource','parse.duplicate-parameter'],
 [8,'return 1;','grammar-or-resource','parse.return-context'],
])for(const order of [0,1])blocked('M'+i+'-'+order,'"use strict";'+(order?tail+'42=7;':'42=7;'+tail),code,reason);
blocked('SL0','42=7;function f(a,a){}','parse.duplicate-parameter');
blocked('SL1','function f(a,a){}42=7;','parse.duplicate-parameter');
blocked('SL2','42=7;{function single(){}}','parse.declaration-statement','scope-restriction');
eligible('STRICT-SINGLE','"use strict";42=7;{function single(){}}',[['42','=']]);
for(const depth of [127,128]){
 const text='42=7;'+'{'.repeat(depth)+';'+'}'.repeat(depth);
 if(depth===127)eligible('DEPTH'+depth,text,[['42','=']]);else blocked('DEPTH'+depth,text,'parse-depth');
}
for(const size of [100000,100001]){
 const text='42=7;'+' '.repeat(size-5);
 if(size===100000)eligible('SIZE'+size,text,[['42','=']]);else blocked('SIZE'+size,text,'source-units');
}
for(const row of rows.filter(r=>r.expected.kind==='blocked')){
 const literal=blockedLiterals.rows.find(r=>r.id===row.id);
 if(!literal||literal.text!==row.text)throw new Error('Blocked literal/source drift '+row.id);
 row.expected=structuredClone(literal.expected);
}

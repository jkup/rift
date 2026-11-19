import assert from 'node:assert/strict';
// Frozen before production edits. Arrays describe each scope in syntax preorder:
// kind, parent, lexical occurrences, var occurrences, formal occurrences.
const S=(kind,parent,lex=[],vars=[],formals=[])=>({kind,parent,lex,vars,formals});
const root=(lex=[],vars=[])=>S('script',null,lex,vars);
const fn=(parent,lex=[],vars=[],formals=[])=>S('function',parent,lex,vars,formals);
const block=(parent,lex=[],vars=[])=>S('block',parent,lex,vars);
export const cases=[];
const ok=(id,body,scopes,winners=[],prefix=true)=>cases.push({id,text:(prefix?'"use strict";':'')+body,scopes,winners});
const bad=(id,body,kind,detail,prefix=true)=>cases.push({id,text:(prefix?'"use strict";':'')+body,kind,detail});
ok('G01','let x=1;',[root(['x'])]);ok('G01-var','var x=1;',[root([],['x'])]);
ok('G02','var x=1,y=x,z; var x;',[root([],['x','y','z','x'])]);
bad('G02-trailing','var x,;','blocked','parse.binding-identifier');bad('G02-let-list','let x,y;','blocked','parse.expected-token');
ok('G03','function f(){return 1;} var f; function g(){} function f(){return 2;}',[root([],['f','f','g','f']),fn(0),fn(0),fn(0)],[2,3]);
for(const [id,body] of [['G04','let x; var x;'],['G04-reversed','var x; let x;'],['G04-nested','let x; {var x;}']])bad(id,body,'conflict','lexical-var');
bad('G05','let x; let x;','conflict','duplicate-lexical');ok('G05-shadow','let x; {let x;}',[root(['x']),block(0,['x'])]);
// Runtime state in G06-G15 is intentionally absent: every input is planned alone.
for(const [id,body,lex,vars,winners] of [
 ['G06-A','var x;',[],['x'],[]],['G06-B','let x;',['x'],[],[]],
 ['G07-A','let x;',['x'],[],[]],['G07-B-var','var x;',[],['x'],[]],['G07-B-function','function x(){}',[],['x'],[0]],['G07-B-let','let x;',['x'],[],[]],['G07-neighbor','let y;',['y'],[],[]],
 ['G08-function','function x(){}',[],['x'],[0]],['G08-var','var x;',[],['x'],[]],
 ['G09-var','var x;',[],['x'],[]],['G09-function','function x(){}',[],['x'],[0]],['G09-let','let x;',['x'],[],[]],
 ['G10-var','var x;',[],['x'],[]],['G10-function','function x(){}',[],['x'],[0]],['G10-fresh-var','var y;',[],['y'],[]],['G10-fresh-function','function y(){}',[],['y'],[0]],['G10-let','let y;',['y'],[],[]],
 ['G11','let fresh; var x; function f(){}',['fresh'],['x','f'],[2]],
 ['G12-let','let Infinity;',['Infinity'],[],[]],['G12-var','var Infinity;',[],['Infinity'],[]],['G12-function','function Infinity(){}',[],['Infinity'],[0]],['G12-neighbor','let Number;',['Number'],[],[]],
 ['G13','var x; var x;',[],['x','x'],[]],['G13-neighbor','var x; function x(){}',[],['x','x'],[1]],
 ['G14','let l; var x; function f(){}',['l'],['x','f'],[2]],
 ['G16','var x=sideEffect(); function f(){sideEffect();}',[],['x','f'],[1]],
])ok(id,body,[root(lex,vars),...(winners.length?[fn(0)]:[])],winners);
ok('G15','function f(){return 1;} var f; function g(){} function f(){return 2;}',[root([],['f','f','g','f']),fn(0),fn(0),fn(0)],[2,3]);
ok('L01','{var x;} if(false){var y;} while(false){var z;} function f(){var inner;}',[root([],['x','y','z','f']),block(0,[],['x']),block(0,[],['y']),block(0,[],['z']),fn(0,[],['inner'])],[3]);
bad('L02','{let x; {var x;}}','conflict','lexical-var');ok('L02-neighbor','{let x;} var x;',[root([],['x']),block(0,['x'])]);
bad('L03','{function f(){} function f(){}}','conflict','duplicate-lexical');bad('L03-let','{let f; function f(){}}','conflict','duplicate-lexical');
ok('L03-function','function f(){function g(){} function g(){}}',[root([],['f']),fn(0,[],['g','g']),fn(1),fn(1)],[0]);
ok('L04','function f(a){var a; function a(){} let b;}',[root([],['f']),fn(0,['b'],['a','a'],['a']),fn(1)],[0]);bad('L04-neighbor','function f(a){let a;}','conflict','formal-lexical');
ok('L05','function f(a){{let a;}{function a(){}} var a;}',[root([],['f']),fn(0,[],['a'],['a']),block(1,['a']),block(1,['a']),fn(3)],[0]);
bad('L06','function f(){let x; {var x;}}','conflict','lexical-var');ok('L06-neighbor','function f(){let x; function g(){var x;}}',[root([],['f']),fn(0,['x'],['g']),fn(1,[],['x'])],[0]);
ok('L07','let f=function(a){var a; let x;}; let g=function(){var x;};',[root(['f','g']),fn(0,['x'],['a'],['a']),fn(0,[],['x'])]);
ok('L07-sibling','let f=function(){"use strict";var a;}; let g=function(){var x;};',[root(['f','g']),fn(0,[],['a']),fn(0,[],['x'])],[],false);
for(const [id,body,code] of [['L08-duplicate','function f(a,a){}','parse.duplicate-parameter'],['L08-default','function f(a=1){}','parse.expected-token'],['L08-pattern','var {x}=o;','parse.binding-identifier'],['L08-const','const x=1;','parse.unexpected']])bad(id,body,'blocked',code);
ok('L08-neighbor','function f(a){} var x=o;',[root([],['f','x']),fn(0,[],[],['a'])],[0]);
ok('L09','{let x=1; function f(){return x;}}',[root(),block(0,['x','f']),fn(1)]);
bad('L10','{function f(){}}','blocked','parse.declaration-statement',false);
ok('L10-nested','function outer(){"use strict"; {function f(){}}}',[root([],['outer']),fn(0),block(1,['f']),fn(2)],[0],false);
ok('L10-strict','{function f(){}}',[root(),block(0,['f']),fn(1)]);
for(const [id,body] of [['T01','let x; let x; const tail=0;'],['T01-nested','let x; var x; function f(){const tail=0;}']])bad(id,body,'blocked','parse.unexpected');
bad('T01-removed','let x; var x; function f(){}','conflict','lexical-var');
bad('T02-lex','var x=function(){return 1;}; @','blocked','lex.character');bad('T02-return','var x; return 1;','blocked','parse.return-context');
ok('preorder','var a=function(){let x;},b;',[root([],['a','b']),fn(0,['x'])]);
ok('branches','if(false)var x;else var y; while(false)var z;',[root([],['x','y','z'])]);
for(const [id,body] of [['let-branch','if(true)let x;'],['function-branch','if(true)function f(){}'],['reserved','var arguments;'],['delete','var x=delete y;']])bad(id,body,'blocked',id==='reserved'?'parse.binding-identifier':id==='delete'?'parse.delete-identifier':'parse.declaration-statement');
assert.ok(cases.length>60);

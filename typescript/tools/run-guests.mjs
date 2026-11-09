import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { scriptHostCases } from "./script-host-cases.mjs";
const root = fileURLToPath(new URL("..", import.meta.url));
const lane = process.argv[2];
if (process.argv.length !== 3 || !["node", "native"].includes(lane)) throw new Error("usage: run-guests.mjs node|native");
const suffix = process.platform === "win32" ? ".exe" : "";
const command = lane === "node" ? process.execPath : join(root, "build/native/rift" + suffix);
const prefix = lane === "node" ? [join(root, "build/node/src/cli.js")] : [];
const cases = JSON.parse(readFileSync(join(root, "test/cases.json"), "utf8"));
// TS-027A C1/C2/C4-C7: literal CLI expectations for committed runtime files.
cases.push(
    { file: "test/fixtures/in-success.js", stdout: "true false true\n" },
    { file: "test/fixtures/in-effects.js", stdout: "true LRC 1 1 1\n" },
    { file: "test/fixtures/in-parse.js", status: 2, error: "1:7: parse SyntaxError: unsupported or unexpected syntax: ;" },
    { file: "test/fixtures/in-runtime.js", status: 1, error: "1:1: runtime TypeError: right operand of in must be an object" },
    { file: "test/fixtures/in-competing.js", status: 1, error: "1:1: runtime ReferenceError: missing is not defined" },
    { file: "test/fixtures/in-parse-before-effects.js", status: 2, error: "1:17: parse SyntaxError: unsupported or unexpected syntax: ;" },
);
// TS-028A C1-C5/C7: independent literal runtime-file expectations.
cases.push(
    { file: "test/fixtures/primitive-reads-basic.js", stdout: "a 2 true 2\n" },
    { file: "test/fixtures/primitive-reads-methods.js", stdout: "x false undefined\n" },
    { file: "test/fixtures/primitive-reads-nullish.js", status: 1, error: "1:1: runtime TypeError: cannot convert null or undefined to object" },
    { file: "test/fixtures/primitive-reads-write.js", status: 1, error: "2:1: runtime TypeError: property is not writable: 0" },
    { file: "test/fixtures/primitive-reads-effects.js", stdout: "2 1\n" },
    { file: "test/fixtures/primitive-reads-parse.js", status: 1, error: "1:1: runtime ReferenceError: effect is not defined" },
);
// TS-029A C1-C6: frozen independent CLI expectations.
cases.push(
    { file: "test/fixtures/property-assignment-object.js", stdout: "7 7\n" },
    { file: "test/fixtures/property-assignment-primitive.js", status: 1, error: "2:1: runtime TypeError: property is not writable: 0" },
    { file: "test/fixtures/property-assignment-nullish.js", status: 1, error: "1:1: runtime TypeError: cannot convert null or undefined to object" },
    { file: "test/fixtures/property-assignment-effects.js", stdout: "rhs\nkey\n", status: 1, error: "3:1: runtime TypeError: property is not writable: x" },
    { file: "test/fixtures/property-assignment-rhs-wins.js", status: 1, error: "1:10: runtime ReferenceError: missing is not defined" },
    { file: "test/fixtures/property-assignment-parse.js", status: 1, error: "1:1: runtime ReferenceError: effect is not defined" },
);
// TS-030A: committed files are read by the CLI in both lanes.
cases.push(
    { file: "test/fixtures/compound-basic.js", stdout: "15 9 36 4 0\n15 9 36 4 0\n" },
    { file: "test/fixtures/compound-effects.js", stdout: "15 15 1 1\n" },
    { file: "test/fixtures/compound-get-failure.js", status: 1, error: "1:1: runtime TypeError: cannot convert null or undefined to object" },
    { file: "test/fixtures/compound-write-failure.js", stdout: "coerce\n", status: 1, error: "3:1: runtime TypeError: property is not writable: NaN" },
    { file: "test/fixtures/compound-coercion-failure.js", stdout: "coerce\n", status: 1, error: "1:50: runtime Uncaught: sentinel" },
    { file: "test/fixtures/compound-parse.js", status: 2, error: "1:11: parse SyntaxError: invalid numeric assignment target" },
    { file: "test/fixtures/compound-retention.js", stdout: "function f() { /*keep*/ x += 3; }\n" },
);
const generated = [
    ["math-hypot-values","console.log(Math.hypot(),Math.hypot(-5),Math.hypot(3,4),Math.hypot(3,4,12),1/Math.hypot(-0));",0,"","0 5 5 13 Infinity\n"],
    ["math-hypot-special","console.log(Math.hypot(NaN,Infinity),Math.hypot(-Infinity,NaN),Math.hypot(NaN,1));",0,"","Infinity Infinity NaN\n"],
    ["math-hypot-scale","console.log(Math.abs(Math.hypot(3e300,4e300,12e300)/13e300-1)<1e-15,Math.abs(Math.hypot(3e-300,4e-300,12e-300)/13e-300-1)<1e-15);",0,"","true true\n"],
    ["math-hypot-coercion","let n=0;let a={valueOf:function(){n++;return '3';}};console.log(Math.hypot(a,'4',null),n);",0,"","5 1\n"],
    ["math-hypot-metadata","console.log(Math.hypot.name,Math.hypot.length);let d=Object.getOwnPropertyDescriptor(Math,'hypot');console.log(d.writable,d.enumerable,d.configurable);try{new Math.hypot();}catch(e){console.log(e.name);}",0,"","hypot 2\ntrue false true\nTypeError\n"],
    ["math-clz32","console.log(Math.clz32(),Math.clz32(1),Math.clz32(1000),Math.clz32(-1),Math.clz32(4294967297));",0,"","32 31 22 0 31\n"],
    ["math-fround","console.log(Math.fround(1.337),Math.fround(16777217),Math.fround(16777219),1/Math.fround(-1e-50));",0,"","1.3370000123977661 16777216 16777220 -Infinity\n"],
    ["math-width-metadata","console.log(Math.clz32.name,Math.clz32.length,Math.fround.name,Math.fround.length);let d=Object.getOwnPropertyDescriptor(Math,'fround');console.log(d.writable,d.enumerable,d.configurable);try{new Math.clz32();}catch(e){console.log(e.name);}",0,"","clz32 1 fround 1\ntrue false true\nTypeError\n"],
    ["math-width-coercion","console.log(Math.clz32('1'),Math.clz32(null),Math.fround('1.5'),Math.fround(null));",0,"","31 32 1.5 0\n"],
    ["math-binary-values","console.log(Math.pow(2,10),Math.imul(0xffffffff,5),Math.abs(Math.atan2(1,1)-Math.PI/4)<1e-14);",0,"","1024 -5 true\n"],
    ["math-pow-special","console.log(Math.pow(NaN,0),Math.pow(1,Infinity),Math.pow(-1,Infinity),Math.pow(-0,-3),1/Math.pow(-0,3));",0,"","1 NaN NaN -Infinity -Infinity\n"],
    ["math-atan2-zeros","console.log(1/Math.atan2(-0,1),1/Math.atan2(0,1),Math.atan2(0,-0)===Math.PI,Math.atan2(-0,-0)===-Math.PI);",0,"","-Infinity Infinity true true\n"],
    ["math-binary-metadata","console.log(Math.atan2.name,Math.atan2.length,Math.pow.name,Math.pow.length,Math.imul.name,Math.imul.length);let d=Object.getOwnPropertyDescriptor(Math,'pow');console.log(d.writable,d.enumerable,d.configurable);try{new Math.pow();}catch(e){console.log(e.name);}",0,"","atan2 2 pow 2 imul 2\ntrue false true\nTypeError\n"],
    ["math-binary-missing","let n=0;let x={valueOf:function(){n++;return 2;}};console.log(Math.pow(x),n);",0,"","NaN 1\n"],
    ["math-binary-second-throw","let marker={};let x={valueOf:function(){throw marker;}};try{Math.atan2(NaN,x);}catch(e){console.log(e===marker);}try{Math.imul(0,x);}catch(e){console.log(e===marker);}",0,"","true\ntrue\n"],
    ["global-isnan","console.log(isNaN(),isNaN(undefined),isNaN(null),isNaN(true),isNaN(''),isNaN('4'),isNaN('x'),isNaN(NaN),isNaN(Infinity));",0,"","true true false false false false true true false\n"],
    ["global-isfinite","console.log(isFinite(),isFinite(null),isFinite(false),isFinite(''),isFinite('4'),isFinite('x'),isFinite(NaN),isFinite(Infinity),isFinite(-Infinity));",0,"","false true true true true false false false false\n"],
    ["global-predicate-objects","console.log(isNaN({}),isNaN([]),isNaN([1]),isNaN([1,2]),isFinite(new String('7')),Number.isFinite('7'),Number.isNaN('x'));",0,"","true false false true true false false\n"],
    ["global-predicate-hints","let trace='';let o={valueOf:function(){trace+='v';return {};},toString:function(){trace+='s';return '4';}};console.log(isFinite(o),trace);",0,"","true vs\n"],
    ["global-predicate-metadata","console.log(isNaN.name,isNaN.length,isFinite.name,isFinite.length);try{new isNaN();}catch(e){console.log(e.name);}try{new isFinite();}catch(e){console.log(e.name);}",0,"","isNaN 1 isFinite 1\nTypeError\nTypeError\n"],
    ["global-predicate-mutable","let f=isNaN;isNaN=7;console.log(isNaN,f('x'));",0,"","7 true\n"],
    ["math-roots","console.log(Math.sqrt(9),Math.cbrt(27),Math.cbrt(-8),1/Math.sqrt(-0),1/Math.cbrt(-0));",0,"","3 3 -2 -Infinity -Infinity\n"],
    ["math-logs","console.log(Math.log2(8),Math.log10(1000),Math.log(1),Math.log1p(-1));",0,"","3 3 0 -Infinity\n"],
    ["math-domains","console.log(Math.acos(2),Math.asin(-2),Math.acosh(.5),Math.atanh(2),Math.sqrt(-1),Math.log(-1),Math.log1p(-2));",0,"","NaN NaN NaN NaN NaN NaN NaN\n"],
    ["math-trig","console.log(Math.abs(Math.sin(Math.PI/2)-1)<1e-14,Math.abs(Math.cos(Math.PI)+1)<1e-14,Math.abs(Math.atan(1)-Math.PI/4)<1e-14);",0,"","true true true\n"],
    ["math-hyperbolic","console.log(Math.abs(Math.acosh(2)-1.3169578969248166)<1e-14,Math.abs(Math.asinh(2)-1.4436354751788103)<1e-14,Math.abs(Math.atanh(.5)-.5493061443340548)<1e-14);",0,"","true true true\n"],
    ["math-exponential","console.log(Math.abs(Math.exp(1)-Math.E)<1e-14,Math.abs(Math.expm1(1)-(Math.E-1))<1e-14,Math.expm1(-Infinity));try{new Math.sin();}catch(e){console.log(e.name);}",0,"","true true -1\nTypeError\n"],
    ["radix-values","console.log(0xFF,0XfF,0b101,0B101,0o777,0O777);",0,"","255 255 5 5 511 511\n"],
    ["radix-keys","let o={0x10:'a',16:'b',0b11:'c',0o7:'d'};console.log(o[16],o[3],o[7],Object.keys(o).join(','));",0,"","b c d 3,7,16\n"],
    ["radix-members","console.log(0xFF.toString(),0b10.toString(),0o7.toString(),0xE+1,0xF-1,1/(-0x0));",0,"","255 2 7 15 14 -Infinity\n"],
    ["radix-rounding","console.log(0x20000000000001,0x20000000000003);",0,"","9007199254740992 9007199254740996\n"],
    ["radix-invalid-binary","console.log('must not run');0b102;",2,"parse SyntaxError: invalid radix numeric literal",""],
    ["radix-invalid-octal","0o78;",2,"parse SyntaxError: invalid radix numeric literal",""],
    ["radix-missing-digits","0x;",2,"parse SyntaxError: invalid radix numeric literal",""],
    ["radix-bigint","0x1n;",2,"parse SyntaxError: invalid radix numeric literal",""],
    ["decimal-exponents","console.log(1e2,1E+2,1e-2,1.e2,.5e2,.5);",0,"","100 100 0.01 100 50 0.5\n"],
    ["decimal-boundaries","console.log(1e999,1e-999,1/(-1e-999),5e-324,9007199254740993e0);",0,"","Infinity 0 -Infinity 5e-324 9007199254740992\n"],
    ["decimal-keys","let o={1e2:'a',100:'b',.5:'c'};console.log(o[100],o[.5],Object.keys(o).join(','));",0,"","b c 100,0.5\n"],
    ["decimal-operators","console.log(1e2+3,1e-2-3,.5*2,1.e2/4);",0,"","103 -2.99 1 25\n"],
    ["decimal-member","console.log(1e2.toString(),.5.toString(),1..toString());",0,"","100 0.5 1\n"],
    ["decimal-missing-exponent","console.log('must not run');1e+;",2,"parse SyntaxError: decimal exponent requires digits",""],
    ["decimal-suffix","1e2foo;",2,"parse SyntaxError: unsupported numeric literal",""],
    ["decimal-split-exponent","1e\n2;",2,"parse SyntaxError: decimal exponent requires digits",""],
    ["math-extrema-basic","console.log(Math.min(),Math.max(),Math.min(3,-2,7),Math.max(3,-2,7));",0,"","Infinity -Infinity -2 7\n"],
    ["math-extrema-zeros","console.log(1/Math.min(0,-0),1/Math.min(-0,0),1/Math.max(0,-0),1/Math.max(-0,0));",0,"","-Infinity -Infinity Infinity Infinity\n"],
    ["math-extrema-coercion","let trace='';let a={valueOf:function(){trace+='a';return NaN;}};let b={valueOf:function(){trace+='b';return 4;}};console.log(Math.min(a,b),trace);trace='';console.log(Math.max(a,b),trace);",0,"","NaN ab\nNaN ab\n"],
    ["math-extrema-throw","let marker={};let trace='';let a={valueOf:function(){trace+='a';throw marker;}};let b={valueOf:function(){trace+='b';return 4;}};try{Math.max(NaN,a,b);}catch(e){console.log(e===marker,trace);}",0,"","true a\n"],
    ["math-extrema-snapshot","let n=0;let a={valueOf:function(){n=9;return 3;}};console.log(Math.min(a,n),n);",0,"","0 9\n"],
    ["math-extrema-metadata","console.log(Math.min.name,Math.min.length,Math.max.name,Math.max.length,Object.keys(Math).length);let d=Object.getOwnPropertyDescriptor(Math,'min');console.log(d.writable,d.enumerable,d.configurable);try{new Math.max();}catch(e){console.log(e.name);}",0,"","min 2 max 2 0\ntrue false true\nTypeError\n"],
    ["apply-basic","function f(a,b){return this.n+a+b;}console.log(f.apply({n:7},[2,3]));",0,"","12\n"],
    ["apply-empty","function f(a){'use strict';return typeof this+':'+a;}console.log(f.apply(),f.apply(null,null),f.apply(7,undefined));",0,"","undefined:undefined object:undefined number:undefined\n"],
    ["apply-arraylike","function f(a,b){return a+':'+b;}console.log(f.apply(null,{0:'a',1:'b',2:'c',length:'2.9'}),f.apply(null,new String('xy')));",0,"","a:b x:y\n"],
    ["apply-holes","Array.prototype[1]=7;function f(a,b,c){return a+':'+b+':'+c;}console.log(f.apply(null,[,,3]));",0,"","undefined:7:3\n"],
    ["apply-invalid-list","function f(){}try{f.apply(null,'ab');}catch(e){console.log(e.name);}try{f.apply(null,7);}catch(e){console.log(e.name);}try{f.apply(null,true);}catch(e){console.log(e.name);}",0,"","TypeError\nTypeError\nTypeError\n"],
    ["apply-validation-order","let n=0;let list={};Object.defineProperty(list,'length',{get:function(){n++;throw 7;}});try{(function(){}).apply.call({},null,list);}catch(e){console.log(e.name,n);}",0,"","TypeError 0\n"],
    ["apply-getter-order","let list={0:1,length:2};Object.defineProperty(list,'1',{get:function(){list[0]=9;return 2;}});function f(a,b){return a+':'+b;}console.log(f.apply(null,list),list[0]);",0,"","1:2 9\n"],
    ["apply-length-throw","let marker={};let n=0;let list={};Object.defineProperty(list,'length',{get:function(){throw marker;}});function f(){n++;}try{f.apply(null,list);}catch(e){console.log(e===marker,n);}",0,"","true 0\n"],
    ["apply-builtin","console.log(Array.prototype.join.apply([1,2,3],['-']),Math.abs.apply(null,[-7]));",0,"","1-2-3 7\n"],
    ["apply-metadata","let a=(function(){}).apply;console.log(a.name,a.length,Object.keys(a).length);try{new a();}catch(e){console.log(e.name);}",0,"","apply 2 0\nTypeError\n"],
    ["math-basic","console.log(Math.abs(-5),Math.ceil(-2.3),Math.floor(-2.3),Math.round(-1.5),Math.trunc(-2.7),Math.sign(-2));",0,"","5 -2 -3 -1 -2 -1\n"],
    ["math-zero","console.log(1/Math.abs(-0),1/Math.ceil(-0.1),1/Math.floor(-0),1/Math.round(-0.5),1/Math.sign(-0),1/Math.trunc(-0.7));",0,"","Infinity -Infinity -Infinity -Infinity -Infinity -Infinity\n"],
    ["math-arguments","console.log(Math.abs(),Math.ceil(undefined),Math.floor(null),Math.round('2.7'),Math.sign(false),Math.trunc(true));",0,"","NaN NaN 0 3 0 1\n"],
    ["math-rounding","console.log(Math.round(0.49999999999999994),Math.round(0.5),Math.round(-2.5),Math.round(Infinity),Math.round(-Infinity));",0,"","0 1 -2 Infinity -Infinity\n"],
    ["math-descriptors","let d=Object.getOwnPropertyDescriptor(Math,'PI');console.log(d.value===3.141592653589793,d.writable,d.enumerable,d.configurable);Math.PI=0;console.log(Math.PI===3.141592653589793,delete Math.PI,Object.keys(Math).length);",0,"","true false false false\ntrue false 0\n"],
    ["math-metadata","console.log(Object.prototype.toString.call(Math),Math.abs.name,Math.abs.length,Math.ceil.length,Math.floor.length,Math.round.length,Math.sign.length,Math.trunc.length);",0,"","[object Math] abs 1 1 1 1 1 1\n"],
    ["math-nonconstructible","try{Math();}catch(e){console.log(e.name);}try{new Math();}catch(e){console.log(e.name);}try{new Math.abs(1);}catch(e){console.log(e.name);}console.log(Math.abs.call(null,-7));",0,"","TypeError\nTypeError\nTypeError\n7\n"],
    ["math-conversion","let s='';let x={valueOf:function(){s+='v';return {};},toString:function(){s+='s';return '-2.7';}};console.log(Math.floor(x),s);",0,"","-3 vs\n"],
    ["do-once","let n=0;do{n++;}while(false);console.log(n);",0,"","1\n"],
    ["do-continue","let n=0;let s='';do{n++;if(n===2){continue;}s+=n;}while(n<4);console.log(s,n);",0,"","134 4\n"],
    ["do-break","let n=0;do{n++;break;}while(missing);console.log(n);",0,"","1\n"],
    ["do-nested","let i=0;let n=0;do{let j=0;do{j++;if(j===2){break;}n++;}while(true);i++;}while(i<3);console.log(n);",0,"","3\n"],
    ["do-return","function f(){do{return 7;}while(missing);}console.log(f());",0,"","7\n"],
    ["do-condition-throw","let marker={};let n=0;function bad(){throw marker;}try{do{n++;}while(bad());}catch(e){console.log(e===marker,n);}",0,"","true 1\n"],
    ["do-semicolon","let i=0;do{i++;}while(false) console.log(i);",0,"","1\n"],
    ["do-source","function f(){do{return 3;}while(false);}console.log(f.toString(),f());",0,"","function f(){do{return 3;}while(false);} 3\n"],
    ["string-index-basic","console.log('abca'.indexOf('a'),'abca'.indexOf('a',1),'abca'.indexOf('x'),'abca'.indexOf('bc'));",0,"","0 3 -1 1\n"],
    ["string-index-empty","console.log('abc'.indexOf(''),'abc'.indexOf('',99),''.indexOf(''),''.indexOf('x'),'abc'.indexOf('c',Infinity));",0,"","0 3 0 -1 -1\n"],
    ["string-index-position","console.log('abca'.indexOf('a',NaN),'abca'.indexOf('a',-Infinity),'abca'.indexOf('a',1.9),'abca'.indexOf('a',-1.9),'abca'.indexOf('a',undefined));",0,"","0 0 3 0 0\n"],
    ["string-index-missing","console.log('undefined'.indexOf(),'null'.indexOf(null),'false'.indexOf(false));",0,"","0 0 0\n"],
    ["string-index-generic","let f=String.prototype.indexOf; console.log(f.call(12321,2),f.call(true,'r'),new String('abc').indexOf('b'));",0,"","1 1 1\n"],
    ["string-index-coercion","let s='';let o={toString:function(){s+='R';return 'abca';}};let q={toString:function(){s+='S';return 'a';}};let p={valueOf:function(){s+='P';return 1;}};console.log(String.prototype.indexOf.call(o,q,p),s);",0,"","3 RSP\n"],
    ["string-index-utf16","let s=`A\\u{1F600}Z`; console.log(s.indexOf('Z'),s.indexOf(`\\uDE00`),s.indexOf(`\\uD83D`),s.indexOf('',Infinity));",0,"","3 2 1 4\n"],
    ["string-index-metadata","console.log(String.prototype.indexOf.length,Object.keys(String.prototype).length); let n=0;try{String.prototype.indexOf.call(null,{toString:function(){n++;return '';}});}catch(e){console.log(e.name,n);}",0,"","1 0\nTypeError 0\n"],
    ["template-basic","let n=3; console.log(`hello ${n+1}`,`empty:${''}`,`${true}:${null}:${undefined}`);",0,"","hello 4 empty: true:null:undefined\n"],
    ["template-nested","console.log(`a${`b${{x:3}.x}c`}d`);",0,"","ab3cd\n"],
    ["template-order","let s=''; function v(n){s+=n;return {toString:function(){s+='s';return n;}};} console.log(`${v(1)}${v(2)}`,s);",0,"","12 1s2s\n"],
    ["template-shortcircuit","let o={toString:function(){throw 7;}};let n=0;try{`${o}${n++}`;}catch(e){console.log(e,n);}",0,"","7 0\n"],
    ["template-source","function f(){return `a${1}b`;} console.log(f.toString(),f());",0,"","function f(){return `a${1}b`;} a1b\n"],
    ["template-directive","`use strict`; function f(){return this===undefined;} console.log(f());",0,"","false\n"],
    ["template-cooked","let t=`\\x41\\u0042\\u{1F600}`;console.log(t.length,t.charCodeAt(0),t.charCodeAt(2),t.charCodeAt(3));",0,"","4 65 55357 56832\n"],
    ["template-linebreaks","let t=`a\r\nb\rc`;console.log(t.length,t.charCodeAt(1),t.charCodeAt(3));",0,"","5 10 10\n"],
    ["template-malformed","console.log('must not run'); `\\1`;",2,"parse SyntaxError: invalid template escape",""],
    ["template-tagged","function tag(){} tag`x`;",2,"parse SyntaxError: tagged templates are unsupported",""],
    ["lastindex-start","let a=[1,2,1]; console.log(a.lastIndexOf(1),a.lastIndexOf(1,undefined),a.lastIndexOf(1,NaN),a.lastIndexOf(1,1),a.lastIndexOf(1,-1),a.lastIndexOf(1,-2),a.lastIndexOf(1,Infinity),a.lastIndexOf(1,-Infinity));",0,"","2 0 0 0 2 0 2 -1\n"],
    ["lastindex-fraction","let a=[1,2,1]; console.log(a.lastIndexOf(1,1.9),a.lastIndexOf(1,-1.9),a.lastIndexOf(1,-4),a.lastIndexOf(1,-0),1/a.lastIndexOf(1,-0));",0,"","0 2 -1 0 Infinity\n"],
    ["lastindex-equality","let x={}; let a=[NaN,0,x,'1',1]; console.log(a.lastIndexOf(NaN),a.lastIndexOf(-0),a.lastIndexOf(x),a.lastIndexOf({}),a.lastIndexOf('1'));",0,"","-1 1 2 -1 3\n"],
    ["lastindex-holes","let a=[,undefined,,]; console.log(a.lastIndexOf(),a.lastIndexOf(undefined),[,].lastIndexOf(undefined)); Array.prototype[2]=7; console.log(a.lastIndexOf(7));",0,"","1 1 -1\n2\n"],
    ["lastindex-generic","console.log(Array.prototype.lastIndexOf.call('abca','a'),Array.prototype.lastIndexOf.call({0:7,2:7,length:2.9},7));",0,"","3 0\n"],
    ["lastindex-effects","let o={0:1,2:1,length:3}; let from={valueOf:function(){o.length=0;o[2]=7;return 99;}}; console.log(Array.prototype.lastIndexOf.call(o,7,from));",0,"","2\n"],
    ["lastindex-empty","let n=0; let from={valueOf:function(){n++;throw 7;}}; console.log([].lastIndexOf(1,from),n); try{[1].lastIndexOf(1,from);}catch(e){console.log(e,n);}",0,"","-1 0\n7 1\n"],
    ["lastindex-null-metadata","try{Array.prototype.lastIndexOf.call(null,1);}catch(e){console.log(e.name);} console.log(Array.prototype.lastIndexOf.length,Object.keys(Array.prototype).length);",0,"","TypeError\n1 0\n"],
    ["find-basic","let a=[1,4,3,6]; function even(x){return x%2===0;} console.log(a.find(even),a.findIndex(even),a.findLast(even),a.findLastIndex(even));",0,"","4 1 6 3\n"],
    ["find-missing","function no(){return false;} let a=[1,2]; console.log(a.find(no),a.findIndex(no),a.findLast(no),a.findLastIndex(no),[].find(no),[].findLastIndex(no));",0,"","undefined -1 undefined -1 undefined -1\n"],
    ["find-holes","let a=[,,]; let n=0; function hole(x){n++;return x===undefined;} console.log(a.findIndex(hole),a.findLastIndex(hole),n);",0,"","0 1 2\n"],
    ["find-mutation","let a=[1,2,3]; let s=''; a.find(function(x,i){s+=i+':'+x+';';if(i===0){delete a[1];a[2]=7;a[3]=9;a.length=2;}return false;}); console.log(s);",0,"","0:1;1:undefined;2:undefined;\n"],
    ["find-reverse-mutation","let a=[1,2,3]; let s=''; a.findLast(function(x,i){s+=i+':'+x+';';if(i===2){delete a[1];a[0]=7;a[3]=9;}return false;}); console.log(s);",0,"","2:3;1:undefined;0:7;\n"],
    ["find-inherited","Array.prototype[1]=7; let a=[1,,3]; function seven(x){return x===7;} console.log(a.find(seven),a.findIndex(seven),a.findLast(seven),a.findLastIndex(seven));",0,"","7 1 7 1\n"],
    ["find-string","let p=Array.prototype; function yes(x,i,o){return typeof o==='object' && x==='b';} console.log(p.find.call('abc',yes),p.findIndex.call('abc',yes),p.findLast.call('abc',yes),p.findLastIndex.call('abc',yes));",0,"","b 1 b 1\n"],
    ["find-thisarg","let a=[1,2,3]; let o={n:2}; function yes(x){return this.n===x;} console.log(a.find(yes,o),a.findIndex(yes,o),a.findLast(yes,o),a.findLastIndex(yes,o));",0,"","2 1 2 1\n"],
    ["find-saved","let a=[1,2]; console.log(a.find(function(x,i){a[i]=9;return true;}),a.findLast(function(x,i){a[i]=8;return true;}),a.join(','));",0,"","1 2 9,8\n"],
    ["find-abrupt","let marker={}; let a=[1,2]; function bad(){throw marker;} try{a.find(bad);}catch(e){console.log(e===marker);} try{a.findLastIndex(bad);}catch(e){console.log(e===marker);}",0,"","true\ntrue\n"],
    ["find-metadata","let p=Array.prototype; console.log(p.find.length,p.findIndex.length,p.findLast.length,p.findLastIndex.length,Object.keys(p).length);",0,"","1 1 1 1 0\n"],
    ["iteration-map-basic", "let a=[1,,3]; let b=a.map(function(x,i,o){return x+i+o.length;}); console.log(b.join(','),b.length,1 in b,a.join(','),b!==a);", 0, "", "4,,8 3 false 1,,3 true\n"],
    ["iteration-foreach-basic", "let s=''; let a=[1,,3]; console.log(a.forEach(function(x,i,o){s+=i+':'+x+':'+(o===a)+';';return false;}),s);", 0, "", "undefined 0:1:true;2:3:true;\n"],
    ["iteration-thisarg", "let o={n:7}; console.log([1,2].map(function(x){return this.n+x;},o).join(',')); let s=0; [1,2].forEach(function(x){s+=this.n+x;},o); console.log(s);", 0, "", "8,9\n17\n"],
    ["iteration-string", "console.log(Array.prototype.map.call('abc',function(x,i,o){return x+i+':'+typeof o;}).join(',')); let s=''; Array.prototype.forEach.call('ab',function(x){s+=x;}); console.log(s);", 0, "", "a0:object,b1:object,c2:object\nab\n"],
    ["iteration-inherited", "Array.prototype[1]=7; let a=[1,,3]; let b=a.map(function(x){return x*2;}); console.log(b.join(','),Object.hasOwn(b,'1')); let n=0; a.forEach(function(x){n+=x;}); console.log(n);", 0, "", "2,14,6 true\n11\n"],
    ["iteration-mutation", "let o={0:1,2:3,length:3}; let a=Array.prototype.map.call(o,function(x,i){if(i===0){delete o[2];o[1]=5;o[3]=9;o.length=0;}return x*2;}); console.log(a.join(','),a.length,2 in a,o.length);", 0, "", "2,10, 3 false 0\n"],
    ["iteration-foreach-mutation", "let o={0:1,2:3,length:3}; let s=''; Array.prototype.forEach.call(o,function(x,i){s+=i+':'+x+';';if(i===0){delete o[2];o[1]=5;o[3]=9;o.length=0;}}); console.log(s);", 0, "", "0:1;1:5;\n"],
    ["iteration-constructor-order", "let a=[]; Object.defineProperty(a,'constructor',{get:function(){throw a;}}); try{a.map(0);}catch(e){console.log(e.name);} try{a.map(function(){});}catch(e){console.log(e===a);} console.log(a.forEach(function(){}));", 0, "", "TypeError\ntrue\nundefined\n"],
    ["iteration-length-order", "let o={}; Object.defineProperty(o,'length',{get:function(){console.log('length');throw 7;}}); try{Array.prototype.map.call(o,0);}catch(e){console.log(e);} try{Array.prototype.forEach.call(o,0);}catch(e){console.log(e);}", 0, "", "length\n7\nlength\n7\n"],
    ["iteration-map-range", "try{Array.prototype.map.call({length:Infinity},function(){});}catch(e){console.log(e.name);} try{Array.prototype.map.call({length:Infinity},0);}catch(e){console.log(e.name);}", 0, "", "RangeError\nTypeError\n"],
    ["iteration-empty-validation", "try{[].map();}catch(e){console.log(e.name);} try{[].forEach();}catch(e){console.log(e.name);} console.log([].map(function(){throw 7;}).length,[].forEach(function(){throw 7;}));", 0, "", "TypeError\nTypeError\n0 undefined\n"],
    ["iteration-metadata", "console.log(Array.prototype.map.name,Array.prototype.map.length,Array.prototype.forEach.name,Array.prototype.forEach.length,Object.keys(Array.prototype).length);", 0, "", "map 1 forEach 1 0\n"],
    ["descriptor-defaults", "let o={}; console.log(Object.defineProperty(o,'x',{value:7})===o); let d=Object.getOwnPropertyDescriptor(o,'x'); console.log(d.value,d.writable,d.enumerable,d.configurable,Object.keys(d).join(','));", 0, "", "true\n7 false false false value,writable,enumerable,configurable\n"],
    ["descriptor-accessors", "let o={n:3}; let calls=0; function get(){calls++;return this.n;} function set(v){this.n=v;} Object.defineProperty(o,'x',{get:get,set:set,configurable:true}); let d=Object.getOwnPropertyDescriptor(o,'x'); console.log(calls,d.get===get,d.set===set,Object.keys(d).join(',')); o.x=9; console.log(o.x,calls,o.n);", 0, "", "0 true true get,set,enumerable,configurable\n9 1 9\n"],
    ["descriptor-preserve-absent", "let o={x:7}; Object.defineProperty(o,'x',{enumerable:false}); let d=Object.getOwnPropertyDescriptor(o,'x'); console.log(d.value,d.writable,d.enumerable,d.configurable); Object.defineProperty(o,'x',{value:undefined}); console.log(o.x,Object.hasOwn(o,'x'));", 0, "", "7 true false true\nundefined true\n"],
    ["descriptor-string", "let d=Object.getOwnPropertyDescriptor('abc','1'); console.log(d.value,d.writable,d.enumerable,d.configurable,Object.getOwnPropertyDescriptor('abc','length').value); let s=new String('a'); console.log(Object.defineProperty(s,'0',{value:'a'})===s); try{Object.defineProperty(s,'0',{value:'b'});}catch(e){console.log(e.name);}", 0, "", "b false true false 3\ntrue\nTypeError\n"],
    ["descriptor-array-rollback", "let a=[0,1,2,3]; Object.defineProperty(a,'1',{configurable:false}); try{Object.defineProperty(a,'length',{value:0,writable:false});}catch(e){console.log(e.name);} console.log(a.length,0 in a,1 in a,2 in a,3 in a,Object.getOwnPropertyDescriptor(a,'length').writable);", 0, "", "TypeError\n2 true true false false false\n"],
    ["descriptor-fixed-samevalue", "let o={}; Object.defineProperty(o,'x',{value:NaN}); console.log(Object.defineProperty(o,'x',{value:NaN})===o); Object.defineProperty(o,'z',{value:-0}); try{Object.defineProperty(o,'z',{value:0});}catch(e){console.log(e.name);} console.log(1/o.z);", 0, "", "true\nTypeError\n-Infinity\n"],
    ["descriptor-invalid", "try{Object.defineProperty(1,'x',{});}catch(e){console.log(e.name);} try{Object.defineProperty({},'x');}catch(e){console.log(e.name);} try{Object.defineProperty({},'x',{get:null});}catch(e){console.log(e.name);} try{Object.defineProperty({},'x',{value:undefined,get:undefined});}catch(e){console.log(e.name);}", 0, "", "TypeError\nTypeError\nTypeError\nTypeError\n"],
    ["descriptor-function", "function f(x){} function attrs(){} attrs.value=9; Object.defineProperty(f,'x',attrs); console.log(f.x,Object.getOwnPropertyDescriptor(f,'length').value);", 0, "", "9 1\n"],
    ["descriptor-missing", "console.log(Object.getOwnPropertyDescriptor({},'x'),Object.getOwnPropertyDescriptor({undefined:7}).value,Object.getOwnPropertyDescriptor(3,'x'));", 0, "", "undefined 7 undefined\n"],
    ["descriptor-metadata", "console.log(Object.defineProperty.name,Object.defineProperty.length,Object.getOwnPropertyDescriptor.name,Object.getOwnPropertyDescriptor.length,Object.keys(Object).length);", 0, "", "defineProperty 3 getOwnPropertyDescriptor 2 0\n"],
    ["json-primitives","console.log(JSON.parse('null'),JSON.parse('true'),JSON.parse('false'),1/JSON.parse('-0'),JSON.parse('1.25e2'));",0,"","null true false -Infinity 125\n"],
    ["json-nested","let o=JSON.parse('{\"a\":[1,null,{\"b\":true}],\"empty\":{},\"list\":[]}');console.log(o.a.length,o.a[1],o.a[2].b,Object.keys(o.empty).length,o.list.length);",0,"","3 null true 0 0\n"],
    ["json-duplicates","let o=JSON.parse('{\"x\":1,\"y\":2,\"x\":3,\"__proto__\":4}');console.log(o.x,Object.keys(o).join(','),o.__proto__,Object.hasOwn(o,'__proto__'));",0,"","3 x,y,__proto__ 4 true\n"],
    ["json-coercion","console.log(JSON.parse(7),JSON.parse(null),JSON.parse(true),JSON.parse({toString:function(){return '[3]';}})[0],JSON.parse('2',false));",0,"","7 null true 3 2\n"],
    ["json-invalid","try{JSON.parse('[1,]');}catch(e){console.log(e.name);}try{JSON.parse('01');}catch(e){console.log(e.name);}try{JSON.parse();}catch(e){console.log(e.name);}",0,"","SyntaxError\nSyntaxError\nSyntaxError\n"],
    ["json-metadata","let d=Object.getOwnPropertyDescriptor(JSON,'parse');console.log(d.value.name,d.value.length,d.writable,d.enumerable,d.configurable,Object.prototype.toString.call(JSON));",0,"","parse 2 true false true [object JSON]\n"],
    ["sort-basic","let a=[10,9,2,1];console.log(a.sort()===a,a.join(','));console.log(a.sort(function(a,b){return a-b;}).join(','),a.sort(function(a,b){return b-a;}).join(','));",0,"","true 1,10,2,9\n1,2,9,10 10,9,2,1\n"],
    ["sort-holes","let a=[undefined,,3,1,undefined,,];let calls=0;a.sort(function(a,b){calls=calls+1;return a-b;});console.log(a.length,a[0],a[1],a[2],a[3],4 in a,5 in a,calls);",0,"","6 1 3 undefined undefined false false 1\n"],
    ["sort-stability","let a=[{n:1,id:'a'},{n:0,id:'b'},{n:1,id:'c'},{n:0,id:'d'}];a.sort(function(a,b){return a.n-b.n;});console.log(a[0].id+a[1].id+a[2].id+a[3].id);let b=[3,1,2];console.log(b.sort(function(){return NaN;}).join(','));",0,"","bdac\n3,1,2\n"],
    ["sort-generic","let o={length:4,0:3,2:1};console.log(Array.prototype.sort.call(o)===o,o[0],o[1],2 in o,3 in o,o.length);try{Array.prototype.sort.call('a');}catch(e){console.log(e.name);}",0,"","true 1 3 false false 4\nTypeError\n"],
    ["sort-order","let log='';let a={toString:function(){log=log+'L';return 'b';}};let b={toString:function(){log=log+'R';return 'a';}};let input=[a,b];console.log(input.sort()[0]===b,log);let o={};Object.defineProperty(o,'length',{get:function(){throw 'length';}});try{[].sort.call(o,0);}catch(e){console.log(e.name);}try{[].sort.call(o);}catch(e){console.log(e);}",0,"","true LR\nTypeError\nlength\n"],
    ["sort-effects","let a=[3,1,2];a.sort(function(x,y){a[0]=99;return x-y;});console.log(a.join(','));let marker={};try{a.sort(function(){return {valueOf:function(){throw marker;}};});}catch(e){console.log(e===marker);}",0,"","1,2,3\ntrue\n"],
    ["sort-undefined","let a=[undefined,2,undefined];console.log(a.sort(function(){throw 7;}).join(','));let b=[2,1];Object.defineProperty(b,'constructor',{get:function(){throw 7;}});console.log(b.sort().join(','));",0,"","2,,\n1,2\n"],
    ["sort-metadata","let d=Object.getOwnPropertyDescriptor(Array.prototype,'sort');console.log(d.value.name,d.value.length,d.writable,d.enumerable,d.configurable);",0,"","sort 1 true false true\n"],
    ["filter-basic","let a=[1,2,3,4];let b=a.filter(function(v){return v%2===0;});console.log(b.join(','),a.join(','),b!==a,[].filter(function(){throw 7;}).length);",0,"","2,4 1,2,3,4 true 0\n"],
    ["filter-holes","let seen='';let b=[,1,,3].filter(function(v,i,a){seen=seen+i+':'+a.length+';';return true;});console.log(seen,b.join(','),b.length,0 in b,1 in b);",0,"","1:4;3:4; 1,3 2 true true\n"],
    ["filter-generic","console.log(Array.prototype.filter.call('abc',function(v){return v!=='b';}).join(','),Array.prototype.filter.call({0:'a',2:'c',length:3.9},function(){return true;}).join(','));",0,"","a,c a,c\n"],
    ["filter-this","let receiver={n:2};let b=[1,2,3].filter(function(v){'use strict';return v>=this.n;},receiver);console.log(b.join(','),[1].filter(function(){'use strict';return this===undefined;}).length);",0,"","2,3 1\n"],
    ["filter-order","let marker={};let o={};Object.defineProperty(o,'length',{get:function(){throw marker;}});try{[].filter.call(o);}catch(e){console.log(e===marker);}let a=[];Object.defineProperty(a,'constructor',{get:function(){throw marker;}});try{a.filter(0);}catch(e){console.log(e.name);}try{a.filter(function(){});}catch(e){console.log(e===marker);}",0,"","true\nTypeError\ntrue\n"],
    ["filter-throws","let marker={};try{[1].filter(function(){throw marker;});}catch(e){console.log(e===marker);}try{Array.prototype.filter.call(null,function(){});}catch(e){console.log(e.name);}",0,"","true\nTypeError\n"],
    ["filter-metadata","let d=Object.getOwnPropertyDescriptor(Array.prototype,'filter');console.log(d.value.name,d.value.length,d.writable,d.enumerable,d.configurable);",0,"","filter 1 true false true\n"],
    ["concat-basic","let a=[1,2];let b=a.concat([3,4],5,[6]);console.log(b.join(','),a.join(','),b.length,b!==a);",0,"","1,2,3,4,5,6 1,2 6 true\n"],
    ["concat-holes","let a=[,1];let b=a.concat([,,],3);console.log(b.length,0 in b,b[1],2 in b,3 in b,b[4]);",0,"","5 false 1 false false 3\n"],
    ["concat-objects","let o={0:7,length:1};let a=[].concat(o,[o],null,undefined);console.log(a.length,a[0]===o,a[1]===o,a[2],a[3]);",0,"","4 true true null undefined\n"],
    ["concat-generic","let o={length:2,0:7};let a=Array.prototype.concat.call(o,8);let b=Array.prototype.concat.call('ab','cd');console.log(a.length,a[0]===o,a[1],b.length,typeof b[0],b[0].valueOf(),b[1]);",0,"","2 true 8 2 object ab cd\n"],
    ["concat-species-order","let a=[1];let log='';Object.defineProperty(a,'constructor',{get:function(){log='c';a[1]=7;return undefined;}});let b=a.concat(9);console.log(log,b.join(','),a.join(','));",0,"","c 1,7,9 1,7\n"],
    ["concat-errors","try{Array.prototype.concat.call(null);}catch(e){console.log(e.name);}let a=[];a.constructor=7;try{a.concat();}catch(e){console.log(e.name);}",0,"","TypeError\nTypeError\n"],
    ["concat-metadata","let d=Object.getOwnPropertyDescriptor(Array.prototype,'concat');console.log(d.value.name,d.value.length,d.writable,d.enumerable,d.configurable);",0,"","concat 1 true false true\n"],
    ["slice-basic","let a=[1,2,3,4];console.log(a.slice(1,3).join(','),a.slice(-2).join(','),a.slice().join(','),a.join(','));",0,"","2,3 3,4 1,2,3,4 1,2,3,4\n"],
    ["slice-limits","let a=[1,2,3];console.log(a.slice(-1.9).join(','),a.slice(0,NaN).length,a.slice(0,undefined).length,a.slice(Infinity).length,a.slice(-Infinity,Infinity).join(','),a.slice(2,1).length);",0,"","3 0 3 0 1,2,3 0\n"],
    ["slice-generic","let a=Array.prototype.slice.call('abc',1);console.log(a.join(','),a.length,Array.prototype.slice.call({length:2,1:'x',constructor:7}).join(','));",0,"","b,c 2 ,x\n"],
    ["slice-holes","let a=[,1,,3];let b=a.slice(0,3);console.log(b.length,0 in b,b[1],2 in b,a.length);",0,"","3 false 1 false 4\n"],
    ["slice-order","let log='';let a=[1,2,3];Object.defineProperty(a,'constructor',{get:function(){log=log+'c';return undefined;}});let start={valueOf:function(){log=log+'s';a[1]=7;return 1;}};let end={valueOf:function(){log=log+'e';a.length=2;return 3;}};let b=a.slice(start,end);console.log(log,b.length,b[0],1 in b);",0,"","sec 2 7 false\n"],
    ["slice-errors","try{Array.prototype.slice.call(undefined);}catch(e){console.log(e.name);}let a=[1];a.constructor=7;try{a.slice(0,0);}catch(e){console.log(e.name);}",0,"","TypeError\nTypeError\n"],
    ["slice-metadata","let d=Object.getOwnPropertyDescriptor(Array.prototype,'slice');let o={};console.log(d.value.name,d.value.length,d.writable,d.enumerable,d.configurable,[o].slice()[0]===o);",0,"","slice 2 true false true true\n"],
    ["splice-basic","let a=[1,2,3,4]; let d=a.splice(1,2,7); console.log(a.join(','),d.join(','),d.length);",0,"","1,7,4 2,3 2\n"],
    ["splice-omission","let a=[1,2,3]; console.log(a.splice().length,a.length,a.splice(1,undefined).length,a.length,a.splice(1).join(','),a.join(','));",0,"","0 3 0 3 2,3 1\n"],
    ["splice-coercion","let a=[1,2,3,4]; console.log(a.splice(-2.8,1.9,7,8).join(','),a.join(',')); console.log(a.splice(-Infinity,NaN).length,a.splice(Infinity,99,9).length,a.join(','));",0,"","3 1,2,7,8,4\n0 0 1,2,7,8,4,9\n"],
    ["splice-holes","let a=[1,,3,,5]; let d=a.splice(1,3); console.log(d.length,0 in d,1 in d,2 in d,d[1],a.join(','));",0,"","3 false true false 3 1,5\n"],
    ["splice-generic","let o={0:'a',2:'c',length:3.8,constructor:7}; let d=Array.prototype.splice.call(o,1,1,'x','y'); console.log(d.length,0 in d,o[0],o[1],o[2],o[3],o.length);",0,"","1 false a x y c 4\n"],
    ["splice-errors","try{[].splice.call(null);}catch(e){console.log(e.name);} try{[].splice.call('ab',0,1);}catch(e){console.log(e.name);} let a=[1]; a.constructor=7; try{a.splice();}catch(e){console.log(e.name,a.length);}",0,"","TypeError\nTypeError\nTypeError 1\n"],
    ["splice-order","let log=''; let a=[1,2,3]; let start={valueOf:function(){log=log+'s';a[1]=7;return 1;}}; let count={valueOf:function(){log=log+'d';a[2]=8;return 1;}}; console.log(a.splice(start,count).join(','),a.join(','),log);",0,"","7 1,8 sd\n"],
    ["splice-metadata","let d=Object.getOwnPropertyDescriptor(Array.prototype,'splice'); console.log(d.value.name,d.value.length,d.writable,d.enumerable,d.configurable);",0,"","splice 2 true false true\n"],
    ["front-basic", "let a=[1,2,3]; console.log(a.shift(),a.join(','),a.unshift(7,9),a.join(','));", 0, "", "1 2,3 4 7,9,2,3\n"],
    ["front-empty", "let a=[]; console.log(a.shift(),a.length,a.unshift(),a.unshift(7),a.shift(),a.length);", 0, "", "undefined 0 0 1 7 0\n"],
    ["front-holes", "let a=[1,,3]; console.log(a.shift(),a.length,0 in a,1 in a); console.log(a.unshift(7),a.length,0 in a,1 in a,2 in a,a.join(','));", 0, "", "1 2 false true\n3 3 true false true 7,,3\n"],
    ["front-generic", "let o={0:'a',1:'b',length:2.9}; console.log(Array.prototype.shift.call(o),o[0],o.length,1 in o); console.log(Array.prototype.unshift.call(o,'x','y'),o[0],o[1],o[2],o.length);", 0, "", "a b 1 false\n3 x y b 3\n"],
    ["front-string-errors", "try{Array.prototype.shift.call('ab');}catch(e){console.log(e.name);} try{Array.prototype.unshift.call('');}catch(e){console.log(e.name);}", 0, "", "TypeError\nTypeError\n"],
    ["front-nullish-errors", "try{Array.prototype.shift.call(null);}catch(e){console.log(e.name);} try{Array.prototype.unshift.call(undefined,1);}catch(e){console.log(e.name);}", 0, "", "TypeError\nTypeError\n"],
    ["front-identity", "let o={}; let a=[o]; console.log(a.shift()===o,a.unshift(o),a[0]===o,a.unshift(),a[0]===o);", 0, "", "true 1 true 1 true\n"],
    ["front-metadata", "console.log(Array.prototype.shift.name,Array.prototype.shift.length,Array.prototype.unshift.name,Array.prototype.unshift.length,Object.keys(Array.prototype).length);", 0, "", "shift 0 unshift 1 0\n"],
    ["reduce-basic", "function sum(a,b){return a+b;} console.log([1,2,3].reduce(sum),[1,2,3].reduce(sum,10),[1,2,3].reduceRight(sum),[1,2,3].reduceRight(sum,10));", 0, "", "6 16 6 16\n"],
    ["reduce-order", "function f(a,b,i){return a+i+':'+b+';';} console.log([1,2,3].reduce(f,''),[1,2,3].reduceRight(f,''));", 0, "", "0:1;1:2;2:3; 2:3;1:2;0:1;\n"],
    ["reduce-empty", "function f(){throw 'bad';} console.log([].reduce(f,42),[].reduceRight(f,undefined),[7].reduce(f),[8].reduceRight(f));", 0, "", "42 undefined 7 8\n"],
    ["reduce-missing-initial", "function f(a,b){return b;} try{[].reduce(f);}catch(e){console.log(e.name);} try{Array(3).reduceRight(f);}catch(e){console.log(e.name);}", 0, "", "TypeError\nTypeError\n"],
    ["reduce-holes", "function f(a,b){return a+b;} console.log([,2,,3].reduce(f),[,2,,3].reduceRight(f));", 0, "", "5 5\n"],
    ["reduce-explicit-undefined", "console.log([3].reduce(function(a,b){return typeof a+':'+b;},undefined),[3].reduceRight(function(a,b){return typeof a+':'+b;},undefined));", 0, "", "undefined:3 undefined:3\n"],
    ["reduce-generic", "function f(a,b){return a+b;} console.log(Array.prototype.reduce.call('abc',f,''),Array.prototype.reduceRight.call({length:3,0:'a',2:'c'},f,''));", 0, "", "abc ca\n"],
    ["reduce-invalid-callback", "try{[].reduce();}catch(e){console.log(e.name);} try{[].reduceRight(0,7);}catch(e){console.log(e.name);}", 0, "", "TypeError\nTypeError\n"],
    ["reduce-this", "var marker=7; console.log([1].reduce(function(){'use strict';return this;},0),[1].reduceRight(function(){return this.marker;},0));", 0, "", "undefined 7\n"],
    ["reduce-metadata", "console.log(Array.prototype.reduce.name,Array.prototype.reduce.length,Array.prototype.reduceRight.name,Array.prototype.reduceRight.length,Object.keys(Array.prototype).length);", 0, "", "reduce 1 reduceRight 1 0\n"],
    ["array-at-basic", "let a=[10,20,30]; console.log(a.at(),a.at(1),a.at(-1),a.at(-3),a.at(3),a.at(-4));", 0, "", "10 20 30 10 undefined undefined\n"],
    ["array-at-conversion", "let a=[10,20,30]; console.log(a.at('1'),a.at(1.9),a.at(-1.9),a.at(NaN),a.at(-0),a.at(Infinity),a.at(-Infinity));", 0, "", "20 20 30 10 10 undefined undefined\n"],
    ["array-at-generic", "console.log(Array.prototype.at.call('abc',-1),Array.prototype.at.call({length:2,1:7},-1),Array.prototype.at.call(true,0));", 0, "", "c 7 undefined\n"],
    ["array-at-holes", "let a=[,undefined]; console.log(a.at(0),a.at(1),[].at(0));", 0, "", "undefined undefined undefined\n"],
    ["array-at-empty-converts", "let k={valueOf:function(){console.log('index');return 0;}}; console.log([].at(k));", 0, "", "index\nundefined\n"],
    ["array-at-nullish", "let k={valueOf:function(){console.log('bad');return 0;}}; try{Array.prototype.at.call(null,k);}catch(e){console.log(e.name);}", 0, "", "TypeError\n"],
    ["array-at-metadata", "console.log(Array.prototype.at.name,Array.prototype.at.length,Object.keys(Array.prototype).length);", 0, "", "at 1 0\n"],
    ["enumeration-order", "let o={b:4,10:10,2:2,a:1}; console.log(Object.keys(o).join(','),Object.values(o).join(','));", 0, "", "2,10,b,a 2,10,4,1\n"],
    ["enumeration-entries", "let o={x:{},y:undefined}; let a=Object.entries(o); console.log(Array.isArray(a),Array.isArray(a[0]),a.length,a[0][0],a[0][1]===o.x,a[1][0],a[1].length,1 in a[1]);", 0, "", "true true 2 x true y 2 true\n"],
    ["enumeration-strings", "console.log(Object.keys('abc').join(','),Object.values('abc').join(','),Object.entries('ab').join(';'));", 0, "", "0,1,2 a,b,c 0,a;1,b\n"],
    ["enumeration-array-holes", "let a=[,undefined,3]; a.x=4; console.log(Object.keys(a).join(','),Object.values(a).join(','));", 0, "", "1,2,x ,3,4\n"],
    ["enumeration-primitives", "console.log(Object.keys(3).length,Object.values(true).length,Object.entries('').length);", 0, "", "0 0 0\n"],
    ["enumeration-nullish", "try{Object.keys();}catch(e){console.log(e.name);} try{Object.values(null);}catch(e){console.log(e.name);} try{Object.entries(undefined);}catch(e){console.log(e.name);}", 0, "", "TypeError\nTypeError\nTypeError\n"],
    ["enumeration-fresh", "let a=Object.entries({x:1,y:2}); console.log(a!==Object.entries({x:1,y:2}),a[0]!==a[1],Object.keys({})!==Object.keys({}),Object.keys(Object).length);", 0, "", "true true true 0\n"],
    ["enumeration-metadata", "console.log(Object.keys.name,Object.keys.length,Object.values.name,Object.values.length,Object.entries.name,Object.entries.length);", 0, "", "keys 1 values 1 entries 1\n"],
    ["own-properties", "let o={x:undefined}; console.log(o.hasOwnProperty('x'),Object.hasOwn(o,'x'),o.hasOwnProperty('toString'),Object.hasOwn(o,'missing'));", 0, "", "true true false false\n"],
    ["own-holes", "let a=[,undefined]; console.log(a.hasOwnProperty(0),Object.hasOwn(a,1),a.hasOwnProperty('length'),Object.hasOwn(a,'push'));", 0, "", "false true true false\n"],
    ["own-strings", "console.log('abc'.hasOwnProperty(1),Object.hasOwn('abc','length'),Object.hasOwn('abc',3));", 0, "", "true true false\n"],
    ["own-missing-key", "let o={undefined:1}; console.log(o.hasOwnProperty(),Object.hasOwn(o));", 0, "", "true true\n"],
    ["own-shadowed-method", "let o={hasOwnProperty:0}; console.log(Object.hasOwn(o,'hasOwnProperty'),Object.prototype.hasOwnProperty.call(o,'hasOwnProperty'));", 0, "", "true true\n"],
    ["own-key-order", "let s=''; let k={toString:function(){s+='K';return 'x';}}; try{Object.hasOwn(null,k);}catch(e){s+='S';} try{Object.prototype.hasOwnProperty.call(null,k);}catch(e){s+='P';} console.log(s);", 0, "", "SKP\n"],
    ["own-key-coercion", "let o={}; let k={toString:function(){o.x=1;return 'x';}}; console.log(Object.hasOwn(o,k));", 0, "", "true\n"],
    ["own-metadata", "console.log(Object.hasOwn.name,Object.hasOwn.length,Object.prototype.hasOwnProperty.name,Object.prototype.hasOwnProperty.length);", 0, "", "hasOwn 2 hasOwnProperty 1\n"],
    ["array-empty", "console.log(Array().length,(new Array()).length,Array.isArray(Array()),Array.isArray(new Array()));", 0, "", "0 0 true true\n"],
    ["array-holes", "let a=Array(3); let b=new Array(3); console.log(a.length,b.length,0 in a,2 in b,a.join('-'));", 0, "", "3 3 false false --\n"],
    ["array-length-limits", "console.log(Array(-0).length,Array(4294967295).length);", 0, "", "0 4294967295\n"],
    ["array-invalid-length", "try { Array(1.5); } catch(e) { console.log(e.name); } try { new Array(-1); } catch(e) { console.log(e.name); }", 0, "", "RangeError\nRangeError\n"],
    ["array-single-element", "let a=Array('3'); let b=new Array(undefined); console.log(a.length,a[0],b.length,0 in b);", 0, "", "1 3 1 true\n"],
    ["array-elements", "let o={}; let a=Array(o,undefined,3); console.log(a.length,a[0]===o,1 in a,a[2]);", 0, "", "3 true true 3\n"],
    ["array-no-coercion", "let o={valueOf:function(){throw 'bad';},toString:function(){throw 'bad';}}; console.log(Array(o)[0]===o,Array.isArray(o));", 0, "", "true false\n"],
    ["array-brand", "console.log(Array.isArray(),Array.isArray(null),Array.isArray({length:0,push:function(){}}),Array.isArray([]),Array.isArray(Array.prototype));", 0, "", "false false false true true\n"],
    ["array-metadata", "console.log(Array.name,Array.length,Array.isArray.name,Array.isArray.length,Array.prototype.constructor===Array,Array() instanceof Array);", 0, "", "Array 1 isArray 1 true true\n"],
    ["delete-success", "let o={x:1}; console.log(delete o.x, o.x);", 0, "", "true undefined\n"],
    ["delete-identifier", "'use strict';\nconsole.log('no'); delete x;", 2, "2:20: parse SyntaxError: delete of an identifier is not allowed"],
    ["delete-fixed", "'use strict';\ndelete Number.NaN;", 1, "2:1: runtime TypeError: property is not configurable: NaN"],
    ["delete-null", "delete null.x;", 1, "1:8: runtime TypeError: cannot convert null or undefined to object"],
    ["duplicate", "let x; let x;", 2, "parse SyntaxError: duplicate-lexical: x"],
    ["duplicate-param", "function f(x,x) {}", 0, ""],
    ["param-let", "function f(x) { let x; }", 2, "parse SyntaxError: formal-lexical: x"],
    ["const", "const x = 1;", 0, ""],
    ["increment", "let x=1; console.log(x++ + 2, x);", 0, "", "3 2\n"],
    ["updates-basic", "let x=5; console.log(++x,x++,--x,x--,x);", 0, "", "6 6 6 6 5\n"],
    ["updates-coercion", "let x='5'; let y=null; let z; console.log(--x,x,++y,y,z--,z);", 0, "", "4 4 1 1 NaN NaN\n"],
    ["updates-zero", "let x=-0; console.log(1/x--,x); let y=-0; console.log(++y,y);", 0, "", "-Infinity -1\n1 1\n"],
    ["updates-precedence", "let x=3; console.log(-x-- + ++x * 2,x,typeof --x,x);", 0, "", "3 3 number 2\n"],
    ["updates-sloppy-write", "let o='abc'; console.log(--o.length,o.length,o.length--,o.length);", 0, "", "2 3 3 3\n"],
    ["updates-strict-write", "'use strict'; let o='abc'; --o.length;", 1, "runtime TypeError: property is not writable: length"],
    ["updates-prefix-newline", "let x=2; console.log(++\nx,--\nx);", 0, "", "3 2\n"],
    ["updates-invalid-prefix", "console.log('no'); ++(1+2);", 2, "parse SyntaxError: invalid update target"],
    ["updates-invalid-postfix", "console.log('no'); (1+2)--;", 2, "parse SyntaxError: invalid decrement target"],
    ["updates-postfix-newline", "let x=2; x\n--;", 2, "parse SyntaxError: unsupported or unexpected syntax: ;"],
    ["boolean-call", "console.log(Boolean(),Boolean(undefined),Boolean(null),Boolean(false),Boolean(0),Boolean(-0),Boolean(NaN),Boolean(''));", 0, "", "false false false false false false false false\n"],
    ["boolean-truthy", "console.log(Boolean(1),Boolean(-1),Boolean(Infinity),Boolean('false'),Boolean({}),Boolean([]),Boolean(new Boolean(false)));", 0, "", "true true true true true true true\n"],
    ["boolean-construct", "let b=new Boolean(false); console.log(typeof b,b.valueOf(),b.toString(),b instanceof Boolean,b.constructor===Boolean,b.value);", 0, "", "object false false true true undefined\n"],
    ["boolean-prototype", "console.log(Boolean.prototype.valueOf(),Boolean.prototype.toString(),Boolean.name,Boolean.length,Boolean.prototype.constructor===Boolean);", 0, "", "false false Boolean 1 true\n"],
    ["boolean-no-coercion", "let x={valueOf:function(){throw 'bad';},toString:function(){throw 'bad';}}; console.log(Boolean(x),(new Boolean(x)).valueOf());", 0, "", "true true\n"],
    ["boolean-extra-arguments", "function effect(){console.log('effect');return 1;} console.log(Boolean(0,effect()),(new Boolean('',effect())).valueOf());", 0, "", "effect\neffect\nfalse false\n"],
    ["boolean-borrowed-call", "console.log(Boolean.call(null,''),Boolean.call({},'x'));", 0, "", "false true\n"],
    ["boolean-brand", "try{Boolean.prototype.valueOf.call({});}catch(e){console.log(e.name);} console.log(Boolean.prototype.valueOf.call(true));", 0, "", "TypeError\ntrue\n"],
    ["assignment-target", "1 = 2;", 2, "parse SyntaxError: invalid numeric assignment target"],
    ["break", "break;", 2, "parse SyntaxError: break outside loop"],
    ["continue", "continue;", 2, "parse SyntaxError: continue outside loop"],
    ["return", "return 1;", 2, "parse SyntaxError: return outside function"],
    ["cross-function-break", "while(true) { function f() { break; } }", 2, "parse SyntaxError: break outside loop"],
    ["asi", "let x = 1\nconsole.log(x);", 0, "", "1\n"],
    ["newline-return", "function f() { return\n 1; }", 0, "", ""],
    ["newline-throw", "throw\n1;", 2, "parse SyntaxError: newline after return/throw is unsupported"],
    ["string", "'unterminated", 2, "parse SyntaxError: unterminated string"],
    ["comment", "/* unterminated", 2, "parse SyntaxError: unterminated comment"],
    ["number", "console.log(01);", 2, "parse SyntaxError: leading-zero numbers are unsupported"],
    ["exponent", "console.log(1e2);", 0, "", "100\n"],
    ["proto", "let o={__proto__: null};", 2, "parse SyntaxError: prototype literal syntax is unsupported"],
    ["coercion", "console.log(1 + '2');", 0, "", "12\n"],
    ["primitive-base", "console.log(null.x);", 1, "runtime TypeError: cannot convert null or undefined to object"],
    ["detached", "'use strict'; let o={x:1, f:function(){return this.x;}}; let f=o.f; f();", 1, "runtime TypeError: cannot convert null or undefined to object"],
    ["assignment-missing", "'use strict'; missing=1;", 1, "runtime ReferenceError: missing is not defined"],
    ["self-tdz", "let x=x;", 1, "runtime ReferenceError: x is not initialized"],
    ["readonly", "'use strict'; undefined=1;", 1, "runtime TypeError: property is not writable: undefined"],
    ["not-callable", "let x=1; x(console.log('arg'));", 1, "runtime TypeError: value is not callable", "arg\n"],
    ["abrupt-args", "function f(a,b) {} f(missing,console.log('no'));", 1, "runtime ReferenceError: missing is not defined"],
    ["parse-before-execute", "console.log('no'); const x=1;", 0, "", "no\n"],
    ["const-parse-before-execute", "console.log('no'); const x;", 2, "parse SyntaxError: const requires an initializer"],
    ["syntax-depth", "(".repeat(200) + "1" + ")".repeat(200) + ";", 2, "parse SyntaxError: syntax nesting limit exceeded"],
    ["eval-depth", "1" + "+1".repeat(1000) + ";", 1, "runtime RangeError: evaluation nesting limit exceeded"],
    ["source-limit", " ".repeat(100001), 2, "parse SyntaxError: source exceeds 100000 UTF-16 units"],
    ["string-operator", "1 '+' 2;", 2, "parse SyntaxError: expected ';'"],
    ["nested-call-blocks", "function f() {" + "{".repeat(50) + "f();" + "}".repeat(50) + "} f();", 1, "runtime RangeError: evaluation nesting limit exceeded"],
];
mkdirSync(join(root, "build/guest-fixtures"), { recursive: true });
for (const [name, source, status, errorContains, stdout = ""] of generated) {
    const file = "build/guest-fixtures/" + name + ".js";
    writeFileSync(join(root, file), source);
    cases.push({ file, status, errorContains, stdout });
}
function lineCase(name, source, expected) {
    const file = "build/guest-fixtures/" + name + ".js";
    writeFileSync(join(root, file), source);
    cases.push({ file, ...expected });
}
lineCase("string-char-at", "console.log('abc'.charAt(),'abc'.charAt(1.9),'abc'.charAt(-0.9),'abc'.charAt(NaN),'abc'.charAt(-1).length,'abc'.charAt(Infinity).length);", {stdout:"a b a a 0 0\n"});
lineCase("string-char-code", "console.log('abc'.charCodeAt(),'abc'.charCodeAt(1.9),'abc'.charCodeAt(-0.9),Number.isNaN('abc'.charCodeAt(3)),Number.isNaN(''.charCodeAt()));", {stdout:"97 98 97 true true\n"});
lineCase("string-utf16-methods", "let s='A😀Z'; console.log(s.charCodeAt(0),s.charCodeAt(1),s.charCodeAt(2),s.charCodeAt(3),s.slice(1,3)==='😀',s.slice(1,2).charCodeAt(0),s.charAt(2).charCodeAt(0));", {stdout:"65 55357 56832 90 true 55357 56832\n"});
lineCase("string-slice-bounds", "let s='abcdef'; console.log(s.slice(),s.slice(1,-1),s.slice(-2),s.slice(4,1).length,s.slice(Infinity).length,s.slice(-Infinity,Infinity),s.slice(-0.9,2.9));", {stdout:"abcdef bcde ef 0 0 abcdef ab\n"});
lineCase("string-slice-end", "console.log('abc'.slice(1,undefined),'abc'.slice(1,null).length,'abc'.slice(0,NaN).length,'abc'.slice(-99,99));", {stdout:"bc 0 0 abc\n"});
lineCase("string-method-generic", "console.log(''.charAt.call(12345,2),''.charCodeAt.call(true,1),''.slice.call(new String('abc'),1));", {stdout:"3 114 bc\n"});
lineCase("string-method-coercion", "let trace=''; let o={toString:function(){trace+='R';return 'abcd';}}; let start={valueOf:function(){trace+='S';return 1;}}; let end={valueOf:function(){trace+='E';return 3;}}; console.log(''.slice.call(o,start,end),trace);", {stdout:"bc RSE\n"});
lineCase("string-method-errors", "try{''.charAt.call(null);}catch(e){console.log(e.name);} try{''.charCodeAt.call(undefined);}catch(e){console.log(e.name);} try{''.slice.call(null);}catch(e){console.log(e.name);} try{'abc'.slice({valueOf:function(){throw 'start';}});}catch(e){console.log(e);}", {stdout:"TypeError\nTypeError\nTypeError\nstart\n"});
lineCase("string-method-metadata", "console.log(''.charAt.name,''.charAt.length,''.charCodeAt.name,''.charCodeAt.length,''.slice.name,''.slice.length);", {stdout:"charAt 1 charCodeAt 1 slice 2\n"});
lineCase("object-numeric-keys", "let o={0:'zero',12:'twelve',0.50:'half'}; console.log(o[0],o[12],o[0.5],o['0.50']);", {stdout:"zero twelve half undefined\n"});
lineCase("object-numeric-duplicates", "let trace=''; function mark(x){trace+=x;return x;} let o={1:mark('a'),1.0:mark('b'),'1':mark('c')}; console.log(trace,o[1],'1.0' in o);", {stdout:"abc c false\n"});
lineCase("object-numeric-rounding", "let o={9007199254740993:7,9007199254740992:11}; console.log(o['9007199254740992'],o['9007199254740993']);", {stdout:"11 undefined\n"});
lineCase("object-numeric-format", "let o={1000000000000000000000:7,0.0000001:11}; console.log(o['1e+21'],o['1e-7'],o['0.0000001']);", {stdout:"7 11 undefined\n"});
lineCase("object-numeric-zero", "let o={0.0:7,'0.0':11}; console.log(o[0],o[-0],o['0.0']);", {stdout:"7 7 11\n"});
lineCase("object-negative-key", "let o={-1:2};", {status:2,errorContains:"parse SyntaxError: expected literal property name"});
lineCase("object-computed-key", "console.log('no'); let o={[1]:2};", {status:2,errorContains:"parse SyntaxError: expected literal property name"});
lineCase("object-exponent-key", "let o={1e2:7};console.log(o[100]);", {stdout:"7\n"});
lineCase("array-predicate-basic", "function positive(x){return x>0;} console.log([1,2,3].every(positive),[1,-2,3].every(positive),[-1,-2].some(positive),[-1,2].some(positive),[].every(positive),[].some(positive));", {stdout:"true false false true true false\n"});
lineCase("array-predicate-short-circuit", "let a=[]; console.log([1,2,3].every(function(x){a.push(x);return x<2;}),a.join()); a=[]; console.log([1,2,3].some(function(x){a.push(x);return x===2;}),a.join());", {stdout:"false 1,2\ntrue 1,2\n"});
lineCase("array-predicate-holes", "let a=[,undefined,,7]; let seen=[]; console.log(a.every(function(x,i,o){seen.push(i);return o===a;}),seen.join()); seen=[]; console.log(a.some(function(x,i){seen.push(i);return x===7;}),seen.join());", {stdout:"true 1,3\ntrue 1,3\n"});
lineCase("array-predicate-this", "let marker={}; let global=this; console.log([1].every(function(){'use strict';return this===marker;},marker),[1].some(function(){'use strict';return this===undefined;}),[1].every(function(){return this===global;},null),[1].some(function(){'use strict';return this===null;},null));", {stdout:"true true true true\n"});
lineCase("array-predicate-generic", "let seen=''; console.log([].every.call('ab',function(x,i,o){seen+=x+i;return o.valueOf()==='ab';}),seen,[].some.call(7,function(){throw 'no';}));", {stdout:"true a0b1 false\n"});
lineCase("array-predicate-truthiness", "let o={valueOf:function(){throw 'no';}}; console.log([0].every(function(){return o;}),[0].some(function(){return o;}),[0].every(function(){return 0;}),[0].some(function(){return '';}));", {stdout:"true true false false\n"});
lineCase("array-predicate-errors", "try{[].every();}catch(e){console.log(e.name);} try{[].some(7);}catch(e){console.log(e.name);} try{[].every.call(null,function(){});}catch(e){console.log(e.name);} try{[1,2].some(function(){throw 'sentinel';});}catch(e){console.log(e);}", {stdout:"TypeError\nTypeError\nTypeError\nsentinel\n"});
lineCase("array-predicate-metadata", "console.log([].every.name,[].every.length,[].some.name,[].some.length);", {stdout:"every 1 some 1\n"});
lineCase("array-reverse-dense", "let a=[1,2,3,4]; console.log(a.reverse()===a,a.join(),a.length); console.log([1,2,3].reverse().join(),[].reverse().length);", {stdout:"true 4,3,2,1 4\n3,2,1 0\n"});
lineCase("array-reverse-sparse", "let a=[,7,,undefined]; a.reverse(); console.log(a.join(),0 in a,1 in a,2 in a,3 in a);", {stdout:",,7, true false true false\n"});
lineCase("array-reverse-generic", "let o={length:3.9,'0':'a','2':'b'}; console.log([].reverse.call(o)===o,o[0],o[2],o.length);", {stdout:"true b a 3.9\n"});
lineCase("array-reverse-coercion", "let o={'0':7,'1':11,length:{valueOf:function(){console.log('length');return 2;}}}; [].reverse.call(o); console.log(o[0],o[1]);", {stdout:"length\n11 7\n"});
lineCase("array-reverse-primitives", "console.log([].reverse.call('a').valueOf(),[].reverse.call(7).valueOf()); try{[].reverse.call('ab');}catch(e){console.log(e.name);} try{[].reverse.call(null);}catch(e){console.log(e.name);} try{[].reverse.call(undefined);}catch(e){console.log(e.name);}", {stdout:"a 7\nTypeError\nTypeError\nTypeError\n"});
lineCase("array-reverse-empty", "let o={length:-1,'0':7}; [].reverse.call(o); console.log(o.length,o[0],[].reverse.name,[].reverse.length);", {stdout:"-1 7 reverse 0\n"});
lineCase("array-search-equality", "let a=[NaN,0,undefined,'7',7]; console.log(a.indexOf(NaN),a.includes(NaN),a.indexOf(-0),a.includes(-0),a.indexOf(7),a.indexOf('7'));", {stdout:"-1 true 1 true 4 3\n"});
lineCase("array-search-identity", "let x={}; let y={}; let a=[x]; console.log(a.indexOf(x),a.includes(y),a.indexOf(y));", {stdout:"0 false -1\n"});
lineCase("array-search-offset", "let a=[7,11,7]; console.log(a.indexOf(7,1),a.indexOf(7,-2),a.indexOf(7,1.9),a.includes(11,-1),a.includes(7,Infinity),a.indexOf(7,-Infinity),a.indexOf(7,NaN));", {stdout:"2 2 2 false false 0 0\n"});
lineCase("array-search-primitives", "console.log([].indexOf.call('abc','b'),[].includes.call('abc','bc'),[].indexOf.call(7,7));", {stdout:"1 false -1\n"});
lineCase("array-search-missing", "let a=[,undefined]; console.log(a.indexOf(),a.includes(),[,].indexOf(undefined),[,].includes(undefined));", {stdout:"1 true -1 true\n"});
lineCase("array-search-safe-limit", "let o={length:Infinity}; o[9007199254740990]=7; console.log([].indexOf.call(o,7,-1),[].includes.call(o,7,-1));", {stdout:"9007199254740990 true\n"});
lineCase("array-search-abrupt-offset", "let f={valueOf:function(){throw 'from';}}; console.log([].indexOf(7,f),[].includes(7,f)); try{[7].indexOf(7,f);}catch(e){console.log(e);} try{[7].includes(7,f);}catch(e){console.log(e);}", {stdout:"-1 false\nfrom\nfrom\n"});
lineCase("array-search-nullish", "try{[].indexOf.call(null,7);}catch(e){console.log(e.name);} try{[].includes.call(undefined,7);}catch(e){console.log(e.name);}", {stdout:"TypeError\nTypeError\n"});
lineCase("array-search-metadata", "console.log([].indexOf.name,[].indexOf.length,[].includes.name,[].includes.length);", {stdout:"indexOf 1 includes 1\n"});
lineCase("array-push-pop", "let a=[7]; console.log(a.push(11,13),a.pop(),a.length,a.pop(),a.pop(),a.pop(),a.push());", {stdout:"3 13 2 11 7 undefined 0\n"});
lineCase("array-pop-hole", "let a=[,,]; console.log(a.pop(),a.length,0 in a);", {stdout:"undefined 1 false\n"});
lineCase("array-mutation-coercion", "let o={length:{valueOf:function(){console.log('length'); return 1.9;}}}; console.log([].push.call(o,7),o[1],o.length);", {stdout:"length\n2 7 2\n"});
lineCase("array-mutation-strings", "try{[].pop.call('abc');}catch(e){console.log(e.name);} try{[].push.call('');}catch(e){console.log(e.name);}", {stdout:"TypeError\nTypeError\n"});
lineCase("array-push-array-limit", "let a=[]; a.length=4294967295; try{a.push(7);}catch(e){console.log(e.name,a.length,a[4294967295]);}", {stdout:"RangeError 4294967295 7\n"});
lineCase("array-mutation-nullish", "try{[].pop.call(null);}catch(e){console.log(e.name);} try{[].push.call(undefined,7);}catch(e){console.log(e.name);}", {stdout:"TypeError\nTypeError\n"});
lineCase("array-pop-safe-limit", "let o={length:Infinity}; o[9007199254740990]=7; console.log([].pop.call(o),o.length,9007199254740990 in o);", {stdout:"7 9007199254740990 false\n"});
lineCase("array-mutation-negative-length", "let o={length:-3}; console.log([].pop.call(o),o.length); o.length=-5; console.log([].push.call(o,7),o[0],o.length);", {stdout:"undefined 0\n1 7 1\n"});
lineCase("array-push-argument-order", "let o={length:{valueOf:function(){console.log('length'); return 0;}}}; function arg(){console.log('argument'); return 7;} console.log([].push.call(o,arg()));", {stdout:"argument\nlength\n1\n"});
lineCase("script-for", "var total=0; for(var i=0;i<5;i++){total+=i;} console.log(total, i);", { stdout: "10 5\n" });
lineCase("script-catch", "try { throw new Error('boom'); } catch(e) { console.log(e.message); } console.log('after');", { stdout: "boom\nafter\n" });
lineCase("script-construct", "function Point(x){this.x=x;} let p=new Point(3); console.log(p.x, p instanceof Point);", { stdout: "3 true\n" });
lineCase("script-sloppy-this", "let global=this; function f(){return this;} let o={f:f}; console.log(f()===global, o.f()===o);", { stdout: "true true\n" });
lineCase("script-strict-this", "'use strict'; function f(){return this;} let o={f:f}; console.log(f()===undefined, o.f()===o);", { stdout: "true true\n" });
lineCase("script-sloppy-writes", "missing=7; Number.NaN=2; 'ab'[0]='z'; console.log(this.missing, Number.isNaN(Number.NaN), 'ab'[0]);", { stdout: "7 true a\n" });
lineCase("script-sloppy-delete", "var x=1; console.log(delete x, delete absent, delete Number.NaN);", { stdout: "false true false\n" });
lineCase("script-strict-early-error", "'use strict'; console.log('no'); delete x;", { status: 2, errorContains: "parse SyntaxError: delete of an identifier is not allowed" });
lineCase("exponentiation-after-effects", "function effect(){console.log('effect');}var p={x:2};effect();p.x **= 3;console.log(p.x);", { stdout: "effect\n8\n" });
lineCase("exponentiation-parse-before-effects", "console.log('no'); -2 ** 3;", { status: 2, errorContains: "parse SyntaxError: unparenthesized unary exponentiation base" });
lineCase("script-conflict-before-effects", "console.log('no'); let x; var x;", { status: 2, errorContains: "parse SyntaxError: lexical-var: x" });
lineCase("script-loop-limit", "for(;;){}", { status: 1, errorPattern: "1:\\d+: runtime RangeError: execution step limit exceeded" });
lineCase("typeof-void-success", "console.log(typeof missing, typeof null, void 0);", { stdout: "undefined object undefined\n" });
lineCase("typeof-operand", "typeof;", { status: 2, error: "1:7: parse SyntaxError: unsupported or unexpected syntax: ;" });
lineCase("void-missing", "void missing;", { status: 1, error: "1:6: runtime ReferenceError: missing is not defined" });
lineCase("typeof-tdz", "typeof x; let x;", { status: 1, error: "1:8: runtime ReferenceError: x is not initialized" });
lineCase("numeric-key", "let o={}; o[1]=2; console.log(o[1], o['1']);", { stdout: "2 2\n" });
// Array literal parser boundaries retain exact phases and located diagnostics.
for (const [name, source, expected] of [
    ["eof", "let a = [", { status: 2, error: "1:10: parse SyntaxError: unsupported or unexpected syntax: <eof>" }],
    ["separator", "let a = [1 2];", { status: 2, error: "1:12: parse SyntaxError: expected ']', found '2'" }],
    ["delimiter", "let a = [1);", { status: 2, error: "1:11: parse SyntaxError: expected ']', found ')'" }],
    ["spread", "let a = [...x];", { status: 1, error: "1:13: runtime ReferenceError: x is not defined" }],
    ["binding-pattern", "let [x] = [1];", { stdout: "" }],
    ["assignment-pattern", "[x] = [1];", { stdout: "" }],
    ["comma-operator", "let a = [(1, 2)];", { stdout: "" }],
    ["numeric-key", "let a = [1]; console.log(a[0]);", { stdout: "1\n" }],
    ["deep", "[".repeat(200) + "0" + "]".repeat(200) + ";", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["nested-success", "console.log(" + "[".repeat(30) + "1" + "]".repeat(30) + ".length);", { stdout: "1\n" }],
    ["throw", "function stop() {\n    throw 'stop';\n}\nlet a = [console.log('first'), stop(), console.log('later')];", { status: 1, stdout: "first\n", error: "2:5: runtime Uncaught: stop" }],
    ["missing", "let a = [console.log('first'), missing, console.log('later')];", { status: 1, stdout: "first\n", error: "1:32: runtime ReferenceError: missing is not defined" }],
    ["holes-loop-budget", "while (true) { [" + ",".repeat(1000) + "]; }", { status: 1, errorPattern: "1:\\d+: runtime RangeError: execution step limit exceeded" }],
]) {
    lineCase("array-literal-" + name, source, expected);
}
// Conditional failures assert the phase, diagnostic and effects before completion.
for (const key of ["NaN", "POSITIVE_INFINITY", "NEGATIVE_INFINITY", "MAX_VALUE", "MIN_VALUE", "EPSILON", "MAX_SAFE_INTEGER", "MIN_SAFE_INTEGER"]) {
    lineCase("number-readonly-" + key, "'use strict';\nNumber." + key + " = console.log('rhs'); console.log('after');", {
        status: 1, stdout: "rhs\n", error: "2:1: runtime TypeError: property is not writable: " + key,
    });
}
for (const predicate of ["isNaN", "isFinite"]) {
    lineCase("number-abrupt-extra-" + predicate, "Number." + predicate + "(0, missing, console.log('after'));", {
        status: 1, errorPattern: "1:\\d+: runtime ReferenceError: missing is not defined",
    });
    for (const key of ["name", "length"]) {
        lineCase("number-metadata-" + predicate + "-" + key, "'use strict';\nNumber." + predicate + "." + key + " = 2;", {
            status: 1, error: "2:1: runtime TypeError: property is not writable: " + key,
        });
    }
}
lineCase("number-conversion-argument", "console.log(Number(console.log('arg')));", {
    stdout: "arg\nNaN\n",
});
for (const [name, source, expected] of [
    ["missing-colon", "true ? 1;", { status: 2, error: "1:9: parse SyntaxError: expected ':', found ';'" }],
    ["missing-consequent", "true ? : 1;", { status: 2, error: "1:8: parse SyntaxError: unsupported or unexpected syntax: :" }],
    ["missing-alternate", "true ? 1 :;", { status: 2, error: "1:11: parse SyntaxError: unsupported or unexpected syntax: ;" }],
    ["alternate-eof", "true ? 1 :", { status: 2, error: "1:11: parse SyntaxError: unsupported or unexpected syntax: <eof>" }],
    ["assignment-target", "(true ? a : b) = 1;", { status: 2, error: "1:1: parse SyntaxError: invalid assignment target" }],
    ["unchosen-syntax", "console.log('no'); true ? 1 :;", { status: 2, error: "1:30: parse SyntaxError: unsupported or unexpected syntax: ;" }],
    ["optional-chain", "true?.x;", { status: 0, stdout: "" }],
    ["nullish", "true ?? 1;", { status: 2, error: "1:7: parse SyntaxError: unsupported or unexpected syntax: ?" }],
    ["comma", "true ? 1, 2 : 3;", { status: 2, error: "1:9: parse SyntaxError: expected ':', found ','" }],
    ["abrupt-test", "missing ? console.log('no') : console.log('no');", { status: 1, error: "1:1: runtime ReferenceError: missing is not defined" }],
    ["abrupt-consequent", "true ? missing : console.log('no'); console.log('after');", { status: 1, error: "1:8: runtime ReferenceError: missing is not defined" }],
    ["abrupt-alternate", "false ? console.log('no') : missing; console.log('after');", { status: 1, error: "1:29: runtime ReferenceError: missing is not defined" }],
    ["throw-test", "function stop() { throw 'stop'; } stop() ? console.log('no') : console.log('no');", { status: 1, error: "1:19: runtime Uncaught: stop" }],
    ["throw-consequent", "function stop() { throw 'stop'; } true ? stop() : console.log('no'); console.log('after');", { status: 1, error: "1:19: runtime Uncaught: stop" }],
    ["throw-alternate", "function stop() { throw 'stop'; } false ? console.log('no') : stop(); console.log('after');", { status: 1, error: "1:19: runtime Uncaught: stop" }],
    ["effects-before-throw", "function stop() { console.log('chosen'); throw 'stop'; } false ? console.log('no') : stop();", { status: 1, stdout: "chosen\n", error: "1:42: runtime Uncaught: stop" }],
    ["nested-success", "console.log(" + "false ? 0 : ".repeat(30) + "42);", { stdout: "42\n" }],
    ["consequent-depth", "true ? ".repeat(200) + "1" + " : 0".repeat(200) + ";", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["alternate-depth", "false ? 0 : ".repeat(200) + "1;", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["unchosen-depth", "true ? 1 : " + "false ? 0 : ".repeat(200) + "1;", { status: 2, errorPattern: "1:\\d+: parse SyntaxError: syntax nesting limit exceeded" }],
    ["evaluation-depth", "1" + "+(true ? 1 : 0)".repeat(300) + ";", { status: 1, errorPattern: "1:\\d+: runtime RangeError: evaluation nesting limit exceeded" }],
]) {
    lineCase("conditional-" + name, source, expected);
}
// Write actual line terminators into runtime files, rather than guest escapes.
// All five forms must agree on comment boundaries and source coordinates.
for (const [name, separator] of [["lf", "\n"], ["cr", "\r"], ["crlf", "\r\n"], ["ls", "\u2028"], ["ps", "\u2029"]]) {
    lineCase(name + "-line-comment", "console.log(1); // comment" + separator + "console.log(2);", { stdout: "1\n2\n" });
    lineCase(name + "-whitespace", "console.log(1);" + separator + "console.log(2);", { stdout: "1\n2\n" });
    lineCase(name + "-line-location", "// comment" + separator + "missing;", {
        status: 1, error: "2:1: runtime ReferenceError: missing is not defined",
    });
    lineCase(name + "-block-location", "/* comment" + separator + "*/missing;", {
        status: 1, error: "2:3: runtime ReferenceError: missing is not defined",
    });
    for (const [prefix, suffix] of [["return", "function f() { return"], ["throw", "throw"]]) {
        const tail = prefix === "return" ? "1; }" : "1;";
        const error = "1:" + (prefix === "return" ? "16" : "1") + ": parse SyntaxError: newline after return/throw is unsupported";
        const expected = prefix === "return" ? { status: 0, stdout: "" } : { status: 2, error };
        lineCase(name + "-" + prefix, suffix + separator + tail, expected);
        lineCase(name + "-block-" + prefix, suffix + " /* comment" + separator + "*/" + tail, expected);
    }
}
for (const [name, separator] of [["ls", "\u2028"], ["ps", "\u2029"]]) {
    lineCase(name + "-string", 'console.log("a' + separator + 'b");', { stdout: "a" + separator + "b\n" });
}
lineCase("mixed-line-positions", "/*\r\n\u2028\u2029*/missing;", {
    status: 1, error: "4:3: runtime ReferenceError: missing is not defined",
});
// Equality diagnostics exercise real CLI exit phases as well as the host matrix.
for (const op of ["==", "!="]) {
    lineCase("equality-typeerror-" + (op === "==" ? "equal" : "unequal"),
        "let o = {valueOf: 0, toString: 0};\no " + op + " 1;", {
            status: 1, error: "2:1: runtime TypeError: cannot convert object to primitive",
        });
    lineCase("equality-syntax-" + (op === "==" ? "equal" : "unequal"), "1 " + op + ";", {
        status: 2, error: "1:5: parse SyntaxError: unsupported or unexpected syntax: ;",
    });
}
const results = [];
function execute(name, executable, args, expected) {
    const r = spawnSync(executable, args, { cwd: root, encoding: "utf8", timeout: 10000 });
    const stdout = (r.stdout ?? "").replaceAll("\r\n", "\n");
    const stderr = (r.stderr ?? "").replaceAll("\r\n", "\n");
    let verdict = "PASS";
    if (r.error) verdict = r.error.code === "ETIMEDOUT" ? "TIMEOUT" : "HARNESS-FAIL";
    else if (r.signal || r.status === null || r.status === 127 || r.status < 0) verdict = "CRASH";
    else if (r.status !== (expected.status ?? 0)) verdict = "STATUS-FAIL";
    else if (stdout !== (expected.stdout ?? "")) verdict = "OUTPUT-FAIL";
    else if (expected.error ? stderr !== name + ":" + expected.error + "\n"
        : expected.errorPattern ? !new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ":" + expected.errorPattern + "\n$").test(stderr)
        : expected.errorContains ? !stderr.includes(expected.errorContains)
        : stderr !== (expected.stderr ?? "")) verdict = "ERROR-FAIL";
    const result = { name, verdict, status: r.status, signal: r.signal, error: r.error ? { code: r.error.code, message: r.error.message } : null, stdout, stderr, expected };
    results.push(result);
    console.log(`${verdict} ${name}`);
    if (verdict !== "PASS") console.error(result);
}
for (const c of cases) execute(c.file, command, [...prefix, c.file], c);
execute("inline", command, [...prefix, "-e", "console.log(6 * 7);"], { stdout: "42\n" });
execute("usage", command, prefix, { status: 64, stderr: "usage: rift <file.js> | -e <source>\n" });
execute("missing-inline", command, [...prefix, "-e"], { status: 64, stderr: "usage: rift <file.js> | -e <source>\n" });
execute("io", command, [...prefix, "build/nonexistent-guest.js"], { status: 66, stderr: "cannot read source: build/nonexistent-guest.js\n" });
function executeDriver(driver, expected, args = [], name = driver) {
    const executable = lane === "node" ? process.execPath : join(root, "build/native", driver + suffix);
    const prefix = lane === "node" ? [join(root, "build/node/test", driver + ".js")] : [];
    execute(name, executable, [...prefix, ...args], expected);
}
executeDriver("realms", { stdout: "a 41\nb 7 undefined\na 42\na 23\nrealms independent\n" }, ["test/fixtures/realm-setup.js", "test/fixtures/realm-check.js"]);
const bootstrapRows = readFileSync(join(root, "fixtures/script-realm-bootstrap/rows.txt"), "utf8");
const bootstrapExpected = Array.from({ length: 18 }, (_, index) => `B${String(index + 1).padStart(2, "0")} PASS\n`).join("");
for (const [name, text] of [["seed", bootstrapRows], ["other", bootstrapRows.replaceAll("|seed|7", "|other|11")]]) {
    const file = join(root, "build/guest-fixtures/script-realm-bootstrap-" + name + ".txt");
    writeFileSync(file, text);
    executeDriver("script-realm-bootstrap", { stdout: bootstrapExpected }, [file], "script-realm-bootstrap-" + name);
}
executeDriver("string-methods", { stdout: "string methods passed\n" });
executeDriver("boolean-constructor", { stdout: "Boolean constructor passed\n" });
executeDriver("array-constructor", { stdout: "Array constructor passed\n" });
executeDriver("own-property-predicates", { stdout: "Own-property predicates passed\n" });
executeDriver("object-enumeration", { stdout: "Object enumeration passed\n" });
executeDriver("array-reduce", { stdout: "Array reduction passed\n" });
executeDriver("object-descriptor-reflection", { stdout: "Property descriptor reflection passed\n" });
executeDriver("function-apply", { stdout: "Function apply passed\n" });
executeDriver("radix-literals", { stdout: "Radix literals passed\n" });
executeDriver("decimal-literals", { stdout: "Decimal literals passed\n" });
executeDriver("global-numeric-predicates", { stdout: "Global numeric predicates passed\n" });
executeDriver("array-sort", { stdout: "Array sort passed\n" });
executeDriver("string-split", { stdout: "String split passed\n" });
executeDriver("array-flat", { stdout: "Array flattening passed\n" });
executeDriver("object-assign", { stdout: "Object assignment passed\n" });
executeDriver("symbol-factory", { stdout: "Symbol factory passed\n" });
executeDriver("symbol-registry", { stdout: "Symbol registry passed\n" });
executeDriver("symbol-well-known", { stdout: "Well-known symbols passed\n" });
executeDriver("array-iterator", { stdout: "Array iterators passed\n" });
executeDriver("string-iterator", { stdout: "String iterators passed\n" });
executeDriver("object-from-entries", { stdout: "Object fromEntries passed\n" });
executeDriver("keyed-collection", { stdout: "Keyed collection storage passed\n" });
executeDriver("map-object", { stdout: "Map ordinary methods passed\n" });
executeDriver("map-iterator", { stdout: "Map iterators passed\n" });
executeDriver("group-by", { stdout: "Object and Map grouping passed\n" });
executeDriver("string-search", { stdout: "String search predicates passed\n" });
executeDriver("map-upsert", { stdout: "Map insert-if-absent methods passed\n" });
executeDriver("set-object", { stdout: "Set ordinary methods passed\n" });
executeDriver("set-iterator", { stdout: "Set iterators passed\n" });
executeDriver("error-family", { stdout: "Error family and brand predicate passed\n" });
executeDriver("for-of", { stdout: "Synchronous for-of passed\n" });
executeDriver("const-bindings", { stdout: "Const bindings passed\n" });
executeDriver("for-of-lexical", { stdout: "Lexical for-of passed\n" });
executeDriver("exponentiation", { stdout: "Exponentiation passed\n" });
executeDriver("bitwise", { stdout: "Bitwise operators passed\n" });
executeDriver("uri", { stdout: "URI codecs passed\n" });
executeDriver("finally", { stdout: "Finally passed\n" });
executeDriver("for-lexical", { stdout: "Lexical for passed\n" });
executeDriver("for-in", { stdout: "For-in passed\n" });
executeDriver("array-spread", { stdout: "Array spread passed\n" });
executeDriver("argument-spread", { stdout: "Argument spread passed\n" });
executeDriver("object-methods", { stdout: "Object methods passed\n" });
executeDriver("trailing-commas", { stdout: "Trailing commas passed\n" });
executeDriver("string-html", { stdout: "String HTML passed\n" });
executeDriver("string-escapes", { stdout: "String escapes passed\n" });
executeDriver("string-wellformed", { stdout: "String well-formedness passed\n" });
executeDriver("string-codepoints", { stdout: "String code points passed\n" });
executeDriver("function-bind", { stdout: "Function bind passed\n" });
executeDriver("numeric-separators", { stdout: "Numeric separators passed\n" });
executeDriver("comma-expressions", { stdout: "Comma expressions passed\n" });
executeDriver("function-constructor", { stdout: "Function constructor passed\n" });
executeDriver("arrows", { stdout: "Arrow functions passed\n" });
executeDriver("rest-parameters", { stdout: "Rest parameters passed\n" });
executeDriver("default-parameters", { stdout: "Default parameters passed\n" });
executeDriver("arguments-storage", { stdout: "Arguments storage passed\n" });
executeDriver("arguments", { stdout: "Arguments passed\n" });
executeDriver("sloppy-block-functions", { stdout: "Sloppy block functions passed\n" });
executeDriver("locale-string", { stdout: "Locale string conversions passed\n" });
executeDriver("labels", { stdout: "Labelled statements passed\n" });
executeDriver("optional-chain", { stdout: "Optional chaining passed\n" });
executeDriver("semicolon-insertion", { stdout: "Semicolon insertion passed\n" });
executeDriver("inherited-strictness", { stdout: "Inherited strictness passed\n" });
executeDriver("array-assignment-patterns", { stdout: "Array assignment patterns passed\n" });
executeDriver("array-binding-patterns", { stdout: "Array binding patterns passed\n" });
executeDriver("object-binding-patterns", { stdout: "Object binding patterns passed\n" });
executeDriver("object-assignment-patterns", { stdout: "Object assignment patterns passed\n" });
executeDriver("class-planning", { stdout: "Class planning passed\n" });
executeDriver("base-classes", { stdout: "Base classes passed\n" });
executeDriver("duplicate-parameters", { stdout: "Duplicate parameters passed\n" });
executeDriver("catch-var", { stdout: "Catch var declarations passed\n" });
executeDriver("new-target", { stdout: "New target passed\n" });
executeDriver("for-binding-patterns", { stdout: "For binding patterns passed\n" });
executeDriver("for-assignment-patterns", { stdout: "For assignment patterns passed\n" });
executeDriver("iterator-step", { stdout: "Iterator step passed\n" });
executeDriver("numeric-separator-audit", { stdout: "Numeric separator audit passed\n" });
executeDriver("numeric-separator-errors", { stdout: "Numeric separator errors passed\n" });
executeDriver("eval", { stdout: "Eval passed\n" });
executeDriver("object-prototype-methods", { stdout: "Object prototype methods passed\n" });
executeDriver("object-reflection", { stdout: "Object reflection passed\n" });
executeDriver("object-create", { stdout: "Object creation passed\n" });
executeDriver("object-integrity", { stdout: "Object integrity passed\n" });
executeDriver("number-format", { stdout: "Number formatting passed\n" });
executeDriver("number-parse", { stdout: "Numeric parsing passed\n" });
executeDriver("number-constructor", { stdout: "Number constructor passed\n" });
executeDriver("array-copy", { stdout: "Array copy passed\n" });
executeDriver("json-parse", { stdout: "JSON parse passed\n" });
executeDriver("math-unary", { stdout: "Math unary passed\n" });
executeDriver("do-while", { stdout: "Do-while passed\n" });
executeDriver("script-templates", { stdout: "Script templates passed\n" });
executeDriver("array-iteration", { stdout: "Public array iteration passed\n" });
executeDriver("array-predicate", { stdout: "array predicates passed\n" });
executeDriver("array-search", { stdout: "array search passed\n" });
executeDriver("array-mutation", { stdout: "array mutation passed\n" });
executeDriver("object-descriptors", { stdout: "object descriptors passed\n" });
executeDriver("object-prototypes", { stdout: "object prototypes passed\n" }, ["test/fixtures/prototypes.js"]);
executeDriver("object-keys", { stdout: "object keys passed\n" });
executeDriver("conversion", { stdout: "primitive conversion passed\n" });
executeDriver("definition-dispatch", { stdout: "definition dispatch passed\n" });
executeDriver("array-storage", { stdout: "array storage passed\n" });
executeDriver("array-like", { stdout: "array-like prerequisites passed\n" });
executeDriver("operation-context", { stdout: "operation context passed\n" });
executeDriver("array-map", { stdout: "array map passed\n" });
executeDriver("array-literals", { stdout: "array literals passed\n" });
executeDriver("property-key-conversion", { stdout: "property key conversion passed\n" });
executeDriver("numeric-operators", { stdout: "4 12 3 0\n3 -3\nLRLRLRLRUU\nnumeric operators passed\n" });
executeDriver("addition", { stdout: "addition passed\n" });
executeDriver("relational", { stdout: "relational passed\n" });
executeDriver("primitive-conversion", { stdout: "primitive conversion passed\n" });
executeDriver("operator-coercion", { stdout: "operator coercion passed\n" });
executeDriver("key-coercion", { stdout: "key coercion passed\n" });
executeDriver("length-coercion", { stdout: "length coercion passed\n" });
executeDriver("array-length-coercion", { stdout: "array length coercion passed\n" });
executeDriver("function-call", { stdout: "function call passed\n" });
executeDriver("object-valueof", { stdout: "object valueOf passed\n" });
executeDriver("array-string-conversion", { stdout: "cycle false 1 4\ncycle false 2 5\ncycle false 4 10\ncycle false 64 160\ncycle true 1 4\ncycle true 2 5\ncycle true 4 10\ncycle true 64 160\nreentry separator 2 2\nreentry separator 64 64\nreentry element 2 3\nreentry element 64 87\narray-string-conversion ok\n" });
executeDriver("function-string-conversion", { stdout: "function-string-conversion ok\n" });
executeDriver("delete-operator", { stdout: "delete-operator ok\n" });
executeDriver("typeof-void", { stdout: "typeof-void ok\n" });
executeDriver("in-operator", { stdout: "in-operator ok\n" });
executeDriver("primitive-reads", { stdout: "primitive-reads ok\n" });
executeDriver("property-assignment", { stdout: "property-assignment ok\n" });
executeDriver("compound-assignment", { stdout: "compound-assignment ok\n" });
executeDriver("abstract-equality", { stdout: "abstract-equality ok\n" });
executeDriver("structured-outcomes", { stdout: "structured-outcomes ok\n" });
for (const { driver, variant, fixture, stdout, source } of scriptHostCases) {
    if (source !== undefined) writeFileSync(join(root, fixture), source);
    executeDriver(driver, { stdout }, [fixture], driver + "/" + variant);
}
writeFileSync(join(root, `build/guest-${lane}-results.json`), JSON.stringify(results, null, 2));
console.log(`${results.filter(r => r.verdict === "PASS").length}/${results.length} passed; no skips`);
process.exitCode = results.every(r => r.verdict === "PASS") ? 0 : 1;

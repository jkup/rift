import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse } from "../src/parser.js";

function check(ok:boolean,label:string):void{if(!ok)throw new Error(label);}
function fresh():Realm{return new Realm((_line:string)=>{},'script');}
function run(text:string,realm=fresh(),steps=20000):ValueCompletion{
    const p=prepareBoundedScript({id:'argument-spread',text},realm);if(p.kind!=='ready')throw new Error('prepare '+p.kind+' '+text);
    const session=createScriptSession({maxSteps:steps,maxCalls:64});const result=evaluateScript(session,p.record).completion;
    const state=session.inspect();check(state.active===null&&state.calls===0&&state.depth===0,'restored session');return result;
}
function passes(text:string):void{const c=run(text);check(c.type==='normal'&&sameValue(c.value,{kind:'boolean',value:true}),text);}
for(const prefix of ['',"'use strict';"]){
    for(const source of [
        "function f(a,b,c,d){return a*1000+b*100+c*10+d;}f(1,...[2,3],4)===1234&&f(...[1],2,...[3,4])===1234;",
        "function f(a,b){return a===undefined&&b===7;}f(...[],...[,7]);",
        "function f(a,b,c){return a==='A'&&b==='😀'&&c==='B';}f(...'A😀B');",
        "Math.max(...[1,9,3])===9&&Math.min(...new Set([3,1,2]))===1;",
        "var a=[];a.push(...[1,2],3,...[4]);a.join(',')==='1,2,3,4';",
        "function C(a,b){this.sum=a+b;}var o=new C(...[2,3]);o.sum===5&&o instanceof C;",
        "new Array(...[1,2,3]).join(',')==='1,2,3'&&new Array(...[3]).length===3;",
        "var o=new Map(...[[[1,2]]]);o.get(1)===2;",
        "function C(x){return {x:x};}new C(...[7]).x===7;",
        "function f(x){return x();}f(...[(function(){let x=7;return function(){return x;};})()])===7;",
        "function C(f){this.f=f;}new C(...[(function(){let x=8;return function(){return x;};})()]).f()===8;",
        "function f(x){return x.name;}f(...[function(){}])==='';",
        "var o={x:7,f:function(a){return this.x+a;}};var old=o;var source={};source[Symbol.iterator]=function(){o={x:100};old.f=function(){return 999;};return [3][Symbol.iterator]();};old.f(...source)===10;",
        "function C(a){this.x=a;}var old=C;var proto={tag:7};var source={};source[Symbol.iterator]=function(){C=function(){throw 9;};old.prototype=proto;return [3][Symbol.iterator]();};var o=new C(...source);o.x===3&&Object.getPrototypeOf(o)===proto;",
        "var n=0;var source={};source[Symbol.iterator]=function(){n++;return [1][Symbol.iterator]();};var ok=false;try{(1)(...source);}catch(e){ok=e instanceof TypeError;}ok&&n===1;",
        "var n=0;var source={};source[Symbol.iterator]=function(){n++;return [1][Symbol.iterator]();};var C=1;var ok=false;try{new C(...source);}catch(e){ok=e instanceof TypeError;}ok&&n===1;",
        "var n=0;var source={};source[Symbol.iterator]=function(){n++;return [1][Symbol.iterator]();};var ok=false;try{missing(...source);}catch(e){ok=e instanceof ReferenceError;}ok&&n===0;",
        "var n=0;var source={};source[Symbol.iterator]=function(){n++;return [1][Symbol.iterator]();};var ok=false;try{new missing(...source);}catch(e){ok=e instanceof ReferenceError;}ok&&n===0;",
    ])passes(prefix+source);
    const setup="var trace='';var n=0;var it={};Object.defineProperty(it,'next',{get:function(){trace+='N';return function(){trace+='C';n++;return {done:n>2,value:n};};}});var source={};Object.defineProperty(source,Symbol.iterator,{get:function(){trace+='I';return function(){return it;};}});function arg(x){trace+=x;return x;}var receiver={};Object.defineProperty(receiver,'f',{get:function(){trace+='G';return function(a,b,c,d){trace+='F';return this===receiver&&a==='a'&&b===1&&c===2&&d==='b';};}});";
    passes(prefix+setup+"var ok=receiver.f(arg('a'),...source,arg('b'));ok&&trace==='GaINCCCbF';");
    for(const form of ['f(...source,(later=1));','new f(...source,(later=1));','(1)(...source,(later=1));'])
        for(const next of ["function(){throw 7;}","function(){var r={};Object.defineProperty(r,'done',{get:function(){throw 7;}});return r;}","function(){var r={done:false};Object.defineProperty(r,'value',{get:function(){throw 7;}});return r;}"])
            passes(prefix+"var called=0;var closed=0;var later=0;function f(){called++;}var source={};source[Symbol.iterator]=function(){return {next:"+next+",return:function(){closed++;return {};}};};var ok=false;try{"+form+"}catch(e){ok=e===7;}ok&&called===0&&closed===0&&later===0;");
    for(const value of ['null','undefined','7','{length:1,0:1}'])passes(prefix+"function f(){}var ok=false;try{f(..."+value+");}catch(e){ok=e instanceof TypeError;}ok;");
}
for(const text of ['f(...);','f(...[],);','new C(...[],);','f(,...[]);','function f(...x){}','({...x});'])check(prepareBoundedScript({id:'unsupported',text},fresh()).kind!=='ready','reject '+text);
check(parse('f(...x);').error!==null,'legacy parser unchanged');
const owner=fresh(),caller=fresh();const f=run('function f(a,b){return [a,b];}f;',owner);check(f.type==='normal','foreign setup');if(f.type==='normal')caller.defineScriptGlobal('f',{value:f.value});
const a=run('f(...[1,2]);',caller);check(a.type==='normal'&&a.value.kind==='object'&&a.value.object.getPrototypeOf()===owner.arrayPrototype,'callee Realm');
const C=run('function C(x){this.x=x;}C;',owner);if(C.type==='normal')caller.defineScriptGlobal('C',{value:C.value});const o=run('new C(...[7]);',caller);const prototype=run('C.prototype;',owner);check(o.type==='normal'&&o.value.kind==='object'&&prototype.type==='normal'&&prototype.value.kind==='object'&&o.value.object.getPrototypeOf()===prototype.value.object,'constructor Realm');
const bad=run('f(...null);',caller);check(bad.type==='throw'&&bad.value.kind==='object'&&bad.value.object.getPrototypeOf()===caller.getErrorPrototype('TypeError'),'argument failure caller Realm');
for(const form of ['f(...source);','new f(...source);']){
    const realm=fresh();const result=run("var called=0;var closed=0;function f(){called++;}var source={};source[Symbol.iterator]=function(){return {next:function(){return {value:1,done:false};},return:function(){closed++;return {};}};};"+form,realm,150);
    check(result.type==='throw'&&result.origin.kind==='resource-limit','bounded spread arguments');const state=run('called===0&&closed===0;',realm);check(state.type==='normal'&&sameValue(state.value,{kind:'boolean',value:true}),'no call or cleanup after budget');
}
console.log('Argument spread passed');

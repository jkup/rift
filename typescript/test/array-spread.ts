import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { parse, parseDeclarationPlan } from "../src/parser.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 20000): ValueCompletion {
    const prepared = prepareBoundedScript({id:"array-spread",text},realm);
    if(prepared.kind !== 'ready')throw new Error('prepare '+prepared.kind+' '+text);
    const session=createScriptSession({maxSteps:steps,maxCalls:64});
    const result=evaluateScript(session,prepared.record).completion;
    const state=session.inspect();check(state.active===null&&state.calls===0&&state.depth===0,'restored session');
    return result;
}
function passes(text:string):void{const c=run(text);check(c.type==='normal'&&sameValue(c.value,{kind:'boolean',value:true}),text);}
for(const prefix of ['',"'use strict';"]) {
    for(const source of [
        "var a=[1,...[2,3],,5];a.length===5&&a.join(',')==='1,2,3,,5'&&!Object.hasOwn(a,3);",
        "var a=[,...[],...[],];a.length===1&&!Object.hasOwn(a,0);",
        "var a=[...[,,],,];a.length===3&&Object.hasOwn(a,0)&&Object.hasOwn(a,1)&&!Object.hasOwn(a,2)&&a[0]===undefined;",
        "var a=[...[1],...[],2,...[3,4]];a.length===4&&a.join(',')==='1,2,3,4';",
        "var a=[...'A😀B'];a.length===3&&a[1]==='😀';",
        "var a=[...new Set([3,1,3])];a.join(',')==='3,1';",
        "var a=[...new Map([[1,2],[3,4]])];a.length===2&&a[0][0]===1&&a[1][1]===4;",
        "var f;var a=[...(function(){let x=7;f=function(){return x;};return [f];})()];a[0]()===7;",
        "var a=[...[function(){}]];a[0].name==='';",
        "var n=0;Object.defineProperty(Array.prototype,'0',{set:function(){n++;},configurable:true});var a=[...[7]];n===0&&Object.hasOwn(a,0)&&a[0]===7;",
        "var a=[...[7]];var d=Object.getOwnPropertyDescriptor(a,'0');d.writable&&d.enumerable&&d.configurable;",
        "var o={};o[Symbol.iterator]=function(){return {next:function(){return {done:true};}};};[...o].length===0;",
        "var a=[1,2];Object.defineProperty(a,'0',{get:function(){a.push(3);return 1;}});[...a].join(',')==='1,2,3';",
        "var a=[1,2];a[Symbol.iterator]=function(){var n=0;return {next:function(){n++;return {value:9,done:n>1};}};};[...a].join(',')==='9';",
    ])passes(prefix+source);
    for(const value of ['null','undefined','7','true','{}','{0:1,length:1}'])passes(prefix+"var ok=false;try{[..."+value+"];}catch(e){ok=e instanceof TypeError;}ok;");
    const setup="var trace='';var n=0;var it={};Object.defineProperty(it,'next',{get:function(){trace+='N';return function(){trace+='C';n++;var r={};Object.defineProperty(r,'done',{get:function(){trace+='D';return n>2;}});Object.defineProperty(r,'value',{get:function(){trace+='V';return n;}});return r;};}});var source={};Object.defineProperty(source,Symbol.iterator,{get:function(){trace+='G';return function(){trace+='I';return it;};}});";
    passes(prefix+setup+"var a=[...source];a.join(',')==='1,2'&&trace==='GINCDVCDVCD';");
    passes(prefix+setup+"function mark(x){trace+=x;return x;}var a=[mark('a'),...source,mark('b')];trace==='aGINCDVCDVCDb'&&a.join(',')==='a,1,2,b';");
    for(const next of ["function(){throw 7;}","function(){return 1;}","function(){var r={};Object.defineProperty(r,'done',{get:function(){throw 7;}});return r;}","function(){var r={done:false};Object.defineProperty(r,'value',{get:function(){throw 7;}});return r;}"]) {
        passes(prefix+"var closed=0;var later=0;var it={next:"+next+",return:function(){closed++;return {};}};var source={};source[Symbol.iterator]=function(){return it;};var ok=false;try{[...source,(later=1)];}catch(e){ok=true;}ok&&closed===0&&later===0;");
    }
    passes(prefix+"var n=0;var it={next:function(){n++;it.next=function(){throw 7;};return {value:n,done:n>2};}};var source={};source[Symbol.iterator]=function(){return it;};[...source].join(',')==='1,2';");
    passes(prefix+"var n=0;var it={next:function(){return {done:true};}};Object.defineProperty(it,'return',{get:function(){n++;throw 7;}});var source={};source[Symbol.iterator]=function(){return it;};[...source].length===0&&n===0;");
}
for(const text of ['[...];','[. . .[]];','[..[]];','[...[],...];','f(...[]);','new C(...[]);','({...x});','let [...x]=[];','[...x]=[];'])
    if (text === 'f(...[]);' || text === 'new C(...[]);') passes('function f(){}function C(){}'+text+'true;');
    else check(prepareBoundedScript({id:'unsupported',text},fresh()).kind !== 'ready','reject '+text);
check(parse('[...[1]];').error !== null,'legacy parser unchanged');
const owner=fresh(),caller=fresh();
const f=run('function f(x){return [...x];}f;',owner);check(f.type==='normal','foreign setup');if(f.type==='normal')caller.defineScriptGlobal('f',{value:f.value});
const a=run('f([1,2]);',caller);check(a.type==='normal'&&a.value.kind==='object'&&a.value.object.getPrototypeOf()===owner.arrayPrototype,'captured Realm array');
const e=run('f(null);',caller);check(e.type==='throw'&&e.value.kind==='object'&&e.value.object.getPrototypeOf()===owner.getErrorPrototype('TypeError'),'captured Realm error');
const realm=fresh();const bounded=run("var closed=0;var source={};source[Symbol.iterator]=function(){return {next:function(){return {done:false,value:1};},return:function(){closed++;return {};}};};[...source];",realm,150);
check(bounded.type==='throw'&&bounded.origin.kind==='resource-limit','infinite spread bounded');const closed=run('closed;',realm);check(closed.type==='normal'&&sameValue(closed.value,{kind:'number',value:0}),'resource stop skips cleanup');
const source='[...(function(){let x=1;return [function(){return x;}];})()];';const plan=parseDeclarationPlan({id:'plan',text:source});check(plan.kind==='complete','spread declarations planned');if(plan.kind==='complete')check(plan.functions.length===2&&plan.scopes.length===3&&plan.scopes[2].parent===1,'spread function associations');
console.log('Array spread passed');

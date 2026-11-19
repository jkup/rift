import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
const setup = "function iterable(iterator){var o={};o[Symbol.iterator]=function(){return iterator};return o}";
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "array-from", text: setup + text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected)
        throw new Error(text + " expected " + expected);
}
const cases: { source: string; expected: string }[] = [
    { source: "Array.from([1,2,3]).join(',')", expected: "1,2,3" },
    { source: "var a=Array.from('a😀b');a.length+':'+a.join(',')", expected: "3:a,😀,b" },
    { source: "Array.from(new Set([1,2,1])).join(',')", expected: "1,2" },
    { source: "var a=Array.from({0:'a',2:'c',length:3});a.join(',')+':'+a.hasOwnProperty('1')", expected: "a,,c:true" },
    { source: "String(Array.from(3).length)+':'+Array.from({length:-1}).length+':'+Array.from({0:'a',1:'b',length:1.9}).join(',')", expected: "0:0:a" },
    { source: "var o={x:7};Array.from([2,3],function(v,k){return this.x+v+k},o).join(',')", expected: "9,11" },
    { source: "var n='';Array.from({length:2},function(v,k){n+=arguments.length+':'+v+':'+k+';'});n", expected: "2:undefined:0;2:undefined:1;" },
    { source: "var o={},s=Symbol(),a=Array.from([o,s]);String(a[0]===o)+':'+(a[1]===s)", expected: "true:true" },
    { source: "var a=Array.from.call(null,{0:4,length:1}),d=Object.getOwnPropertyDescriptor(a,'0');String(Object.getPrototypeOf(a)===Array.prototype)+':'+d.value+':'+d.writable+':'+d.enumerable+':'+d.configurable", expected: "true:4:true:true:true" },
    { source: "class A extends Array{}var a=A.from([4]);String(a instanceof A)+':'+a[0]", expected: "true:4" },
    { source: "var n='';function C(len){n+=arguments.length+':'+len+':'+(new.target===C)+';'}Array.from.call(C,[1,2]);Array.from.call(C,{length:2});n", expected: "0:undefined:true;1:2:true;" },
    { source: "var order='',o={get length(){order+='l';return 1},get 0(){order+='v';return 7}};Object.defineProperty(o,Symbol.iterator,{get(){order+='i'}});function C(n){order+='c'+n}var a=Array.from.call(C,o,v=>{order+='m';return v});order+':'+a[0]+':'+a.length", expected: "ilc1vm:7:1" },
    { source: "var order='',o={};Object.defineProperty(o,Symbol.iterator,{get(){order+='g';return function(){order+='i';return {next(){order+='n';return {done:true}}}}}});function C(){order+='c'}Array.from.call(C,o);order", expected: "gcin" },
    { source: "var reads=0,o={};Object.defineProperty(o,Symbol.iterator,{get(){reads++;return function(){return {next(){return {done:true}}}}}});function C(){Object.defineProperty(o,Symbol.iterator,{value:7})}var r='';try{Array.from.call(C,o)}catch(e){r=e.name}reads+':'+r", expected: "1:TypeError" },
    { source: "var reads=0,o={};Object.defineProperty(o,Symbol.iterator,{configurable:true,get(){reads++;return function(){return {next(){return {done:true}}}}}});function C(){Object.defineProperty(o,Symbol.iterator,{value:7})}var a=Array.from.call(C,o);reads+':'+a.length", expected: "1:0" },
    { source: "var order='',o={};Object.defineProperty(o,Symbol.iterator,{get(){order+='bad';throw 7}});var r='';try{Array.from(o,null)}catch(e){r=e.name}order+':'+r", expected: ":TypeError" },
    { source: "var r='';try{Array.from(null)}catch(e){r=e.name}r", expected: "TypeError" },
    { source: "var o={length:0};o[Symbol.iterator]=1;var r='';try{Array.from(o)}catch(e){r=e.name}r", expected: "TypeError" },
    { source: "var o={0:5,length:1};o[Symbol.iterator]=null;Array.from(o).join(',')", expected: "5" },
    { source: "var order='',it={next(){return {value:1}},return(){order+='r';throw 8}},r='';try{Array.from(iterable(it),()=>{throw 7})}catch(e){r=String(e)}r+':'+order", expected: "7:r" },
    { source: "var order='',it={next(){return {value:1}},get return(){order+='r';throw 8}},r='';try{Array.from(iterable(it),()=>{throw 7})}catch(e){r=String(e)}r+':'+order", expected: "7:r" },
    { source: "var order='',it={next(){return {value:1}},return(){order+='r';return 0}},r='';try{Array.from(iterable(it),()=>{throw 7})}catch(e){r=String(e)}r+':'+order", expected: "7:r" },
    { source: "var order='',it={next(){throw 7},return(){order+='bad'}},r='';try{Array.from(iterable(it))}catch(e){r=String(e)}r+':'+order", expected: "7:" },
    { source: "var order='',it={next(){return {get done(){throw 7}}},return(){order+='bad'}},r='';try{Array.from(iterable(it))}catch(e){r=String(e)}r+':'+order", expected: "7:" },
    { source: "var order='',it={next(){return {get value(){throw 7}}},return(){order+='bad'}},r='';try{Array.from(iterable(it))}catch(e){r=String(e)}r+':'+order", expected: "7:" },
    { source: "var order='',it={next(){return 3},return(){order+='bad'}},r='';try{Array.from(iterable(it))}catch(e){r=e.name}r+':'+order", expected: "TypeError:" },
    { source: "var order='',it={next(){return {done:true,get value(){throw 7}}},return(){order+='bad'}};Array.from(iterable(it)).length+':'+order", expected: "0:" },
    { source: "var order='',o={},it={next(){order+='n';return {value:1}},return(){order+='r';return {}}};Object.preventExtensions(o);var r='';try{Array.from.call(function(){return o},iterable(it))}catch(e){r=e.name}r+':'+order", expected: "TypeError:nr" },
    { source: "var order='',o={set length(n){throw 7}},it={next(){return {done:true}},return(){order+='bad'}},r='';try{Array.from.call(function(){return o},iterable(it))}catch(e){r=String(e)}r+':'+order", expected: "7:" },
    { source: "var order='';function C(){}Object.defineProperty(C.prototype,'0',{set(v){order+='bad'}});var a=Array.from.call(C,[9]);order+':'+a[0]+':'+a.hasOwnProperty('0')", expected: ":9:true" },
    { source: "var o={},r='';Object.defineProperty(o,'length',{value:0});try{Array.from.call(function(){return o},{0:4,length:1})}catch(e){r=e.name}r+':'+o[0]", expected: "TypeError:4" },
    { source: "var o={0:'a',length:2};Array.from(o,(v,k)=>{if(k===0){o[1]='b';o.length=1}return v}).join(',')", expected: "a,b" },
    { source: "var d=Object.getOwnPropertyDescriptor(Array,'from'),r='';try{new Array.from()}catch(e){r=e.name}Array.from.name+':'+Array.from.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r", expected: "from:1:true:false:true:TypeError" },
];
for (const c of cases) string(c.source, c.expected);
{
    const realm = fresh(), foreign = fresh(), descriptor = foreign.globalObject.getOwnProperty("Array");
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("foreign Array");
    realm.defineScriptGlobal("ForeignArray", { value: descriptor.value });
    string("String(Object.getPrototypeOf(ForeignArray.from.call(null,[1]))===ForeignArray.prototype)+':'+(Object.getPrototypeOf(ForeignArray.from.call(null,{length:0}))===ForeignArray.prototype)", "true:true", realm);
}
for (const text of ["Array.from({length:9007199254740991})", "Array.from.call(function(){return {}},{length:9007199254740991})", "Array.from(iterable({next(){return {value:1}},return(){throw 7}}))"]) {
    const prepared = prepareBoundedScript({ id: "array-from-budget", text: setup + text }, fresh());
    if (prepared.kind !== "ready") throw new Error("budget prepare");
    const result = evaluateScript(createScriptSession({ maxSteps: 200, maxCalls: 32 }), prepared.record).completion;
    const expected = text === "Array.from({length:9007199254740991})" ? "RangeError" : null;
    if (result.type !== "throw" || (expected === null ? result.origin.kind !== "resource-limit" : result.diagnostic.name !== expected))
        throw new Error("bounded Array.from: " + text);
}
console.log("Array.from passed");

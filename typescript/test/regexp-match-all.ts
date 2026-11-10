import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value, GuestObject, ValueCompletion } from "../src/runtime.js";
import { wellKnownMatchAll } from "../src/symbols.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function evaluate(text: string, realm: Realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "regexp-match-all", text: "function symbolObject(k,v){var o={};o[k]=v;return o}function species(c){return symbolObject(Symbol.species,c)}"+text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare matchAll: " + text);
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record).completion;
}
function run(text: string, expected: string): void {
    const result = evaluate(text);
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected) throw new Error(text);
}
for (const [text, expected] of [
    ["var a=Array.from('aba'.matchAll(/a/g));a.length+':'+a[0].index+':'+a[1].index+':'+a[0].input", "2:0:2:aba"],
    ["var r=/a/g;r.lastIndex=1;var i='aba'.matchAll(r);i.next().value.index+':'+i.next().done+':'+r.lastIndex", "2:true:1"],
    ["Array.from('aba'.matchAll('a')).length+''", "2"],
    ["Array.from('ab'.matchAll()).length+''", "3"],
    ["Array.from('😀'.matchAll(/(?:)/g)).length+''", "3"],
    ["var i=/a/[Symbol.matchAll]('aba');i.next().value.index+':'+i.next().done", "0:true"],
    ["var a=Array.from('ab a'.matchAll(/a(b)?/g));a[0][1]+':'+typeof a[1][1]", "b:undefined"],
    ["var o={toString(){throw 8}},p=symbolObject(Symbol.matchAll,function(v){return this===p&&v===o?'same':'bad'});String.prototype.matchAll.call(o,p)", "same"],
    ["var log='';var p=symbolObject(Symbol.match,true);Object.defineProperty(p,'flags',{get:function(){log+='f';return 'g'}});Object.defineProperty(p,Symbol.matchAll,{get:function(){log+='m';return function(v){log+='c';return log}}});''.matchAll(p)", "fmc"],
    ["var p=symbolObject(Symbol.match,true);p.flags='';Object.defineProperty(p,Symbol.matchAll,{get:function(){throw 8}});try{''.matchAll(p)}catch(e){e.name}", "TypeError"],
    ["var i='a'.matchAll(/a/g);i[Symbol.iterator]()===i?Object.prototype.toString.call(i):'bad'", "[object RegExp String Iterator]"],
    ["String.prototype.matchAll.length+':'+RegExp.prototype[Symbol.matchAll].length+':'+''.matchAll().next.length", "1:1:0"],
]) run(text, expected);

const setup = "var calls=0;var matcher={lastIndex:0,exec(s){calls++;return calls===1?{0:'x',index:4,input:s}:null}};var r={flags:'g',lastIndex:0,constructor:species(function(){return matcher})};";
for (const [text, expected] of [
    ["var i=RegExp.prototype[Symbol.matchAll].call(r,'abc');var before=calls;var a=i.next();var b=i.next();i.next();before+':'+calls+':'+a.value.index+':'+b.done", "0:2:4:true"],
    ["r.flags='';var i=RegExp.prototype[Symbol.matchAll].call(r,'abc');i.next();i.next();calls+''", "1"],
    ["r.lastIndex=-8;var i=RegExp.prototype[Symbol.matchAll].call(r,'x');matcher.lastIndex+''", "0"],
    ["r.lastIndex=Infinity;RegExp.prototype[Symbol.matchAll].call(r,'x');matcher.lastIndex+''", "9007199254740991"],
    ["var marker={};matcher.exec=function(){calls++;throw marker};var i=RegExp.prototype[Symbol.matchAll].call(r,'x');var same=false;try{i.next()}catch(e){same=e===marker}same+':'+i.next().done+':'+calls", "true:true:1"],
    ["matcher.exec=function(){calls++;return 3};var i=RegExp.prototype[Symbol.matchAll].call(r,'x');var name='';try{i.next()}catch(e){name=e.name}name+':'+i.next().done+':'+calls", "TypeError:true:1"],
    ["matcher.exec=function(){calls++;return {get 0(){throw 9}}};var i=RegExp.prototype[Symbol.matchAll].call(r,'x');var error=0;try{i.next()}catch(e){error=e}error+':'+i.next().done+':'+calls", "9:true:1"],
    ["var i;matcher.exec=function(){calls++;return i.next()};i=RegExp.prototype[Symbol.matchAll].call(r,'x');var name='';try{i.next()}catch(e){name=e.name}name+':'+i.next().done+':'+calls", "TypeError:true:1"],
    ["var i,name='';matcher.exec=function(){try{i.next()}catch(e){name=e.name}return {0:'x'}};i=RegExp.prototype[Symbol.matchAll].call(r,'x');name+':'+i.next().done+':'+name", ":false:TypeError"],
    ["r.flags='';matcher.exec=function(){return {get 0(){throw 9}}};var i=RegExp.prototype[Symbol.matchAll].call(r,'x');i.next().done+':'+i.next().done", "false:true"],
    ["Object.defineProperty(matcher,'lastIndex',{writable:false});try{RegExp.prototype[Symbol.matchAll].call(r,'x')}catch(e){e.name}", "TypeError"],
    ["var i=RegExp.prototype[Symbol.matchAll].call(r,'x');matcher.exec=function(){return {0:{toString(){throw 6}}}};var n=0;try{i.next()}catch(e){n=e}n+':'+i.next().done", "6:true"],
    ["var i=RegExp.prototype[Symbol.matchAll].call(r,'x');matcher.exec=function(){return {0:''}};Object.defineProperty(matcher,'lastIndex',{get(){throw 7}});var n=0;try{i.next()}catch(e){n=e}n+':'+i.next().done", "7:true"],
    ["var i=RegExp.prototype[Symbol.matchAll].call(r,'x');matcher.exec=function(){return {0:''}};Object.defineProperty(matcher,'lastIndex',{set(v){throw 8}});var n=0;try{i.next()}catch(e){n=e}n+':'+i.next().done", "8:true"],
    ["var i=RegExp.prototype[Symbol.matchAll].call(r,'x');matcher.exec=function(){return null};i.next();Object.defineProperty(matcher,'exec',{get(){throw 9}});i.next().done+''", "true"],
]) run(setup + text, expected);

for (const flags of ["g", "gu", "gv"]) run(setup + "r.flags='"+flags+"';matcher.exec=function(){return {0:''}};var i=RegExp.prototype[Symbol.matchAll].call(r,'😀');i.next();var a=matcher.lastIndex;i.next();a+':'+matcher.lastIndex", flags === "g" ? "1:2" : "2:3");
run("var log='';var matcher={set lastIndex(v){log+='s'+v},exec(){return null}};var r={get constructor(){log+='c';return species(function(o,f){log+='n'+f;return matcher})},get flags(){log+='f';return 'g'},get lastIndex(){log+='l';return 2.9}};RegExp.prototype[Symbol.matchAll].call(r,{toString(){log+='t';return 'x'}});log", "tcfngls2");
for (const text of ["String.prototype.matchAll.call(null)", "''.matchAll(/x/)", "''.matchAll(symbolObject(Symbol.matchAll,3))", "var p=symbolObject(Symbol.match,true);p.flags=null;''.matchAll(p)", "RegExp.prototype[Symbol.matchAll].call(2,'x')", "''.matchAll().next.call({})", "new String.prototype.matchAll()", "new RegExp.prototype[Symbol.matchAll]()"])
    run("try{"+text+"}catch(e){e.name}", "TypeError");

function own(object: GuestObject, key: string): Value {
    const d = object.getOwnProperty(key);
    if (d === undefined || d.kind !== "data") throw new Error("missing property " + key);
    return d.value;
}
function seed(realm: Realm, key: string, value: Value): void {
    realm.defineScriptGlobal(key, { value, writable: true, enumerable: true, configurable: true });
}
{
    const owner = fresh(), caller = fresh();
    const factory = owner.regexpPrototype.getOwnProperty(wellKnownMatchAll);
    if (factory === undefined || factory.kind !== "data") throw new Error("missing factory");
    seed(caller, "factory", factory.value);
    seed(caller, "localNext", own(caller.regexpStringIteratorPrototype, "next"));
    seed(caller, "foreignNext", own(owner.regexpStringIteratorPrototype, "next"));
    evaluate(setup + "var i=factory.call(r,'x');", caller);
    for (const [source, prototype] of [["localNext.call(i)", owner.objectPrototype], ["localNext.call(i)", caller.objectPrototype], ["foreignNext.call(i)", owner.objectPrototype]] as const) {
        const result = evaluate(source, caller);
        if (result.type !== "normal" || result.value.kind !== "object" || result.value.object.getPrototypeOf() !== prototype) throw new Error("iterator result Realm");
    }
    evaluate("matcher.exec=function(){return 3};i=factory.call(r,'x');", caller);
    const error = evaluate("localNext.call(i)", caller);
    if (error.type !== "throw" || error.value.kind !== "object" || error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("resumed error Realm");
    evaluate("matcher.exec=function(){return localNext.call(i)};i=factory.call(r,'x');", caller);
    const reentry = evaluate("foreignNext.call(i)", caller);
    if (reentry.type !== "throw" || reentry.value.kind !== "object" || reentry.value.object.getPrototypeOf() !== caller.getErrorPrototype("TypeError")) throw new Error("reentrant next Realm");
    const brand = evaluate("foreignNext.call({})", caller);
    if (brand.type !== "throw" || brand.value.kind !== "object" || brand.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("next brand Realm");
}
for (const text of ["var i='x'.matchAll(/x/g);while(true){i.next()}", setup+"matcher.exec=function(){return {0:'x'}};Array.from(RegExp.prototype[Symbol.matchAll].call(r,'x'))"]) {
    const result = evaluate(text, fresh(), 200);
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") throw new Error("matchAll iteration budget");
}
for (const target of ["String.prototype", "RegExp.prototype", "Object.getPrototypeOf(''.matchAll())"]) {
    const key = target === "String.prototype" ? "'matchAll'" : target === "RegExp.prototype" ? "Symbol.matchAll" : "'next'";
    run("var d=Object.getOwnPropertyDescriptor("+target+","+key+");d.writable+':'+d.enumerable+':'+d.configurable", "true:false:true");
}
run("RegExp.prototype[Symbol.matchAll].toString()", "function [Symbol.matchAll]() { [native code] }");
console.log("RegExp matchAll passed");

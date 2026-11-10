import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "array-of", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected)
        throw new Error(text + " expected " + expected);
}
const cases: { source: string; expected: string }[] = [
    { source: "String(Array.of().length)", expected: "0" },
    { source: "var a=Array.of(3);a.length+':'+a[0]", expected: "1:3" },
    { source: "var a=Array.of(undefined);a.length+':'+a.hasOwnProperty('0')+':'+a[0]", expected: "1:true:undefined" },
    { source: "var o={},s=Symbol();var a=Array.of(o,s);String(a[0]===o)+':'+(a[1]===s)", expected: "true:true" },
    { source: "var of=Array.of;of(1,2).join(',')+':'+Array.isArray(of.call(null,3))+':'+of.call(()=>{},4)[0]", expected: "1,2:true:4" },
    { source: "var a=Array.of.call({},7),d=Object.getOwnPropertyDescriptor(a,'0');String(Object.getPrototypeOf(a)===Array.prototype)+':'+d.value+':'+d.writable+':'+d.enumerable+':'+d.configurable", expected: "true:7:true:true:true" },
    { source: "class A extends Array{}var a=A.of(1,2);String(a instanceof A)+':'+a.length+':'+a.join(',')", expected: "true:2:1,2" },
    { source: "var seen='';function C(n){seen=arguments.length+':'+n+':'+(new.target===C)}var a=Array.of.call(C,4,5);seen+':'+(a instanceof C)+':'+a[0]+':'+a[1]+':'+a.length", expected: "1:2:true:true:4:5:2" },
    { source: "var o={};function C(){return o}var a=Array.of.call(C,6);String(a===o)+':'+o[0]+':'+o.length", expected: "true:6:1" },
    { source: "var order='';function C(){return {set length(n){order+='L'+n+':'+this[0]}}}var a=Array.of.call(C,8);order+':'+a[0]", expected: "L1:8:8" },
    { source: "var order='';function C(){return {set length(n){order+='L'+n}}}Array.of.call(C);order", expected: "L0" },
    { source: "var order='';function C(){}Object.defineProperty(C.prototype,'0',{set(v){order+='bad'}});var a=Array.of.call(C,9);order+':'+a[0]+':'+a.hasOwnProperty('0')", expected: ":9:true" },
    { source: "var o={};Object.defineProperty(o,'0',{value:1});Object.defineProperty(o,'length',{set(v){throw 7}});var r='';try{Array.of.call(function(){return o},2)}catch(e){r=e.name}r+':'+o[0]", expected: "TypeError:1" },
    { source: "var o={};Object.defineProperty(o,'length',{value:0});var r='';try{Array.of.call(function(){return o},2)}catch(e){r=e.name}r+':'+o[0]+':'+o.length", expected: "TypeError:2:0" },
    { source: "var o={};Object.defineProperty(o,'length',{value:0});var r='';try{Array.of.call(function(){return o})}catch(e){r=e.name}r", expected: "TypeError" },
    { source: "var o={};Object.preventExtensions(o);var r='';try{Array.of.call(function(){return o},2)}catch(e){r=e.name}r+':'+o.hasOwnProperty('length')", expected: "TypeError:false" },
    { source: "var r='';try{Array.of.call(function(){throw 7},2)}catch(e){r=String(e)}r", expected: "7" },
    { source: "var r='';try{Array.of.call(function(){return {set length(n){throw 8}}},2)}catch(e){r=String(e)}r", expected: "8" },
    { source: "var d=Object.getOwnPropertyDescriptor(Array,'of'),r='';try{new Array.of()}catch(e){r=e.name}Array.of.name+':'+Array.of.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r", expected: "of:0:true:false:true:TypeError" },
];
for (const c of cases) string(c.source, c.expected);
{
    const realm = fresh(), foreign = fresh(), descriptor = foreign.globalObject.getOwnProperty("Array");
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("foreign Array");
    realm.defineScriptGlobal("ForeignArray", { value: descriptor.value });
    string("var a=ForeignArray.of.call(null,1);String(Object.getPrototypeOf(a)===ForeignArray.prototype)", "true", realm);
    string("var a=ForeignArray.of.call(Array,1);String(Object.getPrototypeOf(a)===Array.prototype)", "true", realm);
}
{
    const realm = fresh();
    const prepared = prepareBoundedScript({ id: "array-of-budget", text: "Array.of(" + "0,".repeat(1000) + "0)" }, realm);
    if (prepared.kind !== "ready") throw new Error("budget prepare");
    const result = evaluateScript(createScriptSession({ maxSteps: 200, maxCalls: 32 }), prepared.record).completion;
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") throw new Error("argument budget");
}
console.log("Array.of passed");

import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function string(text: string, expected: string): void {
    const prepared = prepareBoundedScript({ id: "array-range", text }, fresh());
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected)
        throw new Error(text + " expected " + expected);
}
const cases: { source: string; expected: string }[] = [
    { source: "[1,2,3].fill(4).join(',')", expected: "4,4,4" },
    { source: "[1,2,3,4].fill(9,1,3).join(',')", expected: "1,9,9,4" },
    { source: "[1,2,3,4].fill(9,-3,-1).join(',')", expected: "1,9,9,4" },
    { source: "[1,2].fill(9,1,0).join(',')+':'+[1,2].fill(9,Infinity).join(',')", expected: "1,2:1,2" },
    { source: "[1,2].fill(9,-Infinity,Infinity).join(',')+':'+[1,2].fill(8,0.9,1.9).join(',')", expected: "9,9:8,2" },
    { source: "var a=Array(2),o={};var r=a.fill(o);String(r===a)+':'+(a[0]===o)+':'+(a[1]===o)+':'+a.hasOwnProperty('0')", expected: "true:true:true:true" },
    { source: "var a=[1];a.fill();String(a[0])+':'+a.hasOwnProperty('0')", expected: "undefined:true" },
    { source: "var order='',o={get length(){order+='l';return 2},set 0(v){order+='a'+v},set 1(v){order+='b'+v}},s={valueOf(){order+='s';return 0}},e={valueOf(){order+='e';return 2}};Array.prototype.fill.call(o,7,s,e);order", expected: "lsea7b7" },
    { source: "var a=[1,2,3];a.fill(9,{valueOf(){a.length=1;return 0}});a.join(',')", expected: "9,9,9" },
    { source: "var a=[1,2,3],r='';Object.defineProperty(a,'1',{writable:false});try{a.fill(9)}catch(e){r=e.name}r+':'+a.join(',')", expected: "TypeError:9,2,3" },
    { source: "var o={0:1,length:1};Object.defineProperty(o,'length',{writable:false});String(Array.prototype.fill.call(o,2)===o)+':'+o[0]+':'+o.length", expected: "true:2:1" },
    { source: "var r='';try{Array.prototype.fill.call('ab','x')}catch(e){r=e.name}r", expected: "TypeError" },
    { source: "String(Array.prototype.fill.call(3,4).valueOf())", expected: "3" },
    { source: "[1,2,3,4].copyWithin(1,0,3).join(',')", expected: "1,1,2,3" },
    { source: "[1,2,3,4].copyWithin(0,1).join(',')", expected: "2,3,4,4" },
    { source: "[1,2,3,4].copyWithin(-2,-4,-2).join(',')", expected: "1,2,1,2" },
    { source: "[1,2,3].copyWithin(Infinity,0).join(',')+':'+[1,2,3].copyWithin(0,-Infinity,1).join(',')", expected: "1,2,3:1,2,3" },
    { source: "var a=[1,,3,4];a.copyWithin(2,0,2);a.join(',')+':'+a.hasOwnProperty('3')", expected: "1,,1,:false" },
    { source: "var o=Object.create({0:7});o.length=2;Array.prototype.copyWithin.call(o,1,0,1);o[1]+':'+o.hasOwnProperty('1')", expected: "7:true" },
    { source: "var order='',o={length:3,get 0(){order+='g0';return 1},get 1(){order+='g1';return 2},set 1(v){order+='s1'+v},set 2(v){order+='s2'+v}};Array.prototype.copyWithin.call(o,1,0,2);order", expected: "g1s22g0s11" },
    { source: "var order='',o={get length(){order+='l';return 2},0:1,1:2},t={valueOf(){order+='t';return 0}},s={valueOf(){order+='s';return 1}},e={valueOf(){order+='e';return 2}};Array.prototype.copyWithin.call(o,t,s,e);order+':'+o[0]", expected: "ltse:2" },
    { source: "var a=[1,2,3];a.copyWithin(0,{valueOf(){a[1]=9;return 1}});a.join(',')", expected: "9,3,3" },
    { source: "var a=[1,2,3],r='';Object.defineProperty(a,'1',{writable:false});try{a.copyWithin(1,0,2)}catch(e){r=e.name}r+':'+a.join(',')", expected: "TypeError:1,2,2" },
    { source: "var a=[1,,3],r='';Object.defineProperty(a,'2',{configurable:false});try{a.copyWithin(2,1,2)}catch(e){r=e.name}r+':'+a.join(',')", expected: "TypeError:1,,3" },
    { source: "var o={0:1,1:2,length:2};Object.defineProperty(o,'length',{writable:false});String(Array.prototype.copyWithin.call(o,0,1)===o)+':'+o[0]+':'+o.length", expected: "true:2:2" },
    { source: "var r='';try{Array.prototype.copyWithin.call('ab',0,1)}catch(e){r=e.name}r", expected: "TypeError" },
    { source: "var order='',o={length:0},s={valueOf(){order+='s';return 0}},e={valueOf(){order+='e';return 0}};Array.prototype.fill.call(o,1,s,e);Array.prototype.copyWithin.call(o,s,s,e);order", expected: "sesse" },
    { source: "var a=[1,2];Object.freeze(a);a.fill(9,2);a.copyWithin(2,0);a.join(',')", expected: "1,2" },
];
for (const c of cases) string(c.source, c.expected);
for (const method of ["fill", "copyWithin"]) {
    string("var r='';try{Array.prototype." + method + ".call(null,0)}catch(e){r=e.name}r", "TypeError");
    string("var d=Object.getOwnPropertyDescriptor(Array.prototype,'" + method + "');d.value.name+':'+d.value.length+':'+d.writable+':'+d.enumerable+':'+d.configurable", method + ":" + (method === "fill" ? "1" : "2") + ":true:false:true");
    const prepared = prepareBoundedScript({ id: "range-budget", text: "try{Array.prototype." + method + ".call({length:9007199254740991},0)}catch(e){'caught'}" }, fresh());
    if (prepared.kind !== "ready") throw new Error("budget prepare");
    const result = evaluateScript(createScriptSession({ maxSteps: 200, maxCalls: 32 }), prepared.record).completion;
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") throw new Error("range budget");
}
console.log("Array range mutation passed");

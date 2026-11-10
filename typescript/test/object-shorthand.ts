import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, expected: string): void {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({id: "object-shorthand", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected) throw new Error(text);
}
for (const [text, expected] of [
    ["var x=7;({x}).x+''", "7"],
    ["let x=1;var o;{let x=2;o={x}}o.x+':'+x", "2:1"],
    ["var get=1,set=2;var o={get,set,};Object.keys(o).join(',')+':'+o.get+':'+o.set", "get,set:1:2"],
    ["var __proto__=7;var o={__proto__};Object.hasOwn(o,'__proto__')+':'+o.__proto__+':'+(Object.getPrototypeOf(o)===Object.prototype)", "true:7:true"],
    ["var x=1,o={x,x:2,x};o.x+':'+Object.keys(o).length", "1:1"],
    ["var x=3,d=Object.getOwnPropertyDescriptor({x},'x');d.value+':'+d.writable+':'+d.enumerable+':'+d.configurable", "3:true:true:true"],
    ["var log='';try{var o={missing,x:(log+='bad',1)}}catch(e){log=e.name}log", "ReferenceError"],
    ["var log='';try{{var o={x};let x=1}}catch(e){log=e.name}log", "ReferenceError"],
    ["function f(){}var o={f};(o.f===f)+':'+o.f.name+':'+o.f.hasOwnProperty('prototype')", "true:f:true"],
    ["var log='';Object.defineProperty(this,'x',{get(){log+='x';return 1},configurable:true});var o={x,y:(log+='y',2)};log+':'+o.x", "xy:1"],
    ["function f(a){return {arguments}}f(4).arguments[0]+''", "4"],
    ["var x;({x=7}={});({x}).x+''", "7"],
    ["var x=1,o={[x]:2,x};o[1]+':'+o.x", "2:1"],
    ["var x=1;eval('({x}).x')+''", "1"],
]) run(text, expected);
for (const text of ["({x=1})", "({x=1}).x", "({x=1},2)", "({true})", "({null})", "({'x'})", "({1})", "({[x]})", "({get x})", "({set x})"]) {
    const realm = new Realm((_line: string) => {}, "script");
    if (prepareBoundedScript({id: "invalid-shorthand", text}, realm).kind === "ready") throw new Error("accepted " + text);
}
console.log("Object shorthand passed");

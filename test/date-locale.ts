import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-locale", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") throw new Error("completion: " + text);
    return result.value;
}
function passes(text: string): void { const value = run(text); if (value.kind !== "boolean" || !value.value) throw new Error(text); }
const names=["toLocaleString","toLocaleDateString","toLocaleTimeString"];
const expected=["Thu Jan 01 1970 00:00:00 GMT+0000 (Coordinated Universal Time)","Thu Jan 01 1970","00:00:00 GMT+0000 (Coordinated Universal Time)"];
for(let i=0;i<names.length;i++){
 const name=names[i];
 passes('new Date(0).'+name+'()==="'+expected[i]+'"');
 passes('new Date(NaN).'+name+'()==="Invalid Date"');
 passes('Date.prototype.'+name+'.length===0&&Date.prototype.'+name+'.name==="'+name+'"');
 passes('var x={get length(){throw 1},get timeZone(){throw 2},toString:function(){throw 3}};new Date(0).'+name+'(x,x)==="'+expected[i]+'"');
 passes('var d=new Date(0);d.toString=function(){throw 1};d.valueOf=function(){throw 2};d.toISOString=function(){throw 3};d.'+name+'()==="'+expected[i]+'"');
 passes('var d=Object.freeze(new Date(0));Object.getOwnPropertyDescriptor(Date.prototype,"'+name+'").writable&&d.'+name+'()==="'+expected[i]+'"');
 for(const receiver of ['{}','Date.prototype','0','null','undefined'])passes('var ok=false;try{Date.prototype.'+name+'.call('+receiver+')}catch(e){ok=e instanceof TypeError}ok');
}
passes('new Date(-1).toLocaleDateString()==="Wed Dec 31 1969"&&new Date(-1).toLocaleTimeString()==="23:59:59 GMT+0000 (Coordinated Universal Time)"');
passes('new Date("0000-01-01").toLocaleDateString()==="Sat Jan 01 0000"');
passes('new Date(8640000000000000).toLocaleDateString()==="Sat Sep 13 275760"');
const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("format", { value: run("Date.prototype.toLocaleString", owner) });
caller.defineScriptGlobal("OwnerTypeError", { value: run("TypeError", owner) });
const cross = run('var ok=false;try{format.call({})}catch(e){ok=e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok', caller);
if (cross.kind !== "boolean" || !cross.value) throw new Error("Date locale Realm");
console.log("date locale passed");

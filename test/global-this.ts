import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function evaluate(text: string, realm: Realm): ValueCompletion {
    const prepared = prepareBoundedScript({id: "global-this", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
for (const text of [
    "globalThis===this",
    "'use strict';globalThis===this",
    "var d=Object.getOwnPropertyDescriptor(this,'globalThis');d.value===this&&d.writable&&!d.enumerable&&d.configurable",
    "var original=this;globalThis=7;globalThis===7&&this===original&&(function(){return this})()===original",
    "var original=this;delete this.globalThis;typeof globalThis==='undefined'&&this===original",
    "let globalThis=7;globalThis===7&&this.globalThis===this",
    "var globalThis;globalThis===this",
    "globalThis.x=7;x===7",
    "eval('globalThis')===this&&(0,eval)('globalThis')===this",
    "Object.defineProperty(this,'globalThis',{value:7,writable:false});globalThis=9;globalThis===7",
    "'use strict';Object.defineProperty(this,'globalThis',{writable:false});var caught=false;try{globalThis=1}catch(e){caught=e instanceof TypeError}caught",
]) {
    const result = evaluate(text, fresh());
    if (result.type !== "normal" || !sameValue(result.value, {kind: "boolean", value: true})) throw new Error(text);
}
{
    const owner = fresh(), caller = fresh();
    const fn = evaluate("function f(){return globalThis}f", owner);
    if (fn.type !== "normal") throw new Error("foreign function");
    caller.defineScriptGlobal("foreign", {value: fn.value});
    const result = evaluate("foreign()", caller);
    if (result.type !== "normal" || !sameValue(result.value, owner.globalThisValue) || sameValue(result.value, caller.globalThisValue)) throw new Error("globalThis Realm");
}
console.log("Global this passed");

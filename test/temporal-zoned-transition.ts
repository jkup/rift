import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-transition", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
for (const zone of ["UTC", "+05:30", "-23:59"]) for (const epoch of ["0n", "-8640000000000000000000n", "8640000000000000000000n"]) {
    const result = run('var z=new Temporal.ZonedDateTime('+epoch+',"'+zone+'");z.getTimeZoneTransition("next")===null&&z.getTimeZoneTransition({direction:"previous"})===null');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, zone + epoch);
}
for (const text of [
    'var t="";var r=new Temporal.ZonedDateTime(0n,"UTC").getTimeZoneTransition({get direction(){t+="D";return{toString(){t+="d";return "next"}}}});r===null&&t==="Dd"',
    'var t="";try{Temporal.ZonedDateTime.prototype.getTimeZoneTransition.call({}, {get direction(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'var t="";try{new Temporal.ZonedDateTime(0n,"UTC").getTimeZoneTransition({get direction(){throw 7}})}catch(e){t+=e}t==="7"',
    'var o=function(){};o.direction="previous";new Temporal.ZonedDateTime(0n,"UTC").getTimeZoneTransition(o)===null',
    'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"timeZoneId",{get(){throw 1}});z.getTimeZoneTransition("next",{get direction(){throw 2}})===null',
    'var d=Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"getTimeZoneTransition");d.writable&&!d.enumerable&&d.configurable&&d.value.length===1&&d.value.name==="getTimeZoneTransition"',
]) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const input of ['undefined','null','true','1','1n','Symbol()','{direction:Symbol()}']) {
    const result = run('var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").getTimeZoneTransition('+input+')}catch(e){ok=e instanceof TypeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, input);
}
for (const input of ['{}','{direction:undefined}','"NEXT"','""','{direction:null}','{direction:0}']) {
    const result = run('var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").getTimeZoneTransition('+input+')}catch(e){ok=e instanceof RangeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, input);
}
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.ZonedDateTime.prototype.getTimeZoneTransition", defining);
if (method.type !== "normal") throw new Error("lookup");
calling.defineScriptGlobal("transition", { value: method.value });
const failed = run('transition.call(new Temporal.ZonedDateTime(0n,"UTC"),{})', calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"), "defining Realm error");
console.log("temporal zoned transition passed");

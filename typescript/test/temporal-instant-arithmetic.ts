import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "instant-arithmetic", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}

for (const text of [
    'new Temporal.Instant(1n).add({hours:1,minutes:2,seconds:3,milliseconds:4,microseconds:5,nanoseconds:6}).epochNanoseconds===3723004005007n',
    'new Temporal.Instant(1n).subtract("PT1.000000001S").epochNanoseconds===-1000000000n',
    'new Temporal.Instant(-1n).add("PT0.000000001S").epochNanoseconds===0n',
    'new Temporal.Instant(1n).add({nanoseconds:9007199254740992}).epochNanoseconds===9007199254740993n',
    'new Temporal.Instant(1n).subtract({nanoseconds:-9007199254740992}).epochNanoseconds===9007199254740993n',
    'new Temporal.Instant(0n).add("PT24H").epochNanoseconds===86400000000000n',
    'new Temporal.Instant(8640000000000000000000n).subtract({nanoseconds:1}).epochNanoseconds===8639999999999999999999n',
    'new Temporal.Instant(-8640000000000000000000n).add({nanoseconds:1}).epochNanoseconds===-8639999999999999999999n',
    'new Temporal.Instant(8639999999999999999999n).add({nanoseconds:1}).epochNanoseconds===8640000000000000000000n',
    'new Temporal.Instant(-8639999999999999999999n).subtract({nanoseconds:1}).epochNanoseconds===-8640000000000000000000n',
    'var d=new Temporal.Duration(0,0,0,0,1);Object.defineProperty(d,"hours",{get(){throw 1}});new Temporal.Instant(0n).add(d).epochNanoseconds===3600000000000n',
    'var t=new Temporal.Instant(1n),r=t.add({seconds:0});r!==t&&r.epochNanoseconds===1n&&t.epochNanoseconds===1n',
    'class I extends Temporal.Instant{}var r=new I(1n).add({seconds:1});!(r instanceof I)&&Object.getPrototypeOf(r)===Temporal.Instant.prototype',
    'var t=new Temporal.Instant(1n);Object.defineProperty(t,"epochNanoseconds",{get(){throw 1}});Object.defineProperty(t,"constructor",{get(){throw 2}});t.add({nanoseconds:1}).epochNanoseconds===2n',
    'var log="";var ok=false;try{new Temporal.Instant(0n).add({get days(){log+="d";return 1},get hours(){log+="h";return {valueOf(){log+="H";return 2}}},get years(){log+="y";throw 42}})}catch(e){ok=e===42}ok&&log==="dhHy"',
    'new Temporal.Instant(1n).add({seconds:0},{get overflow(){throw 1}}).epochNanoseconds===1n',
]) passes(text);

for (const method of ["add", "subtract"]) {
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.Instant.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
    passes('var touched=false,ok=false;try{Temporal.Instant.prototype.'+method+'.call({}, {get hours(){touched=true;return 1}})}catch(e){ok=e instanceof TypeError}ok&&!touched');
    for (const value of ['undefined','null','1','{}','{hours:1n}'])
        passes('var ok=false;try{new Temporal.Instant(0n).'+method+'('+value+')}catch(e){ok=e instanceof TypeError}ok');
    for (const value of ['"bad"','"P1D"','{years:1}','{months:-1}','{weeks:1}','{days:-1}','{hours:0.5}','{hours:Infinity}','{hours:1,seconds:-1}'])
        passes('var ok=false;try{new Temporal.Instant(0n).'+method+'('+value+')}catch(e){ok=e instanceof RangeError}ok');
    for (const sign of [1,-1]) {
        const direction = method === "add" ? sign : -sign;
        passes('var ok=false;try{new Temporal.Instant('+sign+'n*8640000000000000000000n).'+method+'({nanoseconds:'+direction+'})}catch(e){ok=e instanceof RangeError}ok');
    }
    const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
    const fn = run('Temporal.Instant.prototype.'+method, defining);
    if (fn.type !== "normal") throw new Error("method lookup");
    calling.defineScriptGlobal("arithmetic", { value: fn.value });
    const result = run('arithmetic.call(new Temporal.Instant(1n),new Temporal.Duration(0,0,0,0,1))', calling);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === defining.temporalInstantPrototype, "defining Realm result");
    const failed = run('arithmetic.call(new Temporal.Instant(0n), {days:1})', calling);
    check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"), "defining Realm error");
}
console.log("temporal instant arithmetic passed");

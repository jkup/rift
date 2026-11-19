import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    text: string,
    realm: Realm = new Realm((_line: string) => {}, "script"),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "plain-time-arithmetic", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const r = run(text);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
const cases = [
    'new Temporal.PlainTime(1,2,3,4,5,6).add({hours:2,minutes:3,seconds:4,milliseconds:5,microseconds:6,nanoseconds:7}).toString()==="03:05:07.009011013"',
    'new Temporal.PlainTime(3,5,7,9,11,13).subtract({hours:2,minutes:3,seconds:4,milliseconds:5,microseconds:6,nanoseconds:7}).toString()==="01:02:03.004005006"',
    'new Temporal.PlainTime().subtract({nanoseconds:1}).toString()==="23:59:59.999999999"',
    'new Temporal.PlainTime(23,59,59,999,999,999).add({nanoseconds:1}).toString()==="00:00:00"',
    'new Temporal.PlainTime().add("-PT25H").toString()==="23:00:00"',
    'new Temporal.PlainTime().subtract("-PT25H").toString()==="01:00:00"',
    'new Temporal.PlainTime(1).add("P1Y2M3W4DT1H").toString()==="02:00:00"',
    'new Temporal.PlainTime(1).subtract("P1Y2M3W4D").toString()==="01:00:00"',
    'new Temporal.PlainTime(0,0,0,0,0,1).add({nanoseconds:9007199254740992}).toString()==="05:59:59.254740993"',
    'new Temporal.PlainTime(0,0,0,0,0,1).subtract({nanoseconds:-9007199254740992}).toString()==="05:59:59.254740993"',
    'var d=new Temporal.Duration(0,0,0,0,1);Object.defineProperty(d,"hours",{get(){throw 1}});new Temporal.PlainTime().add(d).hour===1',
    "new Temporal.PlainTime().add({hours:1},{get overflow(){throw 1}}).hour===1",
    "var t=new Temporal.PlainTime(1),r=t.add({hours:0});r!==t&&r.hour===1&&t.hour===1",
    "class T extends Temporal.PlainTime{}var r=new T(1).add({hours:1});!(r instanceof T)&&Object.getPrototypeOf(r)===Temporal.PlainTime.prototype",
    'var t=new Temporal.PlainTime(1);Object.defineProperty(t,"hour",{get(){throw 1}});Object.defineProperty(t,"constructor",{get(){throw 2}});t.add({hours:1}).hour===2',
    'var log="";new Temporal.PlainTime().add({get days(){log+="d";return 1},get hours(){log+="h";return {valueOf(){log+="H";return 2}}},get years(){log+="y";return 1}}).hour===2&&log==="dhHy"',
    "var ok=false;try{new Temporal.PlainTime().add({days:9007199254740992,get years(){throw 42}})}catch(e){ok=e===42}ok",
];
for (const text of cases) {
    passes(text);
}
for (const method of ["add", "subtract"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
    );
    passes(
        "var touched=false;var ok=false;try{Temporal.PlainTime.prototype." +
            method +
            ".call({}, {get hours(){touched=true;return 1}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    );
    for (const value of ["undefined", "null", "1", "{}", "{hours:1n}"]) {
        passes(
            "var ok=false;try{new Temporal.PlainTime()." +
                method +
                "(" +
                value +
                ")}catch(e){ok=e instanceof TypeError}ok",
        );
    }
    for (const value of [
        '"bad"',
        "{hours:0.5}",
        "{hours:Infinity}",
        "{years:1,hours:-1}",
        "{years:4294967296}",
    ]) {
        passes(
            "var ok=false;try{new Temporal.PlainTime()." +
                method +
                "(" +
                value +
                ")}catch(e){ok=e instanceof RangeError}ok",
        );
    }
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const fn = run("Temporal.PlainTime.prototype." + method, defining);
    if (fn.type !== "normal") {
        throw new Error("method lookup");
    }
    calling.defineScriptGlobal("arithmetic", { value: fn.value });
    const result = run(
        "arithmetic.call(new Temporal.PlainTime(1),new Temporal.Duration(0,0,0,0,1))",
        calling,
    );
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === defining.temporalPlainTimePrototype,
        "defining Realm result",
    );
    const failed = run("arithmetic.call({}, {})", calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
console.log("temporal plain time arithmetic passed");

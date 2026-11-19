import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "date-time-core", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}

for (const text of [
    'new Temporal.PlainDateTime(2024,1,31,23).add({months:1,hours:2}).toString()==="2024-03-01T01:00:00"',
    'new Temporal.PlainDateTime(2024,3,31,0,30).subtract({months:1,hours:1}).toString()==="2024-02-28T23:30:00"',
    'new Temporal.PlainDateTime(2024,1,1).subtract({nanoseconds:1}).toString()==="2023-12-31T23:59:59.999999999"',
    'new Temporal.PlainDateTime(2024,2,28,23,59,59,999,999,999).add({nanoseconds:1}).toString()==="2024-02-29T00:00:00"',
    'new Temporal.PlainDateTime(2024,2,29,12).add({years:1}).toString()==="2025-02-28T12:00:00"',
    'new Temporal.PlainDateTime(2024,1,1,23).add({weeks:1,days:2,hours:2}).toString()==="2024-01-11T01:00:00"',
    'new Temporal.PlainDateTime(2024,1,1).subtract({hours:-25}).toString()==="2024-01-02T01:00:00"',
    'new Temporal.PlainDateTime(0,1,1).add("-PT1H").toString()==="-000001-12-31T23:00:00"',
    'new Temporal.PlainDateTime(1970,1,1).add({nanoseconds:86400000000000016}).toString()==="1972-09-27T00:00:00.000000016"',
    'new Temporal.PlainDateTime(2024,1,1,12).add(new Temporal.Duration(0,0,0,0,12)).toString()==="2024-01-02T00:00:00"',
    "var d=new Temporal.PlainDateTime(2024,1,1);var r=d.add({hours:0});r!==d&&r.equals(d)",
    "class D extends Temporal.PlainDateTime{};Object.getPrototypeOf(new D(2024,1,1).add({days:1}))===Temporal.PlainDateTime.prototype",
    'var log="";new Temporal.PlainDateTime(2024,1,1).add({get days(){log+="d";return 1},get hours(){log+="h"},get microseconds(){log+="u"},get milliseconds(){log+="l"},get minutes(){log+="m"},get months(){log+="M"},get nanoseconds(){log+="n"},get seconds(){log+="s"},get weeks(){log+="w"},get years(){log+="y"}},{get overflow(){log+="o";return "reject"}});log==="dhulmMnswyo"',
    "var ok=false;try{new Temporal.PlainDateTime(2024,1,31).add({months:1},{get overflow(){throw 42}})}catch(e){ok=e===42}ok",
    "var touched=false,ok=false;try{new Temporal.PlainDateTime(2024,1,1).add({days:1,hours:-1},{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    "var touched=false,ok=false;try{Temporal.PlainDateTime.prototype.add.call({}, {get days(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var d=new Temporal.PlainDateTime(2024,1,1,12);Object.defineProperty(d,"hour",{get(){throw 1}});d.add({hours:1}).hour===13',
    "new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).add({nanoseconds:1}).nanosecond===2",
]) {
    passes(text);
}
for (const method of ["add", "subtract"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
    );
    passes(
        "var ok=false;try{new Temporal.PlainDateTime(2024,1,1)." +
            method +
            "({days:1},null)}catch(e){ok=e instanceof TypeError}ok",
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const fn = run("Temporal.PlainDateTime.prototype." + method, defining);
    if (fn.type !== "normal") {
        throw new Error("lookup");
    }
    calling.defineScriptGlobal("shift", { value: fn.value });
    const result = run("shift.call(new Temporal.PlainDateTime(2024,1,1),{hours:1})", calling);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === defining.temporalPlainDateTimePrototype,
        "defining Realm result",
    );
    const failed = run("shift.call({}, {})", calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
for (const text of [
    'new Temporal.PlainDateTime(2024,1,31).add({months:1},{overflow:"reject"})',
    "new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).subtract({nanoseconds:1})",
    "new Temporal.PlainDateTime(275760,9,13,23,59,59,999,999,999).add({nanoseconds:1})",
    "new Temporal.PlainDateTime(2024,1,1).add({years:4294967295})",
    "new Temporal.PlainDateTime(2024,1,1).add({seconds:9007199254740991})",
]) {
    passes("var ok=false;try{" + text + "}catch(e){ok=e instanceof RangeError}ok");
}
console.log("temporal plain date time arithmetic passed");

import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { GuestObject, ValueCompletion } from "../src/runtime.js";

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
    'var d=new Temporal.PlainDateTime(2024,2,29,12,34,56,123,456,789);d.toPlainDate().toString()==="2024-02-29"&&d.toPlainTime().toString()==="12:34:56.123456789"',
    "var d=new Temporal.PlainDateTime(2024,1,1,12);d.toPlainDate()!==d.toPlainDate()&&d.toPlainTime()!==d.toPlainTime()",
    'var d=new Temporal.PlainDateTime(2024,1,1,12);d.withPlainTime().toString()==="2024-01-01T00:00:00"&&d.hour===12',
    'new Temporal.PlainDateTime(2024,1,1).withPlainTime("12:34").toString()==="2024-01-01T12:34:00"',
    'new Temporal.PlainDateTime(2024,1,1).withPlainTime({hour:99,minute:-1}).toString()==="2024-01-01T23:00:00"',
    'new Temporal.PlainDateTime(2024,1,1).withPlainTime(new Temporal.PlainDateTime(2000,2,29,12,34)).toString()==="2024-01-01T12:34:00"',
    'var d=new Temporal.PlainDateTime(2024,1,1,12);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"hour",{get(){throw 2}});Object.defineProperty(d,"calendar",{get(){throw 3}});d.toPlainDate().year===2024&&d.toPlainTime().hour===12&&d.withPlainTime(d).hour===12&&d.withCalendar(d).hour===12',
    'var d=new Temporal.PlainDateTime(2024,1,1);var c=d.withCalendar("ISO8601");c!==d&&c.equals(d)',
    'new Temporal.PlainDateTime(2024,1,1).withCalendar("2000-01-01[u-ca=iso8601]").year===2024',
    'class D extends Temporal.PlainDateTime{};var d=new D(2024,1,1);Object.getPrototypeOf(d.withPlainTime())===Temporal.PlainDateTime.prototype&&Object.getPrototypeOf(d.withCalendar("iso8601"))===Temporal.PlainDateTime.prototype',
    'var d=new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1);d.toPlainDate().toString()==="-271821-04-19"&&d.toPlainTime().nanosecond===1&&d.withPlainTime({nanosecond:1}).nanosecond===1',
    "var ok=false;try{new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).withPlainTime()}catch(e){ok=e instanceof RangeError}ok",
    'var log="";new Temporal.PlainDateTime(2024,1,1).withPlainTime({get hour(){log+="h";return 1},get microsecond(){log+="u"},get millisecond(){log+="l"},get minute(){log+="m"},get nanosecond(){log+="n"},get second(){log+="s"}});log==="hulmns"',
    "var touched=false,ok=false;try{Temporal.PlainDateTime.prototype.withPlainTime.call({}, {get hour(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
]) {
    passes(text);
}
for (const value of ["null", "1", "{}", "new Temporal.PlainDate(2024,1,1)"]) {
    passes(
        "var ok=false;try{new Temporal.PlainDateTime(2024,1,1).withPlainTime(" +
            value +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
passes(
    'var ok=false;try{new Temporal.PlainDateTime(2024,1,1).withCalendar("gregory")}catch(e){ok=e instanceof RangeError}ok',
);
for (const method of ["toPlainDate", "toPlainTime", "withPlainTime", "withCalendar"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===' +
            (method === "withCalendar" ? 1 : 0) +
            "&&d.writable&&!d.enumerable&&d.configurable",
    );
    passes(
        "var ok=false;try{Temporal.PlainDateTime.prototype." +
            method +
            ".call({})}catch(e){ok=e instanceof TypeError}ok",
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const fn = run("Temporal.PlainDateTime.prototype." + method, defining);
    if (fn.type !== "normal") {
        throw new Error("lookup");
    }
    calling.defineScriptGlobal("part", { value: fn.value });
    const result = run(
        "part.call(new Temporal.PlainDateTime(2024,1,1)," +
            (method === "withCalendar" ? '"iso8601"' : "undefined") +
            ")",
        calling,
    );
    let prototype: GuestObject;
    if (method === "toPlainDate") {
        prototype = defining.temporalPlainDatePrototype;
    } else if (method === "toPlainTime") {
        prototype = defining.temporalPlainTimePrototype;
    } else {
        prototype = defining.temporalPlainDateTimePrototype;
    }
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === prototype,
        "defining Realm result",
    );
    const failed = run("part.call({})", calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
console.log("temporal plain date time parts passed");

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
    'new Temporal.PlainDateTime(2024,2,29,12,34,56,123,456,789).with({year:2023}).toString()==="2023-02-28T12:34:56.123456789"',
    'new Temporal.PlainDateTime(2024,1,31,12).with({month:2}).toString()==="2024-02-29T12:00:00"',
    'new Temporal.PlainDateTime(2024,1,31,12).with({monthCode:"M02"}).toString()==="2024-02-29T12:00:00"',
    'new Temporal.PlainDateTime(2024,1,1,12,34,56,123,456,789).with({hour:undefined,minute:0,nanosecond:1}).toString()==="2024-01-01T12:00:56.123456001"',
    'new Temporal.PlainDateTime(2024,1,1,12).with({hour:99,minute:-1}).toString()==="2024-01-01T23:00:00"',
    "var d=new Temporal.PlainDateTime(2024,1,1);var c=d.with({day:1});c!==d&&c.equals(d)",
    "class D extends Temporal.PlainDateTime{};Object.getPrototypeOf(new D(2024,1,1).with({day:2}))===Temporal.PlainDateTime.prototype",
    "var ok=false,touched=false;try{new Temporal.PlainDateTime(2024,1,1).with({hour:undefined},{get overflow(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var ok=false;try{new Temporal.PlainDateTime(2024,1,1).with({monthCode:"M13"},{get overflow(){throw 42}})}catch(e){ok=e===42}ok',
    'var ok=false,touched=false;try{new Temporal.PlainDateTime(2024,1,1).with({monthCode:"M00"},{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var log="";new Temporal.PlainDateTime(2024,1,1).with({get calendar(){log+="c"},get timeZone(){log+="z"},get day(){log+="d";return 2},get hour(){log+="h"},get microsecond(){log+="u"},get millisecond(){log+="l"},get minute(){log+="i"},get month(){log+="m"},get monthCode(){log+="C"},get nanosecond(){log+="n"},get second(){log+="s"},get year(){log+="y"}},{get overflow(){log+="o";return "reject"}});log==="czdhulimCnsyo"',
    'var touched=false,ok=false;try{new Temporal.PlainDateTime(2024,1,1).with({calendar:"iso8601",get timeZone(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    "var touched=false,ok=false;try{Temporal.PlainDateTime.prototype.with.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var d=new Temporal.PlainDateTime(2024,1,1,12);Object.defineProperty(d,"hour",{get(){throw 1}});Object.defineProperty(d,"year",{get(){throw 2}});d.with({day:2}).toString()==="2024-01-02T12:00:00"',
    "var d=new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1);d.with({nanosecond:2}).nanosecond===2",
    "var ok=false;try{new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).with({nanosecond:0})}catch(e){ok=e instanceof RangeError}ok",
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"with");d.value.name==="with"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
]) {
    passes(text);
}
for (const partial of [
    "undefined",
    "null",
    '"2024-01-01"',
    "{}",
    "{hour:undefined}",
    '{timeZone:"UTC"}',
    "new Temporal.PlainDateTime(2024,1,1)",
    "new Temporal.PlainDate(2024,1,1)",
    "new Temporal.PlainTime()",
]) {
    passes(
        "var ok=false;try{new Temporal.PlainDateTime(2024,1,1).with(" +
            partial +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const partial of ['{month:2,monthCode:"M03"}', '{monthCode:"M01L"}', "{hour:Infinity}"]) {
    passes(
        "var ok=false;try{new Temporal.PlainDateTime(2024,1,1).with(" +
            partial +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const partial of ["{year:2023}", "{hour:24}", "{minute:-1}"]) {
    passes(
        "var ok=false;try{new Temporal.PlainDateTime(2024,2,29).with(" +
            partial +
            ',{overflow:"reject"})}catch(e){ok=e instanceof RangeError}ok',
    );
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const fn = run("Temporal.PlainDateTime.prototype.with", defining);
if (fn.type !== "normal") {
    throw new Error("lookup");
}
calling.defineScriptGlobal("replace", { value: fn.value });
const result = run("replace.call(new Temporal.PlainDateTime(2024,1,1),{hour:2})", calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainDateTimePrototype,
    "defining Realm result",
);
const failed = run("replace.call({}, {})", calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "defining Realm error",
);
console.log("temporal plain date time with passed");

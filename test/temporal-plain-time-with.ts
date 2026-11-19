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
    const prepared = prepareBoundedScript({ id: "plain-time-with", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const cases = [
    'new Temporal.PlainTime(1,2,3,4,5,6).with({hour:7}).toString()==="07:02:03.004005006"',
    'new Temporal.PlainTime(1,2,3,4,5,6).with({minute:8,second:9}).toString()==="01:08:09.004005006"',
    'new Temporal.PlainTime(1,2,3,4,5,6).with({millisecond:7,microsecond:8,nanosecond:9}).toString()==="01:02:03.007008009"',
    'new Temporal.PlainTime(1,2,3).with({hour:undefined,minute:null,second:true}).toString()==="01:00:01"',
    'new Temporal.PlainTime().with({hour:99,minute:-1,second:99,millisecond:-1,microsecond:9999,nanosecond:9999}).toString()==="23:00:59.000999999"',
    'new Temporal.PlainTime().with({hour:2.9,minute:3.9}).toString()==="02:03:00"',
    "Object.is(new Temporal.PlainTime().with({hour:-0.5}).hour,0)",
    "new Temporal.PlainTime().with({hour:1e100}).hour===23",
    "var t=new Temporal.PlainTime(1);var r=t.with({hour:1});r!==t&&t.hour===1&&r.hour===1",
    "class T extends Temporal.PlainTime{}var r=new T(1).with({hour:2});!(r instanceof T)&&r instanceof Temporal.PlainTime",
    'var t=new Temporal.PlainTime(1);Object.defineProperty(t,"constructor",{get(){throw 1}});Object.defineProperty(t,"hour",{get(){throw 2}});t.with({minute:2}).hour===1',
    "var fields=Object.create({minute:7});new Temporal.PlainTime().with(fields).minute===7",
    "var fields=new Temporal.Instant(0n);fields.hour=7;new Temporal.PlainTime().with(fields).hour===7",
    "var t=new Temporal.PlainTime(7);Object.setPrototypeOf(t,null);Temporal.PlainTime.prototype.with.call(t,{minute:2}).hour===7",
    "new Temporal.PlainTime().with({hour:7,calendar:undefined,timeZone:undefined}).hour===7",
    'var log="";var p={get calendar(){log+="c"},get timeZone(){log+="z"},get hour(){log+="h";return {valueOf(){log+="H";return 2}}},get microsecond(){log+="u"},get millisecond(){log+="l"},get minute(){log+="m"},get nanosecond(){log+="n"},get second(){log+="s"}};new Temporal.PlainTime().with(p,{get overflow(){log+="o";return {toString(){log+="O";return "reject"}}}}).hour===2&&log==="czhHulmnsoO"',
    "var touched=false;var ok=false;try{new Temporal.PlainTime().with({calendar:null,get timeZone(){touched=true},hour:1})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var touched=false;var p=new Temporal.PlainTime();Object.defineProperty(p,"calendar",{get(){touched=true}});var ok=false;try{new Temporal.PlainTime().with(p)}catch(e){ok=e instanceof TypeError}ok&&!touched',
    "var touched=false;var ok=false;try{Temporal.PlainTime.prototype.with.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    "var touched=false;var ok=false;try{new Temporal.PlainTime().with({}, {get overflow(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    "var touched=false;var ok=false;try{new Temporal.PlainTime().with({hour:Infinity,get minute(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    'var log="";var ok=false;try{new Temporal.PlainTime().with({hour:24,get second(){log+="s";return 0}},{get overflow(){log+="o";return "reject"}})}catch(e){ok=e instanceof RangeError}ok&&log==="so"',
    "var ok=false;try{new Temporal.PlainTime().with({get second(){throw 42}},null)}catch(e){ok=e===42}ok",
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"with");d.value.name==="with"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
];
for (const text of cases) {
    passes(text);
}
for (const value of [
    "undefined",
    "null",
    "1",
    "true",
    '"12:00"',
    "1n",
    "Symbol()",
    "{}",
    "{hour:undefined}",
    '{calendar:"iso8601",hour:1}',
    '{timeZone:"UTC",hour:1}',
    "new Temporal.PlainTime()",
]) {
    passes(
        "var ok=false;try{new Temporal.PlainTime().with(" +
            value +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
const names = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"];
for (let i = 0; i < names.length; i++) {
    let limit: 24 | 60 | 1000;
    if (i === 0) {
        limit = 24;
    } else if (i < 3) {
        limit = 60;
    } else {
        limit = 1000;
    }
    for (const value of [-1, limit, NaN, Infinity]) {
        passes(
            "var ok=false;try{new Temporal.PlainTime().with({" +
                names[i] +
                ":" +
                value +
                '},{overflow:"reject"})}catch(e){ok=e instanceof RangeError}ok',
        );
    }
    for (const value of ["1n", "Symbol()"]) {
        passes(
            "var ok=false;try{new Temporal.PlainTime().with({" +
                names[i] +
                ":" +
                value +
                "})}catch(e){ok=e instanceof TypeError}ok",
        );
    }
}
for (const option of ["null", "1", "true", '"reject"']) {
    passes(
        "var ok=false;try{new Temporal.PlainTime().with({hour:1}," +
            option +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
passes(
    'var ok=false;try{new Temporal.PlainTime().with({hour:1},{overflow:"unknown"})}catch(e){ok=e instanceof RangeError}ok',
);
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.PlainTime.prototype.with", defining);
if (method.type !== "normal") {
    throw new Error("method lookup");
}
calling.defineScriptGlobal("replaceTime", { value: method.value });
const result = run("replaceTime.call(new Temporal.PlainTime(4),{minute:1})", calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainTimePrototype,
    "defining Realm result",
);
const failed = run("replaceTime.call({}, {})", calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "defining Realm error",
);
console.log("temporal plain time with passed");

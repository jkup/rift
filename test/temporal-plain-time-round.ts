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
    const prepared = prepareBoundedScript({ id: "plain-time-round", text }, realm);
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
    'new Temporal.PlainTime(12,30).round("hour").toString()==="13:00:00"',
    'new Temporal.PlainTime(23,59,59,999,999,999).round("hour").toString()==="00:00:00"',
    'new Temporal.PlainTime(23,59,59,999,999,999).round("microsecond").toString()==="00:00:00"',
    'new Temporal.PlainTime(1,7,30).round({smallestUnit:"minute",roundingIncrement:15}).toString()==="01:15:00"',
    'new Temporal.PlainTime(1,7,29,999,999,999).round({smallestUnit:"minute",roundingIncrement:15}).toString()==="01:00:00"',
    'new Temporal.PlainTime(1,2,3,123,456,789).round({smallestUnit:"millisecond",roundingIncrement:250}).toString()==="01:02:03"',
    'new Temporal.PlainTime(1,2,3,125).round({smallestUnit:"millisecond",roundingIncrement:250}).toString()==="01:02:03.25"',
    'new Temporal.PlainTime(1,7,30).round({smallestUnit:"minute",roundingIncrement:15.9}).toString()==="01:15:00"',
    'var t=new Temporal.PlainTime(1);var r=t.round("nanosecond");r!==t&&r.hour===1&&Object.getPrototypeOf(r)===Temporal.PlainTime.prototype',
    'class T extends Temporal.PlainTime{}var t=new T(1);var r=t.round("second");!(r instanceof T)&&r instanceof Temporal.PlainTime',
    'var t=new Temporal.PlainTime(1);Object.defineProperty(t,"constructor",{get(){throw 1}});Object.defineProperty(t,"hour",{get(){throw 2}});t.round("second").hour===1',
    'var log="";var r=new Temporal.PlainTime(1,7,30).round({get roundingIncrement(){log+="i";return {valueOf(){log+="I";return 15}}},get roundingMode(){log+="m";return {toString(){log+="M";return "halfExpand"}}},get smallestUnit(){log+="u";return {toString(){log+="U";return "minute"}}}});r.minute===15&&log==="iImMuU"',
    'var log="";var ok=false;try{new Temporal.PlainTime().round({get roundingIncrement(){log+="i";throw 42},get roundingMode(){log+="m"}})}catch(e){ok=e===42}ok&&log==="i"',
    "var touched=false;var ok=false;try{new Temporal.PlainTime().round({roundingIncrement:0,get roundingMode(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    'var log="";var ok=false;try{new Temporal.PlainTime().round({roundingIncrement:24,get roundingMode(){log+="m";return "ceil"},get smallestUnit(){log+="u";return "hour"}})}catch(e){ok=e instanceof RangeError}ok&&log==="mu"',
    "var touched=false;var ok=false;try{Temporal.PlainTime.prototype.round.call({}, {get roundingIncrement(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'new Temporal.PlainTime().round({smallestUnit:"second",get largestUnit(){throw 1},get timeZone(){throw 2}}).second===0',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"round");d.value.name==="round"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
    'var t=new Temporal.PlainTime(1);Object.setPrototypeOf(t,null);Temporal.PlainTime.prototype.round.call(t,"hour").hour===1',
];
for (const text of cases) {
    passes(text);
}
const units = ["hour", "minute", "second", "millisecond", "microsecond", "nanosecond"];
const expected = [
    "01:00:00",
    "01:02:00",
    "01:02:03",
    "01:02:03.123",
    "01:02:03.123457",
    "01:02:03.123456789",
];
for (let i = 0; i < units.length; i++) {
    for (const suffix of ["", "s"]) {
        passes(
            'new Temporal.PlainTime(1,2,3,123,456,789).round("' +
                units[i] +
                suffix +
                '").toString()==="' +
                expected[i] +
                '"',
        );
    }
}
const modes = [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
];
const roundsUp = [true, false, true, false, true, false, true, false, false];
for (let i = 0; i < modes.length; i++) {
    passes(
        'new Temporal.PlainTime(1,2,2,500).round({smallestUnit:"second",roundingMode:"' +
            modes[i] +
            '"}).second===' +
            (roundsUp[i] ? 3 : 2),
    );
}
passes(
    'new Temporal.PlainTime(1,2,3,500).round({smallestUnit:"second",roundingMode:"halfEven"}).second===4',
);
for (const argument of ["undefined", "null", "true", "1", "1n", "Symbol()", "{}"]) {
    passes(
        "var ok=false;try{new Temporal.PlainTime().round(" +
            argument +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const unit of ["day", "week", "year", "auto", "unknown"]) {
    passes(
        'var ok=false;try{new Temporal.PlainTime().round("' +
            unit +
            '")}catch(e){ok=e instanceof RangeError}ok',
    );
}
for (let i = 0; i < units.length; i++) {
    let maximum: 24 | 60 | 1000;
    if (i === 0) {
        maximum = 24;
    } else if (i < 3) {
        maximum = 60;
    } else {
        maximum = 1000;
    }
    for (const increment of [0, -1, maximum, maximum + 1, 7, NaN, Infinity]) {
        passes(
            'var ok=false;try{new Temporal.PlainTime().round({smallestUnit:"' +
                units[i] +
                '",roundingIncrement:' +
                increment +
                "})}catch(e){ok=e instanceof RangeError}ok",
        );
    }
    for (const increment of [1, 2, maximum / 2]) {
        passes(
            'new Temporal.PlainTime().round({smallestUnit:"' +
                units[i] +
                '",roundingIncrement:' +
                increment +
                '}).toString()==="00:00:00"',
        );
    }
}
passes(
    'new Temporal.Instant(0n).round({smallestUnit:"hour",roundingIncrement:24}).epochNanoseconds===0n',
);
passes(
    'new Temporal.Instant(0n).round({smallestUnit:"minute",roundingIncrement:60}).epochNanoseconds===0n',
);
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.PlainTime.prototype.round", defining);
if (method.type !== "normal") {
    throw new Error("method lookup");
}
calling.defineScriptGlobal("roundTime", { value: method.value });
const result = run('roundTime.call(new Temporal.PlainTime(4),"hour")', calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainTimePrototype,
    "defining Realm result",
);
const failed = run('roundTime.call({},"hour")', calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "defining Realm error",
);
console.log("temporal plain time round passed");

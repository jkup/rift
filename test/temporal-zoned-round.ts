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
    const prepared = prepareBoundedScript({ id: "temporal-zoned-round", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'Temporal.ZonedDateTime.from("1970-01-01T12:34:56.123456789[+05:30]").round("second").toString()==="1970-01-01T12:34:56+05:30[+05:30]"',
    'Temporal.ZonedDateTime.from("1970-01-01T23:59:59.999999999[-01:30]").round("second").toString()==="1970-01-02T00:00:00-01:30[-01:30]"',
    'Temporal.ZonedDateTime.from("1969-12-31T23:30[UTC]").round("hour").epochNanoseconds===0n',
    'Temporal.ZonedDateTime.from("1970-01-01T12:34[+05:30]").round({smallestUnit:"minute",roundingIncrement:15}).minute===30',
    'Temporal.ZonedDateTime.from("1970-01-01T12[+05:30]").round("day").toString()==="1970-01-02T00:00:00+05:30[+05:30]"',
    'Temporal.ZonedDateTime.from("1970-01-01T12[+05:30]").round({smallestUnit:"day",roundingMode:"halfEven"}).toString()==="1970-01-01T00:00:00+05:30[+05:30]"',
    'var z=new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59"),x=z.round("nanosecond");x!==z&&x.epochNanoseconds===z.epochNanoseconds',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"UTC").round("day").epochNanoseconds===-8640000000000000000000n',
    'var t="";new Temporal.ZonedDateTime(0n,"UTC").round({get roundingIncrement(){t+="I";return{valueOf(){t+="i";return 1}}},get roundingMode(){t+="M";return{toString(){t+="m";return "ceil"}}},get smallestUnit(){t+="S";return{toString(){t+="s";return "hour"}}}});t==="IiMmSs"',
    'var t="";try{Temporal.ZonedDateTime.prototype.round.call({}, {get smallestUnit(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const mode of [
    "ceil",
    "floor",
    "expand",
    "trunc",
    "halfCeil",
    "halfFloor",
    "halfExpand",
    "halfTrunc",
    "halfEven",
]) {
    const up = mode === "ceil" || mode === "expand" || mode === "halfCeil" || mode === "halfExpand";
    const result = run(
        'Temporal.ZonedDateTime.from("1969-12-31T12[UTC]").round({smallestUnit:"day",roundingMode:"' +
            mode +
            '"}).epochNanoseconds===' +
            (up ? "0n" : "-86400000000000n"),
    );
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, mode);
}
for (const expression of [
    'new Temporal.ZonedDateTime(8640000000000000000000n,"UTC").round("day")',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").round("second")',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").round("day")',
    'new Temporal.ZonedDateTime(0n,"UTC").round({smallestUnit:"hour",roundingIncrement:24})',
    'new Temporal.ZonedDateTime(0n,"UTC").round({smallestUnit:"day",roundingIncrement:2})',
    'new Temporal.ZonedDateTime(0n,"UTC").round({smallestUnit:"minute",roundingIncrement:7})',
    'new Temporal.ZonedDateTime(0n,"UTC").round("month")',
]) {
    const result = run(
        "var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok",
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        expression,
    );
}
for (const input of ["undefined", "null", "1", "{}"]) {
    const result = run(
        'var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").round(' +
            input +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, input);
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.ZonedDateTime.prototype.round", defining),
    prototype = run("Temporal.ZonedDateTime.prototype", defining);
if (method.type !== "normal" || prototype.type !== "normal") {
    throw new Error("lookup");
}
calling.defineScriptGlobal("roundZoned", { value: method.value });
const value = run('roundZoned.call(new Temporal.ZonedDateTime(0n,"UTC"),"hour")', calling);
check(
    value.type === "normal" &&
        value.value.kind === "object" &&
        prototype.value.kind === "object" &&
        value.value.object.getPrototypeOf() === prototype.value.object,
    "intrinsic Realm",
);
console.log("temporal zoned round passed");

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
    const prepared = prepareBoundedScript({ id: "temporal-zoned-arithmetic", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'Temporal.ZonedDateTime.from("2020-01-31T23[+05:30]").add({months:1,hours:2}).toString()==="2020-03-01T01:00:00+05:30[+05:30]"',
    'Temporal.ZonedDateTime.from("2020-03-31T01[-01:30]").subtract({months:1,hours:2}).toString()==="2020-02-28T23:00:00-01:30[-01:30]"',
    'Temporal.ZonedDateTime.from("2020-02-29T12[UTC]").add({years:1}).toString()==="2021-02-28T12:00:00+00:00[UTC]"',
    'Temporal.ZonedDateTime.from("2020-01-01T12[UTC]").add("P1W2DT25H").toString()==="2020-01-11T13:00:00+00:00[UTC]"',
    'new Temporal.ZonedDateTime(-1n,"UTC").add("PT0.000000001S").epochNanoseconds===0n',
    'new Temporal.ZonedDateTime(0n,"UTC").subtract({nanoseconds:1}).epochNanoseconds===-1n',
    'new Temporal.ZonedDateTime(0n,"UTC").add({days:-1,hours:-1}).epochNanoseconds===-90000000000000n',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").add({nanoseconds:1}).epochNanoseconds===-8639999999999999999999n',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"+23:59").subtract({nanoseconds:1}).epochNanoseconds===8639999999999999999999n',
    'var z=new Temporal.ZonedDateTime(0n,"UTC"),x=z.add({seconds:0});x!==z&&x.epochNanoseconds===z.epochNanoseconds',
    'var t="";new Temporal.ZonedDateTime(0n,"UTC").add({get days(){t+="D";return{valueOf(){t+="d";return 1}}}},{get overflow(){t+="O";return "reject"}});t==="DdO"',
    'var t="";try{new Temporal.ZonedDateTime(0n,"UTC").add("bad",{get overflow(){t+="!"}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="R"',
    'var t="";try{Temporal.ZonedDateTime.prototype.add.call({}, {get days(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'class Z extends Temporal.ZonedDateTime{};var z=new Z(0n,"UTC");z.constructor=function(){throw 1};Object.freeze(z);Object.getPrototypeOf(z.add("PT1S"))===Temporal.ZonedDateTime.prototype',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const expression of [
    'Temporal.ZonedDateTime.from("2020-01-31[UTC]").add({months:1},{overflow:"reject"})',
    'new Temporal.ZonedDateTime(0n,"UTC").add({seconds:1},{overflow:"bad"})',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"UTC").add({nanoseconds:1})',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"UTC").subtract({nanoseconds:1})',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"+23:59").add({days:1})',
    'new Temporal.ZonedDateTime(0n,"UTC").add({days:1,hours:-1})',
]) {
    const result = run(
        "var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok",
    );
    check(
        result.type === "normal" && result.value.kind === "boolean" && result.value.value,
        expression,
    );
}
for (const name of ["add", "subtract"]) {
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const method = run("Temporal.ZonedDateTime.prototype." + name, defining),
        prototype = run("Temporal.ZonedDateTime.prototype", defining);
    if (method.type !== "normal" || prototype.type !== "normal") {
        throw new Error("lookup");
    }
    calling.defineScriptGlobal("arithmetic", { value: method.value });
    const value = run('arithmetic.call(new Temporal.ZonedDateTime(0n,"UTC"),"PT1S")', calling);
    check(
        value.type === "normal" &&
            value.value.kind === "object" &&
            prototype.value.kind === "object" &&
            value.value.object.getPrototypeOf() === prototype.value.object,
        name + " Realm",
    );
}
console.log("temporal zoned arithmetic passed");

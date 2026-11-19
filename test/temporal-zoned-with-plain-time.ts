import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-with-plain-time", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'new Temporal.ZonedDateTime(0n,"+05:30").withPlainTime().toString()==="1970-01-01T00:00:00+05:30[+05:30]"',
    'new Temporal.ZonedDateTime(0n,"-01:30").startOfDay().toString()==="1969-12-31T00:00:00-01:30[-01:30]"',
    'new Temporal.ZonedDateTime(0n,"UTC").withPlainTime("12:34:56.123456789").epochNanoseconds===45296123456789n',
    'new Temporal.ZonedDateTime(0n,"UTC").withPlainTime({hour:99,minute:-1}).toString()==="1970-01-01T23:00:00+00:00[UTC]"',
    'var z=new Temporal.ZonedDateTime(-1n,"UTC"),t=new Temporal.ZonedDateTime(0n,"+05:30");Object.defineProperty(t,"hour",{get(){throw 1}});z.withPlainTime(t).toString()==="1969-12-31T05:30:00+00:00[UTC]"',
    'var t="",o={get hour(){t+="H";return 1},get microsecond(){t+="U";return 2},get millisecond(){t+="L";return 3},get minute(){t+="M";return 4},get nanosecond(){t+="N";return 5},get second(){t+="S";return 6}};new Temporal.ZonedDateTime(0n,"UTC").withPlainTime(o);t==="HULMNS"',
    'var t="";try{Temporal.ZonedDateTime.prototype.withPlainTime.call({}, {get hour(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'var z=new Temporal.ZonedDateTime(0n,"UTC"),o={get hour(){throw 1}};z.startOfDay(o).epochNanoseconds===0n&&z.withPlainTime(undefined,o).epochNanoseconds===0n',
    'class Z extends Temporal.ZonedDateTime{};var z=new Z(1n,"UTC");z.constructor=function(){throw 1};Object.freeze(z);var x=z.withPlainTime(),y=z.startOfDay();x!==z&&x!==y&&Object.getPrototypeOf(x)===Temporal.ZonedDateTime.prototype',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"UTC").startOfDay().epochNanoseconds===-8640000000000000000000n',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"UTC").startOfDay().epochNanoseconds===8640000000000000000000n',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").withPlainTime("00:01").epochNanoseconds===-8640000000000000000000n',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"+23:59").withPlainTime("23:59").epochNanoseconds===8640000000000000000000n',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const expression of [
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"+23:59").startOfDay()',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").withPlainTime()',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"UTC").withPlainTime("00:00:00.000000001")',
    'new Temporal.ZonedDateTime(0n,"UTC").withPlainTime("25:00")',
]) {
    const result = run('var ok=false;try{'+expression+'}catch(e){ok=e instanceof RangeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, expression);
}
for (const name of ["withPlainTime", "startOfDay"]) {
    const metadata = run('var d=Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"'+name+'");d.writable&&!d.enumerable&&d.configurable&&d.value.length===0&&d.value.name==="'+name+'"');
    check(metadata.type === "normal" && metadata.value.kind === "boolean" && metadata.value.value, name + " metadata");
    const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
    const method = run('Temporal.ZonedDateTime.prototype.'+name, defining), prototype = run('Temporal.ZonedDateTime.prototype', defining);
    if (method.type !== "normal" || prototype.type !== "normal") throw new Error("lookup");
    calling.defineScriptGlobal("replaceTime", { value: method.value });
    const value = run('replaceTime.call(new Temporal.ZonedDateTime(0n,"UTC"))', calling);
    check(value.type === "normal" && value.value.kind === "object" && prototype.value.kind === "object" && value.value.object.getPrototypeOf() === prototype.value.object, name + " Realm");
}
console.log("temporal zoned with plain time passed");

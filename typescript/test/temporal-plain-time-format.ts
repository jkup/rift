import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { formatTemporalTime } from "../src/temporal-time-format.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "plain-time-format", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'new Temporal.PlainTime().toJSON()==="00:00:00"',
    'new Temporal.PlainTime(23,59,59,999,999,999).toJSON()==="23:59:59.999999999"',
    'new Temporal.PlainTime(1,2,3,4,5,6).toJSON()==="01:02:03.004005006"',
    'new Temporal.PlainTime(1,2,3,100,200,300).toJSON()==="01:02:03.1002003"',
    'new Temporal.PlainTime(0,0,0,0,0,1).toJSON()==="00:00:00.000000001"',
    'new Temporal.PlainTime(0,0,0,0,1).toJSON()==="00:00:00.000001"',
    'new Temporal.PlainTime(0,0,0,1).toJSON()==="00:00:00.001"',
    'JSON.stringify({time:new Temporal.PlainTime(4,5,6)})===\'{"time":"04:05:06"}\'',
    'var t=new Temporal.PlainTime(4,5,6);t.toString=function(){throw 1};t.valueOf=function(){throw 2};t.toJSON()==="04:05:06"',
    'var t=new Temporal.PlainTime(4);Object.defineProperty(t,"hour",{get(){throw 1}});t.toJSON()==="04:00:00"',
    'new Temporal.PlainTime(1).toLocaleString({get length(){throw 1}},{get timeZone(){throw 2}})==="01:00:00"',
    'new Temporal.PlainTime(1).toJSON({toString(){throw 1}})==="01:00:00"',
    'class T extends Temporal.PlainTime{}new T(2).toJSON()==="02:00:00"',
    'var t=new Temporal.PlainTime(7);Object.setPrototypeOf(t,null);Temporal.PlainTime.prototype.toJSON.call(t)==="07:00:00"',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const name of ['toJSON','toLocaleString']) {
    const metadata = run('var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"'+name+'");d.value.name==="'+name+'"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable');
    check(metadata.type === "normal" && metadata.value.kind === "boolean" && metadata.value.value, name + " metadata");
    for (const receiver of ['null','undefined','{}','Temporal.PlainTime.prototype','new Temporal.Instant(0n)']) {
        const result = run('var ok=false;try{Temporal.PlainTime.prototype.'+name+'.call('+receiver+')}catch(e){ok=e instanceof TypeError}ok');
        check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, name + " brand " + receiver);
    }
}
const time = { hour: 1, minute: 2, second: 3, millisecond: 123, microsecond: 456, nanosecond: 789 };
const expected = ['01:02:03','01:02:03.1','01:02:03.12','01:02:03.123','01:02:03.1234','01:02:03.12345','01:02:03.123456','01:02:03.1234567','01:02:03.12345678','01:02:03.123456789'];
for (let digits = 0; digits < expected.length; digits++) check(formatTemporalTime(time, digits) === expected[digits], "precision " + digits);
check(formatTemporalTime(time, "minute") === "01:02", "minute precision");
check(formatTemporalTime(time) === "01:02:03.123456789", "automatic precision");
for (const digits of [-1, 10, 1.5, NaN, Infinity]) check(formatTemporalTime(time, digits) === null, "invalid precision");
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const method = run('Temporal.PlainTime.prototype.toJSON', defining);
if (method.type !== "normal") throw new Error("method lookup");
calling.defineScriptGlobal("json", { value: method.value });
const result = run('json.call(new Temporal.PlainTime(4))', calling);
check(result.type === "normal" && result.value.kind === "string" && result.value.value === "04:00:00", "cross-Realm brand");
const failed = run('json.call({})', calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"), "defining Realm error");
console.log("temporal plain time format passed");

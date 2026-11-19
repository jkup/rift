import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-instant-time-zone", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'new Temporal.Instant(0n).toString({timeZone:"1970-01-01T00:00Z"})==="1970-01-01T00:00:00+00:00"',
    'new Temporal.Instant(0n).toString({timeZone:"2020-02-29T23:59-01:30[+05:45]"})==="1970-01-01T05:45:00+05:45"',
    'new Temporal.Instant(0n).toString({timeZone:"12:30+01"})==="1970-01-01T01:00:00+01:00"',
    'new Temporal.Instant(0n).toString({timeZone:"2020-02[UTC]"})==="1970-01-01T00:00:00+00:00"',
    'new Temporal.Instant(0n).toString({timeZone:"02-29[-03:30]"})==="1969-12-31T20:30:00-03:30"',
    'new Temporal.Instant(-1n).toString({timeZone:"2020-01-01[+01:00]",smallestUnit:"second",roundingMode:"ceil"})==="1970-01-01T01:00:00+01:00"',
    'var z=new Temporal.ZonedDateTime(123n,"-01:30");Object.defineProperty(z,"timeZoneId",{get(){throw 1}});z.toString=function(){throw 2};z[Symbol.toPrimitive]=function(){throw 3};new Temporal.Instant(0n).toString({timeZone:z})==="1969-12-31T22:30:00-01:30"',
    'class Z extends Temporal.ZonedDateTime{};var z=new Z(0n,"UTC");Object.setPrototypeOf(z,null);new Temporal.Instant(0n).toString({timeZone:z})==="1970-01-01T00:00:00+00:00"',
    'var i=new Temporal.Instant(0n);i.toString()==="1970-01-01T00:00:00Z"&&i.toString({timeZone:undefined})===i.toString()',
    'var t="";try{new Temporal.Instant(0n).toString({smallestUnit:"hour",get timeZone(){t+="Z";return null}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="ZR"',
    'var t="";try{new Temporal.Instant(0n).toString({timeZone:{toString(){t+="!";return "UTC"}}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'new Temporal.Instant(8640000000000000000000n).toString({timeZone:new Temporal.ZonedDateTime(0n,"+23:59")})==="+275760-09-13T23:59:00+23:59"',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const zone of ['Invalid/Zone', '12:30Z', '2020-01-01', '+01:00:01', '2020-02-30T00:00Z', 'Z']) {
    const result = run('var ok=false;try{new Temporal.Instant(0n).toString({timeZone:'+JSON.stringify(zone)+'})}catch(e){ok=e instanceof RangeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, zone);
}
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.Instant.prototype.toString", defining);
if (method.type !== "normal") throw new Error("method lookup");
calling.defineScriptGlobal("formatInstant", { value: method.value });
const crossRealm = run('formatInstant.call(new Temporal.Instant(0n),{timeZone:new Temporal.ZonedDateTime(0n,"+01:00")})', calling);
check(crossRealm.type === "normal" && crossRealm.value.kind === "string" && crossRealm.value.value === "1970-01-01T01:00:00+01:00", "cross-Realm slots");
const failed = run('formatInstant.call(new Temporal.Instant(0n),{timeZone:"invalid"})', calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"), "defining Realm error");
console.log("temporal instant time zone passed");

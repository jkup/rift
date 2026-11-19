import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-zoned-with", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'Temporal.ZonedDateTime.from("2020-01-31T12:34:56.123456789[+05:30]").with({month:2}).toString()==="2020-02-29T12:34:56.123456789+05:30[+05:30]"',
    'Temporal.ZonedDateTime.from("2020-01-31T12[UTC]").with({monthCode:"M02"}).day===29',
    'Temporal.ZonedDateTime.from("2020-02-29T12[UTC]").with({year:2021}).day===28',
    'new Temporal.ZonedDateTime(0n,"UTC").with({hour:99,minute:-1}).hour===23',
    'new Temporal.ZonedDateTime(0n,"UTC").with({nanosecond:1}).epochNanoseconds===1n',
    'new Temporal.ZonedDateTime(0n,"UTC").with({offset:"+01"}).epochNanoseconds===0n',
    'new Temporal.ZonedDateTime(0n,"UTC").with({offset:"+01"},{offset:"use"}).epochNanoseconds===-3600000000000n',
    'new Temporal.ZonedDateTime(0n,"UTC").with({offset:"+01"},{offset:"ignore"}).epochNanoseconds===0n',
    'var z=new Temporal.ZonedDateTime(0n,"UTC");Object.defineProperty(z,"year",{get(){throw 1}});z.with({second:1}).epochNanoseconds===1000000000n',
    'var t="";new Temporal.ZonedDateTime(0n,"UTC").with({get calendar(){t+="C"},get timeZone(){t+="Z"},get hour(){t+="H";return{valueOf(){t+="h";return 1}}},get offset(){t+="O";return{toString(){t+="o";return "+00"}}}},{get disambiguation(){t+="D"},get offset(){t+="P"},get overflow(){t+="F"}});t==="CZHhOoDPF"',
    'var t="";try{new Temporal.ZonedDateTime(0n,"UTC").with({get calendar(){t+="C";return "iso8601"},get timeZone(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="CT"',
    'var t="";try{new Temporal.ZonedDateTime(0n,"UTC").with({}, {get overflow(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'var t="";try{Temporal.ZonedDateTime.prototype.with.call({}, {get calendar(){t+="!"}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'class Z extends Temporal.ZonedDateTime{};var z=new Z(0n,"UTC");z.constructor=function(){throw 1};Object.freeze(z);var x=z.with({second:0});x!==z&&Object.getPrototypeOf(x)===Temporal.ZonedDateTime.prototype',
    'var d=Object.getOwnPropertyDescriptor(Temporal.ZonedDateTime.prototype,"with");d.writable&&!d.enumerable&&d.configurable&&d.value.length===1&&d.value.name==="with"',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const input of ['undefined','null','"12:00"','{}','{hour:undefined}','{timeZone:"UTC",hour:1}','new Temporal.ZonedDateTime(0n,"UTC")','new Temporal.PlainDate(2020,1,1)','new Temporal.PlainTime(12)']) {
    const result = run('var ok=false;try{new Temporal.ZonedDateTime(0n,"UTC").with('+input+')}catch(e){ok=e instanceof TypeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, input);
}
for (const expression of [
    'Temporal.ZonedDateTime.from("2020-01-31[UTC]").with({month:2},{overflow:"reject"})',
    'new Temporal.ZonedDateTime(0n,"UTC").with({month:1,monthCode:"M02"})',
    'new Temporal.ZonedDateTime(0n,"UTC").with({offset:"+01"},{offset:"reject"})',
    'new Temporal.ZonedDateTime(0n,"UTC").with({offset:"bad"},{offset:"ignore"})',
    'new Temporal.ZonedDateTime(8640000000000000000000n,"UTC").with({nanosecond:1})',
    'new Temporal.ZonedDateTime(-8640000000000000000000n,"-23:59").with({second:0})',
]) {
    const result = run('var ok=false;try{'+expression+'}catch(e){ok=e instanceof RangeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, expression);
}
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.ZonedDateTime.prototype.with", defining), prototype = run("Temporal.ZonedDateTime.prototype", defining);
if (method.type !== "normal" || prototype.type !== "normal") throw new Error("lookup");
calling.defineScriptGlobal("replaceZoned", { value: method.value });
const value = run('replaceZoned.call(new Temporal.ZonedDateTime(0n,"UTC"),{second:1})', calling);
check(value.type === "normal" && value.value.kind === "object" && prototype.value.kind === "object" && value.value.object.getPrototypeOf() === prototype.value.object, "intrinsic Realm");
console.log("temporal zoned with passed");

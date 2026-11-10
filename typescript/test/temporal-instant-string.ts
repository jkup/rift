import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { formatOffsetInstant, formatUTCInstant } from "../src/temporal-time-format.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "temporal-instant-string", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'new Temporal.Instant(0n).toString()==="1970-01-01T00:00:00Z"',
    'String(new Temporal.Instant(-1n))==="1969-12-31T23:59:59.999999999Z"',
    'new Temporal.Instant(123456789n).toString({fractionalSecondDigits:2})==="1970-01-01T00:00:00.12Z"',
    'new Temporal.Instant(123456789n).toString({fractionalSecondDigits:2.9})==="1970-01-01T00:00:00.12Z"',
    'new Temporal.Instant(123456789n).toString({fractionalSecondDigits:9.9})==="1970-01-01T00:00:00.123456789Z"',
    'new Temporal.Instant(-1n).toString({fractionalSecondDigits:0})==="1969-12-31T23:59:59Z"',
    'new Temporal.Instant(-1n).toString({fractionalSecondDigits:0,roundingMode:"ceil"})==="1970-01-01T00:00:00Z"',
    'new Temporal.Instant(999999999n).toString({fractionalSecondDigits:3,roundingMode:"halfExpand"})==="1970-01-01T00:00:01.000Z"',
    'new Temporal.Instant(59999999999n).toString({smallestUnit:"minute"})==="1970-01-01T00:00Z"',
    'new Temporal.Instant(59999999999n).toString({smallestUnit:"minutes",roundingMode:"ceil"})==="1970-01-01T00:01Z"',
    'new Temporal.Instant(123456789n).toString({smallestUnit:"milliseconds",fractionalSecondDigits:8})==="1970-01-01T00:00:00.123Z"',
    'new Temporal.Instant(0n).toString({smallestUnit:"microsecond"})==="1970-01-01T00:00:00.000000Z"',
    'new Temporal.Instant(0n).toString({smallestUnit:"nanosecond"})==="1970-01-01T00:00:00.000000000Z"',
    'new Temporal.Instant(0n).toString({timeZone:"UTC"})==="1970-01-01T00:00:00+00:00"',
    'new Temporal.Instant(0n).toString({timeZone:"uTc"})==="1970-01-01T00:00:00+00:00"',
    'new Temporal.Instant(0n).toString({timeZone:"+05:30"})==="1970-01-01T05:30:00+05:30"',
    'new Temporal.Instant(0n).toString({timeZone:"-0130"})==="1969-12-31T22:30:00-01:30"',
    'new Temporal.Instant(0n).toString({timeZone:"+23"})==="1970-01-01T23:00:00+23:00"',
    'new Temporal.Instant(-1n).toString({timeZone:"-00",smallestUnit:"second"})==="1969-12-31T23:59:59+00:00"',
    'new Temporal.Instant(8640000000000000000000n).toString({timeZone:"+23:59"})==="+275760-09-13T23:59:00+23:59"',
    'new Temporal.Instant(-8640000000000000000000n).toString({timeZone:"-23:59"})==="-271821-04-19T00:01:00-23:59"',
    'var x=new Temporal.Instant(0n);x.toJSON=function(){throw 1};x.epochNanoseconds=1n;x.toString()==="1970-01-01T00:00:00Z"',
    'var o=function(){};o.smallestUnit="second";new Temporal.Instant(0n).toString(o)==="1970-01-01T00:00:00Z"',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Instant.prototype,"toString");d.writable&&!d.enumerable&&d.configurable&&d.value.length===0&&d.value.name==="toString"',
    'var t="",o={get fractionalSecondDigits(){t+="D";return{toString(){t+="d";return "auto"}}},get roundingMode(){t+="R";return{toString(){t+="r";return "trunc"}}},get smallestUnit(){t+="S";return{toString(){t+="s";return "second"}}},get timeZone(){t+="Z";return "UTC"}};new Temporal.Instant(0n).toString(o);t==="DdRrSsZ"',
    'var t="";try{new Temporal.Instant(0n).toString({smallestUnit:"day",get timeZone(){t+="Z";throw 7}})}catch(e){t+=e}t==="Z7"',
    'var t="";try{new Temporal.Instant(0n).toString({smallestUnit:"auto",get timeZone(){t+="Z";throw 7}})}catch(e){t+=e}t==="Z7"',
    'var t="";try{new Temporal.Instant(0n).toString({smallestUnit:"hours",get timeZone(){t+="Z";return {toString(){t+="!"}}}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="ZR"',
    'var t="";try{new Temporal.Instant(0n).toString({smallestUnit:"invalid",get timeZone(){t+="Z"}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="R"',
    'var t="";try{new Temporal.Instant(0n).toString({fractionalSecondDigits:"3",get roundingMode(){t+="R"}})}catch(e){t+=e instanceof RangeError?"E":"?"}t==="E"',
    'var t="";try{new Temporal.Instant(0n).toString({roundingMode:"bad",get smallestUnit(){t+="S"}})}catch(e){t+=e instanceof RangeError?"E":"?"}t==="E"',
    'var t="";try{new Temporal.Instant(0n).toString({timeZone:{toString(){t+="!";return "UTC"}}})}catch(e){t+=e instanceof TypeError?"E":"?"}t==="E"',
    'var t="";try{Temporal.Instant.prototype.toString.call({}, {get fractionalSecondDigits(){t+="!"}})}catch(e){t+=e instanceof TypeError?"E":"?"}t==="E"',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const option of ['null', 'true', '1', '"UTC"', '1n', 'Symbol()']) {
    const result = run('var ok=false;try{new Temporal.Instant(0n).toString('+option+')}catch(e){ok=e instanceof TypeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "options " + option);
}
for (const option of ['-0.1', '10', 'NaN', 'Infinity', '"0"', 'new Number(3)', 'null', '1n']) {
    const result = run('var ok=false;try{new Temporal.Instant(0n).toString({fractionalSecondDigits:'+option+'})}catch(e){ok=e instanceof RangeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "digits " + option);
}
for (const zone of ['Europe/London', '1970-01-01T00:00Z', '+01:00:00', '+24:00', 'Z', '']) {
    const result = run('new Temporal.Instant(0n).toString({timeZone:'+JSON.stringify(zone)+'})');
    check(result.type === "throw" && result.origin.kind === "unsupported-operation" && result.origin.capabilityCode === "runtime.temporal-time-zone", "zone " + zone);
}
check(formatUTCInstant(8640000000000000000001n) === null, "UTC range unchanged");
check(formatOffsetInstant(0n, 1440) === null && formatOffsetInstant(0n, 0.5) === null, "offset bounds");
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.Instant.prototype.toString", defining);
if (method.type !== "normal") throw new Error("method lookup");
calling.defineScriptGlobal("formatInstant", { value: method.value });
const crossRealm = run("formatInstant.call(new Temporal.Instant(0n))", calling);
check(crossRealm.type === "normal" && crossRealm.value.kind === "string" && crossRealm.value.value === "1970-01-01T00:00:00Z", "cross-Realm branding");
const failed = run("formatInstant.call(new Temporal.Instant(0n), null)", calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"), "defining Realm error");
console.log("temporal instant string passed");

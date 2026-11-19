import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm: Realm): Value {
    const prepared = prepareBoundedScript({ id: "temporal-now-core", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("completion: " + text);
    }
    return result.value;
}
const realm = new Realm((_line: string) => {}, "script");
let calls = 0;
realm.clockMilliseconds = () => {
    calls++;
    return -1;
};
function clockCalls(): number {
    return calls;
}
function passes(text: string): void {
    const value = run(text, realm);
    if (value.kind !== "boolean" || !value.value) {
        throw new Error(text);
    }
}
for (const text of [
    'typeof Temporal.Now==="object"&&Object.getPrototypeOf(Temporal.Now)===Object.prototype',
    'Object.prototype.toString.call(Temporal.Now)==="[object Temporal.Now]"',
    'var d=Object.getOwnPropertyDescriptor(Temporal,"Now");d.writable&&!d.enumerable&&d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Now,Symbol.toStringTag);d.value==="Temporal.Now"&&!d.writable&&!d.enumerable&&d.configurable',
    'Temporal.Now.timeZoneId()==="UTC"&&Temporal.Now.timeZoneId.call(null)==="UTC"',
    'Temporal.Now.instant.length===0&&Temporal.Now.instant.name==="instant"&&Temporal.Now.timeZoneId.length===0&&Temporal.Now.timeZoneId.name==="timeZoneId"',
    "var ok=false;try{new Temporal.Now()}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{Temporal.Now()}catch(e){ok=e instanceof TypeError}ok",
]) {
    passes(text);
}
if (clockCalls() !== 0) {
    throw new Error("timezone and metadata must not read clock");
}
passes(
    'var a=Temporal.Now.instant();a instanceof Temporal.Instant&&a.epochNanoseconds===-1000000n&&a.toString()==="1969-12-31T23:59:59.999Z"',
);
if (clockCalls() !== 1) {
    throw new Error("one clock read");
}
passes("Temporal.Now.instant()!==Temporal.Now.instant()");
passes(
    "Temporal.Now.instant.call(null,{valueOf:function(){throw 1}}).epochNanoseconds===-1000000n",
);
passes(
    "var proto=Temporal.Instant.prototype;Temporal.Instant=function(){throw 1};Object.getPrototypeOf(Temporal.Now.instant())===proto",
);
const other = new Realm((_line: string) => {}, "script");
other.clockMilliseconds = () => 7;
other.defineScriptGlobal("instant", { value: run("Temporal.Now.instant", realm) });
other.defineScriptGlobal("ownerPrototype", {
    value: run("Object.getPrototypeOf(Temporal.Now.instant())", realm),
});
const cross = run(
    "var x=instant();x.epochNanoseconds===-1000000n&&Object.getPrototypeOf(x)===ownerPrototype&&!(x instanceof Temporal.Instant)&&Temporal.Now.instant().epochNanoseconds===7000000n",
    other,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Now defining Realm");
}
for (const time of [-8640000000000000, 8640000000000000, 0, -0]) {
    realm.clockMilliseconds = () => time;
    const value = run("Temporal.Now.instant().epochNanoseconds", realm);
    if (value.kind !== "bigint" || value.value !== BigInt(time) * 1000000n) {
        throw new Error("Now clock boundary");
    }
}
for (const invalid of [NaN, Infinity, 0.5, 8640000000000001]) {
    realm.clockMilliseconds = () => invalid;
    let failed = false;
    try {
        run("Temporal.Now.instant()", realm);
    } catch (error) {
        failed =
            error instanceof Error &&
            error.message === "host clock must return valid epoch milliseconds";
    }
    if (!failed) {
        throw new Error("invalid clock must be host fault");
    }
}
console.log("temporal now core passed");

import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-to-temporal-instant", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("completion: " + text);
    }
    return result.value;
}
function passes(text: string): void {
    const value = run(text);
    if (value.kind !== "boolean" || !value.value) {
        throw new Error(text);
    }
}
for (const time of [-8640000000000000, -1, -0, 0, 1, 8640000000000000]) {
    passes(
        "var d=new Date(" +
            time +
            "),i=d.toTemporalInstant();i instanceof Temporal.Instant&&i.epochNanoseconds===" +
            String(BigInt(time) * 1000000n) +
            "n&&i.epochMilliseconds===" +
            time,
    );
}
for (const text of [
    "var d=new Date(1.9);d.toTemporalInstant().epochNanoseconds===1000000n",
    "var d=new Date(0);d.toTemporalInstant()!==d.toTemporalInstant()",
    "var d=new Date(0);d.setTime(7);d.toTemporalInstant().epochNanoseconds===7000000n",
    "var d=new Date(0);d.valueOf=function(){throw 1};d.getTime=function(){throw 2};d.toISOString=function(){throw 3};d.toTemporalInstant({valueOf:function(){throw 4}}).epochNanoseconds===0n",
    "var d=new Date(0);Object.setPrototypeOf(d,null);Date.prototype.toTemporalInstant.call(d).epochNanoseconds===0n",
    "class Sub extends Date{}new Sub(1).toTemporalInstant().epochNanoseconds===1000000n",
    "Object.freeze(new Date(0)).toTemporalInstant().epochNanoseconds===0n",
    "var d=new Date(NaN),ok=false;d.valueOf=function(){return 0};try{d.toTemporalInstant()}catch(e){ok=e instanceof RangeError}ok",
    "var p=Temporal.Instant.prototype;Temporal.Instant=function(){throw 7};Object.getPrototypeOf(new Date(0).toTemporalInstant())===p",
    'Date.prototype.toTemporalInstant.length===0&&Date.prototype.toTemporalInstant.name==="toTemporalInstant"',
]) {
    passes(text);
}
for (const receiver of [
    "{}",
    "Date.prototype",
    "0",
    "null",
    "undefined",
    "new Temporal.Instant(0n)",
]) {
    passes(
        "var ok=false;try{Date.prototype.toTemporalInstant.call(" +
            receiver +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
const owner = new Realm((_line: string) => {}, "script"),
    other = new Realm((_line: string) => {}, "script");
other.defineScriptGlobal("convert", { value: run("Date.prototype.toTemporalInstant", owner) });
other.defineScriptGlobal("ownerPrototype", { value: run("Temporal.Instant.prototype", owner) });
other.defineScriptGlobal("OwnerRangeError", { value: run("RangeError", owner) });
const cross = run(
    "var i=convert.call(new Date(-1));var ok=i.epochNanoseconds===-1000000n&&Object.getPrototypeOf(i)===ownerPrototype&&!(i instanceof Temporal.Instant);try{convert.call(new Date(NaN))}catch(e){ok=ok&&e instanceof OwnerRangeError&&!(e instanceof RangeError)}ok",
    other,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Date Instant conversion Realm");
}
console.log("date to temporal instant passed");

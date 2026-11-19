import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-legacy-year", text }, realm);
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
const inputs = [0, 99, 100, -1, -0.9, 99.9, 2000.9],
    expected = [1900, 1999, 100, -1, 1900, 1999, 2000];
for (let i = 0; i < inputs.length; i++) {
    passes(
        "var d=new Date(0);var t=d.setYear(" +
            inputs[i] +
            ");d.getFullYear()===" +
            expected[i] +
            "&&d.getTime()===t",
    );
}
for (const text of [
    'var d=new Date(NaN);d.setYear(0)===-2208988800000&&d.toISOString()==="1900-01-01T00:00:00.000Z"',
    'var d=new Date("2020-02-29T12:34:56.789Z");d.setYear(2021);d.toISOString()==="2021-03-01T12:34:56.789Z"',
    'var d=new Date(-1);d.setYear(2000);d.toISOString()==="2000-12-31T23:59:59.999Z"',
    "var d=new Date(0);Number.isNaN(d.setYear())&&Number.isNaN(d.getTime())",
    "var d=new Date(0);Number.isNaN(d.setYear(Infinity))&&Number.isNaN(d.getTime())",
    'var d=new Date(0);d.setYear({valueOf:function(){d.setTime(123456789);return 2000}});d.toISOString()==="2000-01-01T00:00:00.000Z"',
    'var d=new Date(NaN);d.setYear({valueOf:function(){d.setTime(123456789);return 2000}});d.toISOString()==="2000-01-01T00:00:00.000Z"',
    "var d=new Date(0);try{d.setYear({valueOf:function(){d.setTime(7);throw 9}})}catch(e){}d.getTime()===7",
    "var d=new Date(0);Number.isNaN(d.setYear({valueOf:function(){d.setTime(7);return NaN}}))&&Number.isNaN(d.getTime())",
    "var calls=0,ok=false;try{Date.prototype.setYear.call({}, {valueOf:function(){calls++;return 1}})}catch(e){ok=e instanceof TypeError}ok&&calls===0",
    "var d=Object.freeze(new Date(0));d.setYear(2000)===946684800000",
    "var d=new Date(0);var ok=false;try{d.setYear(1n)}catch(e){ok=e instanceof TypeError}ok&&d.getTime()===0",
    "var d=new Date(0);Number.isNaN(d.setYear(275761))&&Number.isNaN(d.getTime())",
    'Date.prototype.setYear.length===1&&Date.prototype.setYear.name==="setYear"&&Date.prototype.setYear!==Date.prototype.setFullYear',
]) {
    passes(text);
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("setter", { value: run("Date.prototype.setYear", owner) });
caller.defineScriptGlobal("OwnerTypeError", { value: run("TypeError", owner) });
const cross = run(
    "var ok=false;try{setter.call({})}catch(e){ok=e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok",
    caller,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Date legacy year Realm");
}
console.log("date legacy year passed");

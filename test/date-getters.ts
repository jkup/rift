import "../src/constructor-prototype.js";
import "../src/runtime.js";
import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "date-getters", text }, realm);
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
const suffixes = [
        "FullYear",
        "Month",
        "Date",
        "Day",
        "Hours",
        "Minutes",
        "Seconds",
        "Milliseconds",
    ],
    expected = [2020, 1, 29, 6, 12, 34, 56, 789];
for (let i = 0; i < suffixes.length; i++) {
    for (const prefix of ["get", "getUTC"]) {
        const name = prefix + suffixes[i];
        passes('new Date("2020-02-29T12:34:56.789Z").' + name + "()===" + expected[i]);
        passes("Number.isNaN(new Date(NaN)." + name + "())");
        passes(
            "var ok=false;try{Date.prototype." +
                name +
                ".call({})}catch(e){ok=e instanceof TypeError}ok",
        );
        passes(
            "Date.prototype." +
                name +
                ".length===0&&Date.prototype." +
                name +
                '.name==="' +
                name +
                '"',
        );
    }
}
for (const text of [
    "new Date(0).getTimezoneOffset()===0&&1/new Date(0).getTimezoneOffset()===Infinity",
    "Number.isNaN(new Date(NaN).getTimezoneOffset())&&Number.isNaN(new Date(NaN).getYear())",
    'new Date("0000-01-01").getFullYear()===0&&new Date("0000-01-01").getYear()===-1900',
    "new Date(0).getYear()===70",
    "new Date(-1).getUTCFullYear()===1969&&new Date(-1).getUTCMonth()===11&&new Date(-1).getUTCMilliseconds()===999",
    "new Date(-8640000000000000).getUTCFullYear()===-271821&&new Date(-8640000000000000).getUTCDate()===20",
    "new Date(8640000000000000).getUTCFullYear()===275760&&new Date(8640000000000000).getUTCMonth()===8",
    "Date.prototype.getFullYear!==Date.prototype.getUTCFullYear",
    "var d=new Date(0);d.valueOf=function(){throw 1};d.getUTCFullYear()===1970",
    "var d=new Date(0);Object.setPrototypeOf(d,null);Date.prototype.getMonth.call(d)===0",
]) {
    passes(text);
}
for (const name of ["getYear", "getTimezoneOffset"]) {
    passes(
        "var ok=false;try{Date.prototype." +
            name +
            "()}catch(e){ok=e instanceof TypeError}ok&&Date.prototype." +
            name +
            ".length===0",
    );
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("getYear", { value: run("Date.prototype.getUTCFullYear", owner) });
caller.defineScriptGlobal("OwnerTypeError", { value: run("TypeError", owner) });
const cross = run(
    "var ok=getYear.call(new Date(0))===1970;try{getYear.call({})}catch(e){ok=ok&&e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok",
    caller,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Date getter Realm");
}
console.log("date getters passed");

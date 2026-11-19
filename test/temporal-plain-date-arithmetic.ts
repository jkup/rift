import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "date-arithmetic", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'new Temporal.PlainDate(2024,1,31).add({months:1}).toString()==="2024-02-29"',
    'new Temporal.PlainDate(2023,1,31).add({months:1}).toString()==="2023-02-28"',
    'new Temporal.PlainDate(2024,2,29).add({years:1}).toString()==="2025-02-28"',
    'new Temporal.PlainDate(2020,2,29).add({years:1,months:1},{overflow:"reject"}).toString()==="2021-03-29"',
    'new Temporal.PlainDate(2024,3,31).subtract({months:1}).toString()==="2024-02-29"',
    'new Temporal.PlainDate(0,1,31).subtract({months:1}).toString()==="-000001-12-31"',
    'new Temporal.PlainDate(-1,12,31).add({months:1}).toString()==="0000-01-31"',
    'new Temporal.PlainDate(2020,1,31).add("P1Y2M3W4DT25H").toString()==="2021-04-26"',
    'new Temporal.PlainDate(2024,3,1).subtract({days:1}).toString()==="2024-02-29"',
    'new Temporal.PlainDate(2024,3,1).add({weeks:-1}).toString()==="2024-02-23"',
    'new Temporal.PlainDate(2024,1,1).subtract({days:-1}).toString()==="2024-01-02"',
    'new Temporal.PlainDate(2024,1,1).add({hours:23,minutes:59,seconds:59,nanoseconds:999999999}).toString()==="2024-01-01"',
    'new Temporal.PlainDate(2024,1,1).add({hours:-23}).toString()==="2024-01-01"',
    'new Temporal.PlainDate(2024,1,1).add({hours:-25}).toString()==="2023-12-31"',
    'new Temporal.PlainDate(1970,1,1).add({nanoseconds:86400000000000016}).toString()==="1972-09-27"',
    'new Temporal.PlainDate(1972,9,27).subtract({nanoseconds:86400000000000016}).toString()==="1970-01-01"',
    'new Temporal.PlainDate(2024,1,1).add({days:1,hours:25}).toString()==="2024-01-03"',
    'var original=new Temporal.PlainDate(2024,1,1);var copy=original.add("PT0S");copy!==original&&copy.equals(original)',
    "class D extends Temporal.PlainDate{};Object.getPrototypeOf(new D(2024,1,1).add({days:1}))===Temporal.PlainDate.prototype",
    'var log="";new Temporal.PlainDate(2024,1,1).add({get days(){log+="d";return {valueOf(){log+="D";return 1}}},get hours(){log+="h"},get microseconds(){log+="u"},get milliseconds(){log+="l"},get minutes(){log+="m"},get months(){log+="M"},get nanoseconds(){log+="n"},get seconds(){log+="s"},get weeks(){log+="w"},get years(){log+="y"}},{get overflow(){log+="o";return "reject"}});log==="dDhulmMnswyo"',
    "var touched=false,ok=false;try{Temporal.PlainDate.prototype.add.call({}, {get days(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    "var touched=false,ok=false;try{new Temporal.PlainDate(2024,1,1).add({days:1,hours:-1},{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    "var ok=false;try{new Temporal.PlainDate(2024,1,1).add({years:4294967295},{get overflow(){throw 42}})}catch(e){ok=e===42}ok",
    'new Temporal.PlainDate(275760,9,13).add({hours:23}).toString()==="+275760-09-13"',
    'new Temporal.PlainDate(-271821,4,19).subtract({hours:23}).toString()==="-271821-04-19"',
]) {
    passes(text);
}
for (const expression of [
    'new Temporal.PlainDate(2024,1,31).add({months:1},{overflow:"reject"})',
    'new Temporal.PlainDate(2024,2,29).subtract({years:1},{overflow:"reject"})',
    "new Temporal.PlainDate(275760,9,13).add({hours:24})",
    "new Temporal.PlainDate(-271821,4,19).subtract({hours:24})",
    "new Temporal.PlainDate(2024,1,1).add({years:4294967295})",
    "new Temporal.PlainDate(2024,1,1).subtract({weeks:4294967295})",
    "new Temporal.PlainDate(2024,1,1).add({seconds:9007199254740991})",
    'new Temporal.PlainDate(2024,1,1).add({days:1},{overflow:"bad"})',
]) {
    passes("var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok");
}
for (const value of ["undefined", "null", "1", "{}"]) {
    passes(
        "var ok=false;try{new Temporal.PlainDate(2024,1,1).add(" +
            value +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
passes(
    "var ok=false;try{new Temporal.PlainDate(2024,1,1).add({days:1},null)}catch(e){ok=e instanceof TypeError}ok",
);
for (const name of ["add", "subtract"]) {
    passes("Temporal.PlainDate.prototype." + name + ".length===1");
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"' +
            name +
            '");d.writable&&!d.enumerable&&d.configurable',
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const method = run("Temporal.PlainDate.prototype." + name, defining);
    if (method.type !== "normal") {
        throw new Error("method lookup");
    }
    calling.defineScriptGlobal("dateArithmetic", { value: method.value });
    const result = run("dateArithmetic.call(new Temporal.PlainDate(2024,1,1),{days:1})", calling);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object.getPrototypeOf() === defining.temporalPlainDatePrototype,
        "defining Realm result",
    );
}
console.log("temporal plain date arithmetic passed");

import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    text: string,
    realm: Realm = new Realm((_line: string) => {}, "script"),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "plain-date-core", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
passes('new Temporal.PlainYearMonth(2024,2).toString()==="2024-02"');
passes(
    'var d=new Temporal.PlainYearMonth(2024,2,undefined,29);d.toString({calendarName:"always"})==="2024-02-29[u-ca=iso8601]"&&d.toString({calendarName:"critical"})==="2024-02-29[!u-ca=iso8601]"',
);
passes(
    'var d=new Temporal.PlainYearMonth(2024,2,undefined,29);d.toString({calendarName:"auto"})==="2024-02"&&d.toString({calendarName:"never"})==="2024-02"',
);
passes(
    'new Temporal.PlainYearMonth(-1,1).toString()==="-000001-01"&&new Temporal.PlainYearMonth(10000,12).toString()==="+010000-12"',
);
passes(
    'new Temporal.PlainYearMonth(-271821,4).toString({calendarName:"always"})==="-271821-04-01[u-ca=iso8601]"&&new Temporal.PlainYearMonth(275760,9,undefined,30).toString({calendarName:"always"})==="+275760-09-30[u-ca=iso8601]"',
);
passes(
    'var d=new Temporal.PlainYearMonth(2024,2,undefined,29);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"month",{get(){throw 2}});Object.defineProperty(d,"day",{get(){throw 3}});d.toString()==="2024-02"',
);
passes(
    'var log="";new Temporal.PlainYearMonth(2024,2).toString({get calendarName(){log+="g";return {toString(){log+="s";return "always"}}}})==="2024-02-01[u-ca=iso8601]"&&log==="gs"',
);
passes(
    "var marker={},ok=false;try{new Temporal.PlainYearMonth(2024,2).toString({get calendarName(){throw marker}})}catch(e){ok=e===marker}ok",
);
passes(
    "var touched=false,ok=false;try{Temporal.PlainYearMonth.prototype.toString.call({}, {get calendarName(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
);
passes(
    'var d=new Temporal.PlainYearMonth(2024,2);d.toString=function(){throw 1};d.toJSON()==="2024-02"&&d.toLocaleString()==="2024-02"',
);
passes("var d=new Temporal.PlainYearMonth(2024,2);JSON.stringify(d)==='\"2024-02\"'");
passes(
    'new Temporal.PlainYearMonth(2024,2).toJSON(null)==="2024-02"&&new Temporal.PlainYearMonth(2024,2).toLocaleString(null,{get calendarName(){throw 1}})==="2024-02"',
);
passes(
    "var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString(null)}catch(e){ok=e instanceof TypeError}ok",
);
passes(
    "var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString(1)}catch(e){ok=e instanceof TypeError}ok",
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString("auto")}catch(e){ok=e instanceof TypeError}ok',
);
passes(
    "var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString(true)}catch(e){ok=e instanceof TypeError}ok",
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString({calendarName:"bad"})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    'var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString({calendarName:"AUTO"})}catch(e){ok=e instanceof RangeError}ok',
);
passes(
    "var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString({calendarName:null})}catch(e){ok=e instanceof RangeError}ok",
);
passes(
    "var ok=false;try{new Temporal.PlainYearMonth(2024,2).toString({calendarName:1})}catch(e){ok=e instanceof RangeError}ok",
);
for (const method of ["toString", "toJSON", "toLocaleString"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainYearMonth.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable',
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const fn = run("Temporal.PlainYearMonth.prototype." + method, defining);
    if (fn.type !== "normal") {
        throw new Error("lookup");
    }
    calling.defineScriptGlobal("format", { value: fn.value });
    const result = run("format.call(new Temporal.PlainYearMonth(2024,2))", calling);
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === "2024-02",
        "cross-Realm value",
    );
    const failed = run("format.call({})", calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
console.log("temporal plain year month format passed");

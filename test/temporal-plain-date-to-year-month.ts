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
    const prepared = prepareBoundedScript({ id: "date-time-core", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}

passes(
    'new Temporal.PlainDate(2024,2,29).toPlainYearMonth().toString({calendarName:"always"})==="2024-02-01[u-ca=iso8601]"',
);
passes(
    'new Temporal.PlainDate(-271821,4,19).toPlainYearMonth().toString()==="-271821-04"&&new Temporal.PlainDate(275760,9,13).toPlainYearMonth().toString()==="+275760-09"',
);
passes(
    'var d=new Temporal.PlainDate(2024,2,29);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"month",{get(){throw 2}});Object.defineProperty(d,"calendar",{get(){throw 3}});d.toPlainYearMonth().toString()==="2024-02"',
);
passes(
    "var d=new Temporal.PlainDate(2024,2,29);d.toPlainYearMonth()!==d.toPlainYearMonth()&&d.day===29",
);
passes(
    "class D extends Temporal.PlainDate{};Object.getPrototypeOf(new D(2024,2,29).toPlainYearMonth())===Temporal.PlainYearMonth.prototype",
);
passes(
    "var proto=Temporal.PlainYearMonth.prototype;Temporal.PlainYearMonth=function(){throw 1};Object.getPrototypeOf(new Temporal.PlainDate(2024,2,29).toPlainYearMonth())===proto",
);
passes(
    "new Temporal.PlainDate(2024,2,29).toPlainYearMonth({get calendar(){throw 1},get overflow(){throw 2}}).month===2",
);
passes(
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"toPlainYearMonth");d.value.name==="toPlainYearMonth"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable',
);
passes(
    "var ok=false;try{Temporal.PlainDate.prototype.toPlainYearMonth.call(new Temporal.PlainYearMonth(2024,2))}catch(e){ok=e instanceof TypeError}ok",
);
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const fn = run("Temporal.PlainDate.prototype.toPlainYearMonth", defining);
if (fn.type !== "normal") {
    throw new Error("lookup");
}
calling.defineScriptGlobal("convert", { value: fn.value });
const result = run("convert.call(new Temporal.PlainDate(2024,1,1))", calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainYearMonthPrototype,
    "defining Realm result",
);
const failed = run("convert.call({})", calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "defining Realm error",
);
console.log("temporal plain date to year month passed");

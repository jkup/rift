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
    'new Temporal.PlainDate(2024,2,29).toPlainMonthDay().toString({calendarName:"always"})==="1972-02-29[u-ca=iso8601]"',
);
passes(
    'new Temporal.PlainDate(-271821,4,19).toPlainMonthDay().toString()==="04-19"&&new Temporal.PlainDate(275760,9,13).toPlainMonthDay().toString()==="09-13"',
);
passes(
    'var d=new Temporal.PlainDate(2024,2,29);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"month",{get(){throw 2}});Object.defineProperty(d,"calendar",{get(){throw 3}});d.toPlainMonthDay().toString()==="02-29"',
);
passes(
    "var d=new Temporal.PlainDate(2024,2,29);d.toPlainMonthDay()!==d.toPlainMonthDay()&&d.day===29",
);
passes(
    "class D extends Temporal.PlainDate{};Object.getPrototypeOf(new D(2024,2,29).toPlainMonthDay())===Temporal.PlainMonthDay.prototype",
);
passes(
    "var proto=Temporal.PlainMonthDay.prototype;Temporal.PlainMonthDay=function(){throw 1};Object.getPrototypeOf(new Temporal.PlainDate(2024,2,29).toPlainMonthDay())===proto",
);
passes(
    "new Temporal.PlainDate(2024,2,29).toPlainMonthDay({get calendar(){throw 1},get overflow(){throw 2}}).day===29",
);
passes(
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"toPlainMonthDay");d.value.name==="toPlainMonthDay"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable',
);
passes(
    "var ok=false;try{Temporal.PlainDate.prototype.toPlainMonthDay.call(new Temporal.PlainMonthDay(2,29))}catch(e){ok=e instanceof TypeError}ok",
);
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const fn = run("Temporal.PlainDate.prototype.toPlainMonthDay", defining);
if (fn.type !== "normal") {
    throw new Error("lookup");
}
calling.defineScriptGlobal("convert", { value: fn.value });
const result = run("convert.call(new Temporal.PlainDate(2024,1,1))", calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainMonthDayPrototype,
    "defining Realm result",
);
const failed = run("convert.call({})", calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "defining Realm error",
);
console.log("temporal plain date to month day passed");

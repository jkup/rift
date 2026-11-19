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
    const prepared = prepareBoundedScript({ id: "date-conversion", text }, realm);
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
    'Temporal.PlainDate.from("2024-02-29T23:59-12:00[Unknown/Zone]").toString()==="2024-02-29"',
    'Temporal.PlainDate.from({year:2023,monthCode:"M02",day:29}).toString()==="2023-02-28"',
    'Temporal.PlainDate.from({year:2024,month:99,day:99}).toString()==="2024-12-31"',
    'Temporal.PlainDate.from({year:-0,month:1.9,day:1.9}).toString()==="0000-01-01"',
    'var original=new Temporal.PlainDate(2024,2,29);Object.defineProperty(original,"year",{get(){throw 1}});Object.defineProperty(original,"calendar",{get(){throw 2}});var copy=Temporal.PlainDate.from(original);copy!==original&&copy.year===2024',
    'class D extends Temporal.PlainDate{};var date=D.from("2024-01-01");Object.getPrototypeOf(date)===Temporal.PlainDate.prototype&&!(date instanceof D)',
    'Temporal.PlainDate.from.call(null,"2024-01-01").year===2024',
    'var log="";Temporal.PlainDate.from({get calendar(){log+="c";return "iso8601"},get day(){log+="d";return {valueOf(){log+="D";return 1}}},get month(){log+="m";return 2},get monthCode(){log+="C";return {toString(){log+="S";return "M02"}}},get year(){log+="y";return 2024}},{get overflow(){log+="o";return {toString(){log+="O";return "reject"}}}});log==="cdDmCSyoO"',
    'var touched=false,ok=false;try{Temporal.PlainDate.from({calendar:"gregory",get day(){touched=true;return 1}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false,ok=false;try{Temporal.PlainDate.from({[Symbol.toPrimitive](){touched=true;return "2024-01-01"}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var ok=false;try{Temporal.PlainDate.from({year:2024,day:1,monthCode:"M13"},{get overflow(){throw 42}})}catch(e){ok=e===42}ok',
    "var ok=false;try{Temporal.PlainDate.from({},{get overflow(){throw 42}})}catch(e){ok=e===42}ok",
    'var ok=false;try{Temporal.PlainDate.from("+999999-01-01",{get overflow(){throw 42}})}catch(e){ok=e===42}ok',
    'var touched=false,ok=false;try{Temporal.PlainDate.from("2024-02-30",{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false,ok=false;try{Temporal.PlainDate.from("2024-01-01[u-ca=gregory]",{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false,ok=false;try{Temporal.PlainDate.from({monthCode:"M00",get year(){touched=true}},{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'Temporal.PlainDate.compare("2024-02-29",{year:2024,monthCode:"M02",day:29})===0',
    'Temporal.PlainDate.compare("-000001-01-01","0000-01-01")===-1&&Temporal.PlainDate.compare("2025-01-01","2024-12-31")===1',
    'Temporal.PlainDate.compare("2024-02-01","2024-03-01")===-1&&Temporal.PlainDate.compare("2024-02-02","2024-02-01")===1',
    'var log="";Temporal.PlainDate.compare({get year(){log+="a";return 2024},month:1,day:1},{get year(){log+="b";return 2025},month:1,day:1});log==="ab"',
    'var touched=false,ok=false;try{Temporal.PlainDate.compare("bad",{get calendar(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'new Temporal.PlainDate(2023,2,28).equals({year:2023,month:2,day:29})&&!new Temporal.PlainDate(2024,1,1).equals("2024-01-02")',
    "var touched=false,ok=false;try{Temporal.PlainDate.prototype.equals.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    "Temporal.PlainDate.from.length===1&&Temporal.PlainDate.compare.length===2&&Temporal.PlainDate.prototype.equals.length===1",
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate,"from");d.writable&&!d.enumerable&&d.configurable',
    'var ok=false;try{new Temporal.PlainDate.from("2024-01-01")}catch(e){ok=e instanceof TypeError}ok',
]) {
    passes(text);
}
for (const calendar of [
    '"ISO8601"',
    '"2024-01-01"',
    '"12:34"',
    '"2024-02"',
    '"--02-29"',
    '"2024-01-01T00:00Z"',
    "new Temporal.PlainDate(2000,1,1)",
]) {
    passes(
        "Temporal.PlainDate.from({year:2024,month:1,day:1,calendar:" +
            calendar +
            '}).calendarId==="iso8601"',
    );
}
for (const calendar of [
    "null",
    "1",
    "true",
    "{}",
    'new String("iso8601")',
    "{toString(){throw 42}}",
    "new Temporal.PlainTime()",
]) {
    passes(
        "var ok=false;try{Temporal.PlainDate.from({year:2024,month:1,day:1,calendar:" +
            calendar +
            "})}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const value of [
    "undefined",
    "null",
    "1",
    "true",
    "1n",
    "Symbol()",
    "{}",
    'new String("2024-01-01")',
]) {
    passes(
        "var ok=false;try{Temporal.PlainDate.from(" +
            value +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const value of [
    '"bad"',
    '"2024-01-01T00:00Z"',
    '"-271821-04-18"',
    '"+275760-09-14"',
    "{year:2024,month:0,day:1}",
    "{year:2024,month:1,day:0}",
]) {
    passes(
        "var ok=false;try{Temporal.PlainDate.from(" +
            value +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const value of [
    '"2024-01-01"',
    "new Temporal.PlainDate(2024,1,1)",
    "{year:2024,month:1,day:1}",
]) {
    passes(
        "var ok=false;try{Temporal.PlainDate.from(" +
            value +
            ',{overflow:"bad"})}catch(e){ok=e instanceof RangeError}ok',
    );
    passes(
        "var ok=false;try{Temporal.PlainDate.from(" +
            value +
            ",null)}catch(e){ok=e instanceof TypeError}ok",
    );
}
passes(
    'var ok=false;try{Temporal.PlainDate.from({year:2023,month:2,day:29},{overflow:"reject"})}catch(e){ok=e instanceof RangeError}ok',
);
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.PlainDate.from", defining);
if (method.type !== "normal") {
    throw new Error("method lookup");
}
calling.defineScriptGlobal("fromDate", { value: method.value });
const result = run("fromDate(new Temporal.PlainDate(2024,1,1))", calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainDatePrototype,
    "defining Realm result",
);
const failed = run('fromDate("bad")', calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"),
    "defining Realm error",
);
for (const calendar of [false, true]) {
    calling.defineScriptGlobal(calendar ? "longCalendar" : "longDate", {
        value: { kind: "string", value: "2024-01-01[x=" + "a".repeat(1000) + "]" },
    });
    const text = calendar
        ? "fromDate({year:2024,month:1,day:1,calendar:longCalendar})"
        : "fromDate(longDate)";
    const prepared = prepareBoundedScript({ id: "date-budget", text }, calling);
    if (prepared.kind !== "ready") {
        throw new Error("budget preparation");
    }
    const session = createScriptSession({ maxSteps: 200, maxCalls: 64 });
    const stopped = evaluateScript(session, prepared.record).completion;
    check(
        stopped.type === "throw" && stopped.origin.kind === "resource-limit",
        "parsing work charged",
    );
    check(
        session.inspect().active === null &&
            session.inspect().calls === 0 &&
            session.inspect().depth === 0,
        "budget cleanup",
    );
}
console.log("temporal plain date conversion passed");

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
    const prepared = prepareBoundedScript({ id: "date-time-conversion", text }, realm);
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
    'Temporal.PlainDateTime.from("2024-02-29").toString()==="2024-02-29T00:00:00"',
    'Temporal.PlainDateTime.from("2024-02-29T12:34:56.123456789+03:00").toString()==="2024-02-29T12:34:56.123456789"',
    'Temporal.PlainDateTime.from({year:2023,month:2,day:29,hour:99}).toString()==="2023-02-28T23:00:00"',
    'Temporal.PlainDateTime.from(new Temporal.PlainDate(2024,2,29)).toString()==="2024-02-29T00:00:00"',
    "var d=new Temporal.PlainDateTime(2024,1,1,12);var c=Temporal.PlainDateTime.from(d);c!==d&&c.equals(d)&&Object.getPrototypeOf(c)===Temporal.PlainDateTime.prototype",
    'class D extends Temporal.PlainDateTime{};var d=D.from("2024-01-01");d instanceof Temporal.PlainDateTime&&!(d instanceof D)',
    'Temporal.PlainDateTime.from.call(null,"2024-01-01").year===2024',
    'var d=new Temporal.PlainDateTime(2024,1,1,12);Object.defineProperty(d,"calendar",{get(){throw 1}});Object.defineProperty(d,"year",{get(){throw 2}});Object.defineProperty(d,"hour",{get(){throw 3}});Temporal.PlainDateTime.from(d).hour===12',
    'var d=new Temporal.PlainDate(2024,1,1);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"hour",{get(){throw 2}});Temporal.PlainDateTime.from(d).hour===0',
    'Temporal.PlainDateTime.compare("1969-12-31T23:59:59.999999999","1970-01-01")===-1',
    'Temporal.PlainDateTime.compare("2024-01-01T00:00:00.000000001","2024-01-01")===1',
    'Object.is(Temporal.PlainDateTime.compare("2024-01-01",new Temporal.PlainDate(2024,1,1)),0)',
    "new Temporal.PlainDateTime(2024,1,1).equals({year:2024,month:1,day:1})",
    '!new Temporal.PlainDateTime(2024,1,1).equals("2024-01-01T00:00:00.000000001")',
    'var log="";Temporal.PlainDateTime.from({get calendar(){log+="c"},get day(){log+="d";return 1},get hour(){log+="h";return 2},get microsecond(){log+="u"},get millisecond(){log+="l"},get minute(){log+="i"},get month(){log+="m";return 1},get monthCode(){log+="C"},get nanosecond(){log+="n"},get second(){log+="s"},get year(){log+="y";return 2024}},{get overflow(){log+="o";return "reject"}});log==="cdhulimCnsyo"',
    'var log="";Temporal.PlainDateTime.compare({get year(){log+="a";return 2024},month:1,day:1},{get year(){log+="b";return 2024},month:1,day:1});log==="ab"',
    'var touched=false,ok=false;try{Temporal.PlainDateTime.compare("bad",{get calendar(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    "var touched=false,ok=false;try{Temporal.PlainDateTime.prototype.equals.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var touched=false,ok=false;try{Temporal.PlainDateTime.from("2023-02-29",{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var ok=false;try{Temporal.PlainDateTime.from("-271821-04-19",{get overflow(){throw 42}})}catch(e){ok=e===42}ok',
    "var ok=false;try{Temporal.PlainDateTime.from(new Temporal.PlainDate(-271821,4,19),{get overflow(){throw 42}})}catch(e){ok=e===42}ok",
    "var ok=false;try{Temporal.PlainDateTime.from({},{get overflow(){throw 42}})}catch(e){ok=e===42}ok",
    'Temporal.PlainDateTime.from("-271821-04-19T00:00:00.000000001").nanosecond===1',
]) {
    passes(text);
}
for (const input of [
    "null",
    "undefined",
    "true",
    "1",
    "1n",
    "Symbol()",
    "{}",
    'new String("2024-01-01")',
]) {
    passes(
        "var ok=false;try{Temporal.PlainDateTime.from(" +
            input +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const input of [
    '"bad"',
    '"2024-01-01Z"',
    '"-271821-04-19"',
    '"+275760-09-14"',
    "new Temporal.PlainDate(-271821,4,19)",
]) {
    passes(
        "var ok=false;try{Temporal.PlainDateTime.from(" +
            input +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const input of [
    '"2024-01-01"',
    "new Temporal.PlainDateTime(2024,1,1)",
    "new Temporal.PlainDate(2024,1,1)",
    "{year:2024,month:1,day:1}",
]) {
    passes(
        "var ok=false;try{Temporal.PlainDateTime.from(" +
            input +
            ",null)}catch(e){ok=e instanceof TypeError}ok",
    );
    passes(
        "var ok=false;try{Temporal.PlainDateTime.from(" +
            input +
            ',{overflow:"bad"})}catch(e){ok=e instanceof RangeError}ok',
    );
}
passes(
    'var ok=false;try{Temporal.PlainDateTime.from({year:2023,month:2,day:29,hour:24},{overflow:"reject"})}catch(e){ok=e instanceof RangeError}ok',
);
for (const name of ["from", "compare"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime,"' +
            name +
            '");d.value.name==="' +
            name +
            '"&&d.value.length===' +
            (name === "from" ? 1 : 2) +
            "&&d.writable&&!d.enumerable&&d.configurable",
    );
}
passes(
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"equals");d.value.length===1&&d.value.name==="equals"&&d.writable&&!d.enumerable&&d.configurable',
);
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const method = run("Temporal.PlainDateTime.from", defining);
if (method.type !== "normal") {
    throw new Error("method lookup");
}
calling.defineScriptGlobal("fromDate", { value: method.value });
const result = run("fromDate(new Temporal.PlainDateTime(2024,1,1))", calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainDateTimePrototype,
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
console.log("temporal plain date time conversion passed");

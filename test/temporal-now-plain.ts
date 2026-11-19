import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm: Realm): Value {
    const prepared = prepareBoundedScript({ id: "temporal-now-plain", text }, realm);
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
function passes(text: string): void {
    const value = run(text, realm);
    if (value.kind !== "boolean" || !value.value) {
        throw new Error(text);
    }
}
for (const name of ["plainDateTimeISO", "plainDateISO", "plainTimeISO"]) {
    passes("Temporal.Now." + name + ".length===0&&Temporal.Now." + name + '.name==="' + name + '"');
    for (const value of [
        "null",
        "0",
        "1n",
        "Symbol()",
        "{}",
        'new String("UTC")',
        "{toString:function(){throw 7},valueOf:function(){throw 8}}",
    ]) {
        passes(
            "var ok=false;try{Temporal.Now." +
                name +
                "(" +
                value +
                ")}catch(e){ok=e instanceof TypeError}ok",
        );
    }
    for (const value of ["Z", "Invalid/Zone", "+24:00", "+01:00:00", "2020-01-01"]) {
        passes(
            "var ok=false;try{Temporal.Now." +
                name +
                '("' +
                value +
                '")}catch(e){ok=e instanceof RangeError}ok',
        );
    }
}
if (calls !== 0) {
    throw new Error("timezone errors must precede clock");
}
for (const text of [
    'Temporal.Now.plainDateTimeISO().toString()==="1969-12-31T23:59:59.999"',
    'Temporal.Now.plainDateISO().toString()==="1969-12-31"',
    'Temporal.Now.plainTimeISO().toString()==="23:59:59.999"',
    'Temporal.Now.plainDateTimeISO("+05:30").toString()==="1970-01-01T05:29:59.999"',
    'Temporal.Now.plainDateISO("+05:30").toString()==="1970-01-01"',
    'Temporal.Now.plainTimeISO("+05:30").toString()==="05:29:59.999"',
    'Temporal.Now.plainDateTimeISO("-23:59").toString()==="1969-12-31T00:00:59.999"',
    'Temporal.Now.plainTimeISO("2030-12-25T00+01[+02]").toString()==="01:59:59.999"',
    'Temporal.Now.plainTimeISO("2020-01[UTC]").toString()==="23:59:59.999"',
    'Temporal.Now.plainDateISO("UTC").calendarId==="iso8601"',
    "Temporal.Now.plainDateISO()!==Temporal.Now.plainDateISO()",
    'Temporal.Now.plainTimeISO.call(null,undefined,{toString:function(){throw 1}}).toString()==="23:59:59.999"',
    "var proto=Temporal.PlainDateTime.prototype;Temporal.PlainDateTime=function(){throw 1};Object.getPrototypeOf(Temporal.Now.plainDateTimeISO())===proto",
]) {
    passes(text);
}
const other = new Realm((_line: string) => {}, "script");
other.clockMilliseconds = () => 0;
other.defineScriptGlobal("project", { value: run("Temporal.Now.plainDateISO", realm) });
other.defineScriptGlobal("ownerPrototype", { value: run("Temporal.PlainDate.prototype", realm) });
other.defineScriptGlobal("OwnerTypeError", { value: run("TypeError", realm) });
const cross = run(
    'var d=project();var ok=d.toString()==="1969-12-31"&&Object.getPrototypeOf(d)===ownerPrototype&&!(d instanceof Temporal.PlainDate);try{project(null)}catch(e){ok=ok&&e instanceof OwnerTypeError&&!(e instanceof TypeError)}ok',
    other,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("Now projection Realm");
}
realm.clockMilliseconds = () => 8640000000000000;
passes('Temporal.Now.plainDateTimeISO("+23:59").toString()==="+275760-09-13T23:59:00"');
realm.clockMilliseconds = () => -8640000000000000;
passes('Temporal.Now.plainDateTimeISO("-23:59").toString()==="-271821-04-19T00:01:00"');
passes('Temporal.Now.plainDateISO("-23:59").toString()==="-271821-04-19"');
console.log("temporal now plain passed");

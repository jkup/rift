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
    const prepared = prepareBoundedScript({ id: "plain-date-format", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const r = run(text);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
const argumentsList = [
    "2024,2,29",
    "0,1,1",
    "-1,1,1",
    "9999,12,31",
    "10000,1,1",
    "-271821,4,19",
    "275760,9,13",
];
const strings = [
    "2024-02-29",
    "0000-01-01",
    "-000001-01-01",
    "9999-12-31",
    "+010000-01-01",
    "-271821-04-19",
    "+275760-09-13",
];
for (let i = 0; i < strings.length; i++) {
    for (const method of ["toString", "toJSON", "toLocaleString"]) {
        passes(
            "new Temporal.PlainDate(" +
                argumentsList[i] +
                ")." +
                method +
                '()==="' +
                strings[i] +
                '"',
        );
    }
}
for (const text of [
    'new Temporal.PlainDate(2024,1,2).toString({calendarName:"always"})==="2024-01-02[u-ca=iso8601]"',
    'new Temporal.PlainDate(2024,1,2).toString({calendarName:"critical"})==="2024-01-02[!u-ca=iso8601]"',
    'new Temporal.PlainDate(2024,1,2).toString({calendarName:"never"})==="2024-01-02"',
    'new Temporal.PlainDate(2024,1,2).toString({calendarName:"auto"})==="2024-01-02"',
    'var log="";new Temporal.PlainDate(2024,1,2).toString({get calendarName(){log+="g";return {toString(){log+="s";return "critical"}}}})==="2024-01-02[!u-ca=iso8601]"&&log==="gs"',
    'new Temporal.PlainDate(2024,1,2).toString({get fractionalSecondDigits(){throw 1},get timeZone(){throw 2}})==="2024-01-02"',
    'var d=new Temporal.PlainDate(2024,1,2);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"calendarId",{get(){throw 2}});d.toString()==="2024-01-02"',
    'JSON.stringify({date:new Temporal.PlainDate(2024,1,2)})===\'{"date":"2024-01-02"}\'',
    'class D extends Temporal.PlainDate{}new D(2024,1,2).toString()==="2024-01-02"',
    "var touched=false,ok=false;try{Temporal.PlainDate.prototype.toString.call({}, {get calendarName(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
]) {
    passes(text);
}
for (const method of ["toJSON", "toLocaleString"]) {
    passes(
        "new Temporal.PlainDate(2024,1,2)." +
            method +
            '({get calendarName(){throw 1},toString(){throw 2}},{get calendarName(){throw 3}})==="2024-01-02"',
    );
    passes(
        "var d=new Temporal.PlainDate(2024,1,2);d.toString=function(){throw 1};d." +
            method +
            '()==="2024-01-02"',
    );
}
for (const options of ["null", "1", "true", '"auto"']) {
    passes(
        "var ok=false;try{new Temporal.PlainDate(2024,1,2).toString(" +
            options +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const option of ['"bad"', '"AUTO"', "1", "null"]) {
    passes(
        "var ok=false;try{new Temporal.PlainDate(2024,1,2).toString({calendarName:" +
            option +
            "})}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const method of ["toString", "toJSON", "toLocaleString"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"' +
            method +
            '");d.value.name==="' +
            method +
            '"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable',
    );
    passes(
        "var ok=false;try{Temporal.PlainDate.prototype." +
            method +
            ".call(Temporal.PlainDate.prototype)}catch(e){ok=e instanceof TypeError}ok",
    );
    const defining = new Realm((_line: string) => {}, "script"),
        calling = new Realm((_line: string) => {}, "script");
    const fn = run("Temporal.PlainDate.prototype." + method, defining);
    if (fn.type !== "normal") {
        throw new Error("method lookup");
    }
    calling.defineScriptGlobal("format", { value: fn.value });
    const result = run("format.call(new Temporal.PlainDate(2024,1,2))", calling);
    check(
        result.type === "normal" &&
            result.value.kind === "string" &&
            result.value.value === "2024-01-02",
        "cross-Realm receiver",
    );
    const failed = run("format.call({})", calling);
    check(
        failed.type === "throw" &&
            failed.value.kind === "object" &&
            failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
        "defining Realm error",
    );
}
console.log("temporal plain date format passed");

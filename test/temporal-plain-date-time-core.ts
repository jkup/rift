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
for (const text of [
    "var d=new Temporal.PlainDateTime(2024,2,29,12,34,56,123,456,789);d.year===2024&&d.month===2&&d.day===29&&d.hour===12&&d.minute===34&&d.second===56&&d.millisecond===123&&d.microsecond===456&&d.nanosecond===789",
    'var d=new Temporal.PlainDateTime(2024,2,29);d.calendarId==="iso8601"&&d.monthCode==="M02"&&d.dayOfWeek===4&&d.dayOfYear===60&&d.weekOfYear===9&&d.yearOfWeek===2024&&d.daysInWeek===7&&d.daysInMonth===29&&d.daysInYear===366&&d.monthsInYear===12&&d.inLeapYear&&d.era===undefined&&d.eraYear===undefined',
    "var d=new Temporal.PlainDateTime(2021,1,1);d.weekOfYear===53&&d.yearOfWeek===2020&&!d.inLeapYear&&d.hour===0&&d.nanosecond===0",
    "var d=new Temporal.PlainDateTime(-0.9,1.9,1.9,-0.9,undefined,2.9);Object.is(d.year,0)&&Object.is(d.hour,0)&&d.month===1&&d.day===1&&d.minute===0&&d.second===2",
    "new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).nanosecond===1",
    "new Temporal.PlainDateTime(275760,9,13,23,59,59,999,999,999).nanosecond===999",
    'new Temporal.PlainDateTime(2024,1,1,0,0,0,0,0,0,"ISO8601").calendarId==="iso8601"',
    "class D extends Temporal.PlainDateTime{};var d=new D(2024,1,1);d instanceof D&&d instanceof Temporal.PlainDateTime&&d.year===2024",
    'Temporal.PlainDateTime.name==="PlainDateTime"&&Temporal.PlainDateTime.length===3&&Temporal.PlainDateTime.prototype.constructor===Temporal.PlainDateTime',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime,"prototype");!d.writable&&!d.enumerable&&!d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal,"PlainDateTime");d.writable&&!d.enumerable&&d.configurable',
    'Object.prototype.toString.call(new Temporal.PlainDateTime(2024,1,1))==="[object Temporal.PlainDateTime]"',
    "var d=new Temporal.PlainDateTime(2024,1,1);d.hour=9;Object.keys(d).length===0&&d.hour===0",
    'var d=new Temporal.PlainDateTime(2024,1,1);Object.defineProperty(d,"year",{value:9});Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"year").get.call(d)===2024',
    'var log="";function f(n,v){return{valueOf(){log+=n;return v}}}new Temporal.PlainDateTime(f("0",2024),f("1",2),f("2",29),f("3",3),f("4",4),f("5",5),f("6",6),f("7",7),f("8",8));log==="012345678"',
    "var ok=false;try{new Temporal.PlainDateTime(2024,1,1,24,0,0,0,0,{valueOf(){throw 42}})}catch(e){ok=e===42}ok",
    "var touched=false,ok=false;try{new Temporal.PlainDateTime(NaN,{valueOf(){touched=true;return 1}},1)}catch(e){ok=e instanceof RangeError}ok&&!touched",
    'var touched=false,ok=false;try{new Temporal.PlainDateTime(2024,13,1,0,0,0,0,0,0,{toString(){touched=true;return "iso8601"}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var log="",F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){log+="p";return Temporal.PlainDateTime.prototype}});var d=Reflect.construct(Temporal.PlainDateTime,[{valueOf(){log+="y";return 2024}},1,1],F);d.year===2024&&log==="yp"',
    'var touched=false,ok=false,F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){touched=true;throw 42}});try{Reflect.construct(Temporal.PlainDateTime,[2024,1,1,24],F)}catch(e){ok=e instanceof RangeError}ok&&!touched',
    "var touched=false,ok=false;try{Temporal.PlainDateTime({valueOf(){touched=true;return 2024}},1,1)}catch(e){ok=e instanceof TypeError}ok&&!touched",
    "var ok=false;try{+new Temporal.PlainDateTime(2024,1,1)}catch(e){ok=e instanceof TypeError}ok",
    'var d=new Temporal.PlainDateTime(2024,2,29,12,34);Object.defineProperty(d,"year",{get(){throw 1}});Object.defineProperty(d,"hour",{get(){throw 2}});Object.defineProperty(d,"calendar",{get(){throw 3}});Temporal.PlainDate.from(d).toString()==="2024-02-29"&&Temporal.PlainTime.from(d).toString()==="12:34:00"&&new Temporal.PlainDate(2000,1,1).withCalendar(d).calendarId==="iso8601"',
    'var d=new Temporal.PlainDateTime(2024,1,1);Object.defineProperty(d,"calendar",{get(){throw 42}});var a=false,b=false;try{new Temporal.PlainDate(2024,1,1).with(d)}catch(e){a=e instanceof TypeError}try{new Temporal.PlainTime().with(d)}catch(e){b=e instanceof TypeError}a&&b',
    'var ok=false;try{Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"year").get.call(new Temporal.PlainDateTime(2024,1,1))}catch(e){ok=e instanceof TypeError}ok',
]) {
    passes(text);
}
const fields = [
    "calendarId",
    "era",
    "eraYear",
    "year",
    "month",
    "monthCode",
    "day",
    "dayOfWeek",
    "dayOfYear",
    "weekOfYear",
    "yearOfWeek",
    "daysInWeek",
    "daysInMonth",
    "daysInYear",
    "monthsInYear",
    "inLeapYear",
    "hour",
    "minute",
    "second",
    "millisecond",
    "microsecond",
    "nanosecond",
];
for (const field of fields) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"' +
            field +
            '");var ok=false;try{d.get.call(Temporal.PlainDateTime.prototype)}catch(e){ok=e instanceof TypeError}ok&&d.get.name==="get ' +
            field +
            '"&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable',
    );
}
for (const args of [
    "",
    "2024",
    "2024,1",
    "2023,2,29",
    "2024,13,1",
    "2024,1,0",
    "2024,1,1,24",
    "2024,1,1,0,60",
    "2024,1,1,0,0,60",
    "2024,1,1,0,0,0,1000",
    "2024,1,1,0,0,0,0,1000",
    "2024,1,1,0,0,0,0,0,-1",
    "-271821,4,19",
    "275760,9,14",
    "2024,1,1,Infinity",
    '2024,1,1,0,0,0,0,0,0,"gregory"',
]) {
    passes(
        "var ok=false;try{new Temporal.PlainDateTime(" +
            args +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const args of [
    "1n,1,1",
    "2024,1,1,Symbol()",
    "2024,1,1,0,0,0,0,0,0,null",
    '2024,1,1,0,0,0,0,0,0,new String("iso8601")',
]) {
    passes(
        "var ok=false;try{new Temporal.PlainDateTime(" +
            args +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const getter = run(
    'Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"hour").get',
    defining,
);
if (getter.type !== "normal") {
    throw new Error("getter lookup");
}
calling.defineScriptGlobal("hour", { value: getter.value });
const read = run("hour.call(new Temporal.PlainDateTime(2024,1,1,12))", calling);
check(
    read.type === "normal" && read.value.kind === "number" && read.value.value === 12,
    "cross-Realm brand",
);
const failed = run("hour.call({})", calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "defining Realm error",
);
const target = run("var F=function(){};F.prototype=0;F", defining);
if (target.type !== "normal") {
    throw new Error("target lookup");
}
calling.defineScriptGlobal("F", { value: target.value });
const result = run("Reflect.construct(Temporal.PlainDateTime,[2024,1,1],F)", calling);
check(
    result.type === "normal" &&
        result.value.kind === "object" &&
        result.value.object.getPrototypeOf() === defining.temporalPlainDateTimePrototype,
    "newTarget Realm fallback",
);
console.log("temporal plain date time core passed");

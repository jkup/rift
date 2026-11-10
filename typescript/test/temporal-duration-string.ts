import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "duration-string", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'Temporal.Duration.from("P1Y2M3W4DT25H61M61.123456789S").toString()==="P1Y2M3W4DT25H61M61.123456789S"',
    'Temporal.Duration.from("P1Y2M3W4DT25H61M61.123456789S").toString({smallestUnit:"nanosecond"})==="P1Y2M3W4DT25H61M61.123456789S"',
    'Temporal.Duration.from("P1Y2M3W4DT25H61M61.123456789S").toString({fractionalSecondDigits:3})==="P1Y2M3W5DT2H2M1.123S"',
    'Temporal.Duration.from("PT25H61M61.123456789S").toString({fractionalSecondDigits:3})==="PT26H2M1.123S"',
    'Temporal.Duration.from("PT61M61.123456789S").toString({fractionalSecondDigits:3})==="PT62M1.123S"',
    'Temporal.Duration.from("PT61.123456789S").toString({fractionalSecondDigits:3})==="PT61.123S"',
    'Temporal.Duration.from("-PT1.999S").toString({fractionalSecondDigits:2})==="-PT1.99S"',
    'Temporal.Duration.from("-PT0.0001S").toString({fractionalSecondDigits:3})==="PT0.000S"',
    'Temporal.Duration.from("P1DT23H59M59.999S").toString({smallestUnit:"second",roundingMode:"ceil"})==="P2DT0S"',
    'Temporal.Duration.from("PT23H59M59.999S").toString({smallestUnit:"second",roundingMode:"ceil"})==="PT24H0S"',
    'Temporal.Duration.from("PT59M59.999S").toString({smallestUnit:"second",roundingMode:"ceil"})==="PT60M0S"',
    'Temporal.Duration.from("PT59.999S").toString({smallestUnit:"second",roundingMode:"ceil"})==="PT60S"',
    'Temporal.Duration.from("-P1DT23H59M59.999S").toString({smallestUnit:"second",roundingMode:"floor"})==="-P2DT0S"',
    'new Temporal.Duration().toString()==="PT0S"',
    'new Temporal.Duration(1).toString({fractionalSecondDigits:2})==="P1YT0.00S"',
    'new Temporal.Duration(0,0,0,0,0,0,0,9007199254740992).toString({fractionalSecondDigits:2})==="PT9007199254740.99S"',
    'new Temporal.Duration().toString({get roundingIncrement(){throw 1},get timeZone(){throw 2}})==="PT0S"',
    'var log="";var s=new Temporal.Duration().toString({get fractionalSecondDigits(){log+="f";return "auto"},get roundingMode(){log+="r";return {toString(){log+="R";return "trunc"}}},get smallestUnit(){log+="s";return "second"}});s==="PT0S"&&log==="frRs"',
    'var d=new Temporal.Duration(0,0,0,0,0,0,1);Object.defineProperty(d,"seconds",{get(){throw 1}});d.toString()==="PT1S"',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"toString");d.value.name==="toString"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable',
]) passes(text);
const modes = ['ceil','floor','expand','trunc','halfCeil','halfFloor','halfExpand','halfTrunc','halfEven'];
const positive = ['2','1','2','1','2','1','2','1','2'];
const negative = ['1','2','2','1','1','2','2','1','2'];
for (let i = 0; i < modes.length; i++) {
    passes('Temporal.Duration.from("PT1.5S").toString({smallestUnit:"second",roundingMode:"'+modes[i]+'"})==="PT'+positive[i]+'S"');
    passes('Temporal.Duration.from("-PT1.5S").toString({smallestUnit:"second",roundingMode:"'+modes[i]+'"})==="-PT'+negative[i]+'S"');
}
for (let digits = 0; digits <= 9; digits++) {
    const suffix = digits === 0 ? '' : '.'+'123456789'.slice(0,digits);
    passes('Temporal.Duration.from("PT1.123456789S").toString({fractionalSecondDigits:'+digits+'})==="PT1'+suffix+'S"');
}
for (const options of ['null','1','"second"','true'])
    passes('var ok=false;try{new Temporal.Duration().toString('+options+')}catch(e){ok=e instanceof TypeError}ok');
for (const options of ['{smallestUnit:"minute"}','{smallestUnit:"hour"}','{smallestUnit:"day"}','{smallestUnit:"auto"}','{fractionalSecondDigits:10}','{fractionalSecondDigits:"3"}','{roundingMode:"bad"}'])
    passes('var ok=false;try{new Temporal.Duration().toString('+options+')}catch(e){ok=e instanceof RangeError}ok');
passes('var ok=false;try{new Temporal.Duration(0,0,0,0,0,0,9007199254740991,999,999,999).toString({smallestUnit:"second",roundingMode:"ceil"})}catch(e){ok=e instanceof RangeError}ok');
passes('var touched=false,ok=false;try{Temporal.Duration.prototype.toString.call({}, {get fractionalSecondDigits(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched');
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const fn = run('Temporal.Duration.prototype.toString', defining);
if (fn.type !== "normal") throw new Error("method lookup");
calling.defineScriptGlobal("stringify", { value: fn.value });
const failed = run('stringify.call(new Temporal.Duration(), {smallestUnit:"day"})', calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"), "defining Realm error");
console.log("temporal duration string passed");

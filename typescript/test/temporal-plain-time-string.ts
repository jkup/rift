import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "plain-time-string", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
const cases = [
    'String(new Temporal.PlainTime())==="00:00:00"',
    'new Temporal.PlainTime(1,2,3,100,200,300).toString()==="01:02:03.1002003"',
    'new Temporal.PlainTime(23,59,59,999,999,999).toString({smallestUnit:"second",roundingMode:"ceil"})==="00:00:00"',
    'new Temporal.PlainTime(23,59,59,999,999,999).toString({smallestUnit:"minute",roundingMode:"halfExpand"})==="00:00"',
    'new Temporal.PlainTime(1,2,3,123,456,789).toString({fractionalSecondDigits:2.9})==="01:02:03.12"',
    'new Temporal.PlainTime(1,2,3,123,456,789).toString({fractionalSecondDigits:9.9})==="01:02:03.123456789"',
    'new Temporal.PlainTime(1,2,3).toString({fractionalSecondDigits:-0})==="01:02:03"',
    'new Temporal.PlainTime(1,2,3,123).toString({fractionalSecondDigits:{toString(){return "auto"}}})==="01:02:03.123"',
    'new Temporal.PlainTime(1,2,3,123).toString({fractionalSecondDigits:9,smallestUnit:"second"})==="01:02:03"',
    'new Temporal.PlainTime().toString({get timeZone(){throw 1},get roundingIncrement(){throw 2}})==="00:00:00"',
    'var log="";var o={get fractionalSecondDigits(){log+="d";return {toString(){log+="D";return "auto"}}},get roundingMode(){log+="r";return {toString(){log+="R";return "trunc"}}},get smallestUnit(){log+="u";return {toString(){log+="U";return "second"}}}};new Temporal.PlainTime().toString(o)==="00:00:00"&&log==="dDrRuU"',
    'var log="";var ok=false;try{new Temporal.PlainTime().toString({get fractionalSecondDigits(){log+="d";throw 42},get roundingMode(){log+="r"}})}catch(e){ok=e===42}ok&&log==="d"',
    'var log="";var ok=false;try{new Temporal.PlainTime().toString({get roundingMode(){log+="r";throw 42},get smallestUnit(){log+="u"}})}catch(e){ok=e===42}ok&&log==="r"',
    'var touched=false;var ok=false;try{Temporal.PlainTime.prototype.toString.call({}, {get fractionalSecondDigits(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var touched=false;var ok=false;try{new Temporal.PlainTime().toString({fractionalSecondDigits:10,get smallestUnit(){touched=true;return "second"}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'class T extends Temporal.PlainTime{}new T(3).toString()==="03:00:00"',
    'var t=new Temporal.PlainTime(4);Object.defineProperty(t,"hour",{get(){throw 1}});t.valueOf=function(){throw 2};t.toString()==="04:00:00"',
    'var t=new Temporal.PlainTime(7);Object.setPrototypeOf(t,null);Temporal.PlainTime.prototype.toString.call(t)==="07:00:00"',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"toString");d.value.name==="toString"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable',
];
for (const text of cases) passes(text);
const expected = ['01:02:03','01:02:03.1','01:02:03.12','01:02:03.123','01:02:03.1234','01:02:03.12345','01:02:03.123456','01:02:03.1234567','01:02:03.12345678','01:02:03.123456789'];
for (let digits = 0; digits < expected.length; digits++) passes('new Temporal.PlainTime(1,2,3,123,456,789).toString({fractionalSecondDigits:'+digits+'})==="'+expected[digits]+'"');
const units = ['minute','second','millisecond','microsecond','nanosecond'];
const unitExpected = ['01:02','01:02:03','01:02:03.123','01:02:03.123456','01:02:03.123456789'];
for (let i=0;i<units.length;i++) for (const suffix of ['', 's']) passes('new Temporal.PlainTime(1,2,3,123,456,789).toString({smallestUnit:"'+units[i]+suffix+'"})==="'+unitExpected[i]+'"');
const modes = ['ceil','floor','expand','trunc','halfCeil','halfFloor','halfExpand','halfTrunc','halfEven'];
const roundsUp = [true,false,true,false,true,false,true,false,false];
for (let i=0;i<modes.length;i++) passes('new Temporal.PlainTime(1,2,2,500).toString({smallestUnit:"second",roundingMode:"'+modes[i]+'"})==="01:02:0'+(roundsUp[i]?3:2)+'"');
passes('new Temporal.PlainTime(1,2,3,500).toString({smallestUnit:"second",roundingMode:"halfEven"})==="01:02:04"');
for (const options of ['null','true','1','"auto"','1n','Symbol()']) passes('var ok=false;try{new Temporal.PlainTime().toString('+options+')}catch(e){ok=e instanceof TypeError}ok');
for (const option of ['fractionalSecondDigits:-1','fractionalSecondDigits:10','fractionalSecondDigits:NaN','fractionalSecondDigits:Infinity','fractionalSecondDigits:"3"','fractionalSecondDigits:null','roundingMode:"unknown"','smallestUnit:"hour"','smallestUnit:"day"','smallestUnit:"auto"','smallestUnit:"unknown"']) passes('var ok=false;try{new Temporal.PlainTime().toString({'+option+'})}catch(e){ok=e instanceof RangeError}ok');
for (const receiver of ['null','undefined','{}','Temporal.PlainTime.prototype','new Temporal.Instant(0n)']) passes('var ok=false;try{Temporal.PlainTime.prototype.toString.call('+receiver+')}catch(e){ok=e instanceof TypeError}ok');
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const method = run('Temporal.PlainTime.prototype.toString', defining);
if (method.type !== "normal") throw new Error("method lookup");
calling.defineScriptGlobal("stringify", { value: method.value });
const result = run('stringify.call(new Temporal.PlainTime(4))', calling);
check(result.type === "normal" && result.value.kind === "string" && result.value.value === "04:00:00", "cross-Realm brand");
const failed = run('stringify.call({})', calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"), "defining Realm error");
console.log("temporal plain time string passed");

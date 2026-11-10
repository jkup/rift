import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "date-time-core", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}

for(const text of [
 'new Temporal.PlainDateTime(2024,2,28,23,59,59,999).round("second").toString()==="2024-02-29T00:00:00"',
 'new Temporal.PlainDateTime(2023,12,31,23,59,59,999).round("minute").toString()==="2024-01-01T00:00:00"',
 'new Temporal.PlainDateTime(2024,2,29,12).round("days").toString()==="2024-03-01T00:00:00"',
 'new Temporal.PlainDateTime(1969,12,31,12).round({smallestUnit:"day",roundingMode:"halfEven"}).toString()==="1969-12-31T00:00:00"',
 'new Temporal.PlainDateTime(1969,12,31,23,59,59,500).round({smallestUnit:"second",roundingMode:"trunc"}).toString()==="1969-12-31T23:59:59"',
 'new Temporal.PlainDateTime(2024,1,1,12,8).round({smallestUnit:"minute",roundingIncrement:15}).toString()==="2024-01-01T12:15:00"',
 'new Temporal.PlainDateTime(2024,1,1,23).round({smallestUnit:"hour",roundingIncrement:12}).toString()==="2024-01-02T00:00:00"',
 'var d=new Temporal.PlainDateTime(2024,1,1,0,0,0,0,0,1);var r=d.round("nanosecond");r!==d&&r.equals(d)',
 'class D extends Temporal.PlainDateTime{};Object.getPrototypeOf(new D(2024,1,1).round("day"))===Temporal.PlainDateTime.prototype',
 'var log="";new Temporal.PlainDateTime(2024,1,1).round({get roundingIncrement(){log+="i";return {valueOf(){log+="I";return 1}}},get roundingMode(){log+="m";return{toString(){log+="M";return"trunc"}}},get smallestUnit(){log+="u";return{toString(){log+="U";return"day"}}}});log==="iImMuU"',
 'var log="",ok=false;try{new Temporal.PlainDateTime(2024,1,1).round({get roundingIncrement(){log+="i";return 2},get roundingMode(){log+="m"},get smallestUnit(){log+="u";return "day"}})}catch(e){ok=e instanceof RangeError}ok&&log==="imu"',
 'var touched=false,ok=false;try{Temporal.PlainDateTime.prototype.round.call({}, {get roundingIncrement(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
 'var d=new Temporal.PlainDateTime(2024,1,1,12);Object.defineProperty(d,"hour",{get(){throw 1}});d.round("hour").hour===12',
 'new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).round("nanosecond").nanosecond===1',
 'var ok=false;try{new Temporal.PlainDateTime(-271821,4,19,0,0,0,0,0,1).round("day")}catch(e){ok=e instanceof RangeError}ok',
 'var ok=false;try{new Temporal.PlainDateTime(275760,9,13,23,59,59,999).round("second")}catch(e){ok=e instanceof RangeError}ok',
 'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDateTime.prototype,"round");d.value.name==="round"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable',
]) passes(text);
const modes=['ceil','floor','expand','trunc','halfCeil','halfFloor','halfExpand','halfTrunc','halfEven'];
const up=[true,false,true,false,true,false,true,false,false];
for(let i=0;i<modes.length;i++)passes('new Temporal.PlainDateTime(1900,1,1,0,0,2,500).round({smallestUnit:"second",roundingMode:"'+modes[i]+'"}).second==='+ (up[i]?3:2));
for(const options of ['undefined','null','1','true','{}'])passes('var ok=false;try{new Temporal.PlainDateTime(2024,1,1).round('+options+')}catch(e){ok=e instanceof TypeError}ok');
for(const options of ['"year"','"month"','"week"','"auto"','{smallestUnit:"day",roundingIncrement:2}','{smallestUnit:"hour",roundingIncrement:24}','{smallestUnit:"minute",roundingIncrement:7}','{smallestUnit:"second",roundingIncrement:60}','{smallestUnit:"millisecond",roundingIncrement:1000}','{smallestUnit:"nanosecond",roundingIncrement:0}'])passes('var ok=false;try{new Temporal.PlainDateTime(2024,1,1).round('+options+')}catch(e){ok=e instanceof RangeError}ok');
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const fn=run('Temporal.PlainDateTime.prototype.round',defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("round",{value:fn.value});
const result=run('round.call(new Temporal.PlainDateTime(2024,1,1),"day")',calling);check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalPlainDateTimePrototype,"defining Realm result");
const failed=run('round.call({}, "day")',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
console.log("temporal plain date time round passed");

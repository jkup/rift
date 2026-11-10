import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "plain-time-difference", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'new Temporal.PlainTime(1,2,3,4,5,6).until(new Temporal.PlainTime(3,5,7,9,11,13)).toString()==="PT2H3M4.005006007S"',
    'new Temporal.PlainTime(1,2,3,4,5,6).since(new Temporal.PlainTime(3,5,7,9,11,13)).toString()==="-PT2H3M4.005006007S"',
    'new Temporal.PlainTime(23).until("01:00").toString()==="-PT22H"',
    'new Temporal.PlainTime().until("23:59:59.999999999").toString()==="PT23H59M59.999999999S"',
    'new Temporal.PlainTime().until("23:59:59.999999999",{smallestUnit:"hour",roundingMode:"ceil"}).toString()==="PT24H"',
    'new Temporal.PlainTime().until("02:03:04.005006007",{largestUnit:"second"}).toString()==="PT7384.005006007S"',
    'new Temporal.PlainTime().until("00:00:00.000000001",{largestUnit:"nanosecond"}).nanoseconds===1',
    'new Temporal.PlainTime().until({hour:99}).hours===23',
    'new Temporal.PlainTime().until({hour:2,get overflow(){throw 1}},{get overflow(){throw 2}}).hours===2',
    'var t=new Temporal.PlainTime(1);Object.defineProperty(t,"hour",{get(){throw 1}});Object.defineProperty(t,"constructor",{get(){throw 2}});t.until(t).blank',
    'class T extends Temporal.PlainTime{}Object.getPrototypeOf(new T().until(new T(1)))===Temporal.Duration.prototype',
    'var t=new Temporal.PlainTime(),a=t.until(t),b=t.until(t);a!==b&&a.blank&&b.blank',
    'var log="";new Temporal.PlainTime().until({get hour(){log+="h";return {valueOf(){log+="H";return 1}}},get second(){log+="s";return 2}},{get largestUnit(){log+="l"},get roundingIncrement(){log+="i"},get roundingMode(){log+="r"},get smallestUnit(){log+="u"}}).hours===1&&log==="hHsliru"',
    'var touched=false,ok=false;try{new Temporal.PlainTime().until("bad",{get largestUnit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'new Temporal.PlainTime().until("00:31",{smallestUnit:"minute",roundingIncrement:30,roundingMode:"ceil"}).toString()==="PT1H"',
]) passes(text);
const modes=['ceil','floor','expand','trunc','halfCeil','halfFloor','halfExpand','halfTrunc','halfEven'];
const positive=[2,1,2,1,2,1,2,1,2],negative=[-1,-2,-2,-1,-1,-2,-2,-1,-2];
for (let i=0;i<modes.length;i++) {
    passes('new Temporal.PlainTime().until("00:00:01.5",{smallestUnit:"second",roundingMode:"'+modes[i]+'"}).seconds==='+positive[i]);
    passes('new Temporal.PlainTime().since("00:00:01.5",{smallestUnit:"second",roundingMode:"'+modes[i]+'"}).seconds==='+negative[i]);
}
for (const method of ["until","since"]) {
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
    passes('var touched=false,ok=false;try{Temporal.PlainTime.prototype.'+method+'.call({}, {get hour(){touched=true;return 1}})}catch(e){ok=e instanceof TypeError}ok&&!touched');
    for (const value of ['undefined','null','1','{}'])
        passes('var ok=false;try{new Temporal.PlainTime().'+method+'('+value+')}catch(e){ok=e instanceof TypeError}ok');
    for (const options of ['{largestUnit:"day"}','{smallestUnit:"auto"}','{smallestUnit:"hour",roundingIncrement:24}','{largestUnit:"second",smallestUnit:"hour"}'])
        passes('var ok=false;try{new Temporal.PlainTime().'+method+'("00:00",'+options+')}catch(e){ok=e instanceof RangeError}ok');
    const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
    const fn=run('Temporal.PlainTime.prototype.'+method,defining);
    if(fn.type!=="normal")throw new Error("method lookup");
    calling.defineScriptGlobal("difference",{value:fn.value});
    const result=run('difference.call(new Temporal.PlainTime(),new Temporal.PlainTime(1))',calling);
    check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalDurationPrototype,"defining Realm result");
    const failed=run('difference.call(new Temporal.PlainTime(),"bad")',calling);
    check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("RangeError"),"defining Realm error");
}
console.log("temporal plain time difference passed");

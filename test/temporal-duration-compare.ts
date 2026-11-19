import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "duration-compare", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal") {
        throw new Error("completion: " + text);
    }
    return result.value;
}
function passes(text: string): void {
    const value = run(text);
    if (value.kind !== "boolean" || !value.value) {
        throw new Error(text);
    }
}
for (const text of [
    'Temporal.Duration.compare("PT1H","PT60M")===0',
    'Temporal.Duration.compare("P1D","PT24H")===0',
    'Temporal.Duration.compare("PT0.000000001S","PT0S")===1',
    'Temporal.Duration.compare("-PT0.000000001S","PT0S")===-1',
    'Temporal.Duration.compare("PT9007199254740991.000000001S","PT9007199254740991.000000002S")===-1',
    'Temporal.Duration.compare("-PT9007199254740991.000000001S","-PT9007199254740991.000000002S")===1',
    "Temporal.Duration.compare({years:4294967295},{years:4294967295})===0",
    'Temporal.Duration.compare({months:1},{months:1},{relativeTo:"+275760-09-13"})===0',
    'Temporal.Duration.compare({years:1},{days:366},{relativeTo:"2020-01-01"})===0',
    'Temporal.Duration.compare({years:1},{days:365},{relativeTo:"2020-02-29"})===0',
    'Temporal.Duration.compare({years:-1},{days:-366},{relativeTo:"2020-02-29"})===0',
    'Temporal.Duration.compare({months:1},{days:29},{relativeTo:"2020-01-31"})===0',
    'Temporal.Duration.compare({months:-1},{days:-31},{relativeTo:"2020-03-31"})===0',
    'Temporal.Duration.compare({weeks:1},{days:7},{relativeTo:"2020-01-01"})===0',
    "Temporal.Duration.compare({months:1,days:2,hours:3},{days:31,hours:3},{relativeTo:{year:2020,month:1,day:31}})===0",
    "Temporal.Duration.compare({months:1},{days:28},{relativeTo:new Temporal.PlainDateTime(2020,1,31,23)})===1",
    'Temporal.Duration.compare({days:104249991374},{days:1},{relativeTo:"+275760-09-13"})===1',
    'Temporal.Duration.compare({days:-104249991374},{days:-1},{relativeTo:"-271821-04-19"})===-1',
    'Temporal.Duration.compare({weeks:1,days:100},{days:107},{relativeTo:"+275760-09-06"})===0',
    'var log="";var a={get days(){log+="a";return 1}},b={get days(){log+="b";return 2}};Temporal.Duration.compare(a,b,{get relativeTo(){log+="r";return "2020-01-01"}})===-1&&log==="abr"',
    "var touched=false,ok=false;try{Temporal.Duration.compare({get days(){throw 42}},{get days(){touched=true;return 1}})}catch(e){ok=e===42}ok&&!touched",
    'var touched=false,ok=false;try{Temporal.Duration.compare("PT0S",{}, {get relativeTo(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var ok=false;try{Temporal.Duration.compare("P1Y","P1Y",{get relativeTo(){throw 43}})}catch(e){ok=e===43}ok',
    'var d=new Temporal.Duration(0,0,0,1);Object.defineProperty(d,"days",{get(){throw 1}});Temporal.Duration.compare(d,"P1D")===0',
    'Temporal.Duration.compare.call(null,"PT0S","PT1S")===-1',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration,"compare");d.writable&&!d.enumerable&&d.configurable&&d.value.name==="compare"&&d.value.length===2',
    '1/Temporal.Duration.compare("PT0S","PT0S")===Infinity',
]) {
    passes(text);
}
for (const expression of [
    "Temporal.Duration.compare({years:1},{days:365})",
    "Temporal.Duration.compare({months:1},{days:30})",
    "Temporal.Duration.compare({weeks:1},{days:7})",
    'Temporal.Duration.compare({months:1},{days:1},{relativeTo:"+275760-09-13"})',
    'Temporal.Duration.compare({weeks:-1},{days:-7},{relativeTo:"-271821-04-19"})',
    'Temporal.Duration.compare({years:1,seconds:9007199254740991},{days:1},{relativeTo:"2020-01-01"})',
    'Temporal.Duration.compare({years:-1,seconds:-9007199254740991},{days:-1},{relativeTo:"2020-01-01"})',
    'Temporal.Duration.compare("PT0S","PT0S",{relativeTo:"bad"})',
    'Temporal.Duration.compare("PT0S","PT0S",{relativeTo:"2020-01-01[Invalid/Zone]"})',
]) {
    passes("var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok");
}
for (const expression of [
    "Temporal.Duration.compare()",
    'Temporal.Duration.compare("PT0S")',
    'Temporal.Duration.compare("PT0S","PT0S",null)',
    'new Temporal.Duration.compare("PT0S","PT0S")',
]) {
    passes("var ok=false;try{" + expression + "}catch(e){ok=e instanceof TypeError}ok");
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("compare", { value: run("Temporal.Duration.compare", owner) });
caller.defineScriptGlobal("OwnerRangeError", { value: run("RangeError", owner) });
const cross = run(
    'var ok=false;try{compare("P1Y","P1D")}catch(e){ok=e instanceof OwnerRangeError&&!(e instanceof RangeError)}ok',
    caller,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("comparison error Realm");
}
console.log("temporal duration compare passed");

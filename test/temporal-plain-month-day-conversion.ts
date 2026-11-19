import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "plain-date-core", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
passes("Temporal.PlainMonthDay.from(\"--02-29\").toString({calendarName:\"always\"})===\"1972-02-29[u-ca=iso8601]\"");
passes("Temporal.PlainMonthDay.from(\"2000-02-29T23:30-12:00\").toString({calendarName:\"always\"})===\"1972-02-29[u-ca=iso8601]\"");
passes("Temporal.PlainMonthDay.from(\"+999999-12-31\").toString()===\"12-31\"&&Temporal.PlainMonthDay.from(\"-271821-04-01\").toString()===\"04-01\"");
passes("Temporal.PlainMonthDay.from({month:2,day:29}).toString()===\"02-29\"");
passes("Temporal.PlainMonthDay.from({monthCode:\"M02\",day:29}).toString()===\"02-29\"");
passes("Temporal.PlainMonthDay.from({year:2023,month:2,day:29}).toString()===\"02-28\"&&Temporal.PlainMonthDay.from({year:2023,monthCode:\"M02\",day:29}).toString()===\"02-28\"");
passes("Temporal.PlainMonthDay.from({year:2000,month:2,day:29}).toString({calendarName:\"always\"})===\"1972-02-29[u-ca=iso8601]\"");
passes("Temporal.PlainMonthDay.from({year:999999,month:12,day:31},{overflow:\"reject\"}).toString()===\"12-31\"");
passes("Temporal.PlainMonthDay.from({month:99,day:99}).toString()===\"12-31\"");
passes("var d=new Temporal.PlainMonthDay(2,29,undefined,2000),c=Temporal.PlainMonthDay.from(d);c!==d&&c.equals(d)&&c.toString({calendarName:\"always\"})===\"2000-02-29[u-ca=iso8601]\"");
passes("var d=new Temporal.PlainMonthDay(2,29);Object.defineProperty(d,\"day\",{get(){throw 1}});Object.defineProperty(d,\"calendar\",{get(){throw 2}});Temporal.PlainMonthDay.from(d).day===29");
passes("var d=new Temporal.PlainDate(2024,2,29);Object.defineProperty(d,\"calendar\",{get(){throw 1}});Temporal.PlainMonthDay.from(d).toString()===\"02-29\"");
passes("var d=new Temporal.PlainDateTime(2024,2,29);Object.defineProperty(d,\"calendar\",{get(){throw 1}});Temporal.PlainMonthDay.from(d).toString()===\"02-29\"");
passes("new Temporal.PlainMonthDay(2,29).equals(\"2000-02-29\")&&!new Temporal.PlainMonthDay(2,29,undefined,2000).equals(\"2000-02-29\")");
passes("class D extends Temporal.PlainMonthDay{};Object.getPrototypeOf(D.from(\"02-29\"))===Temporal.PlainMonthDay.prototype");
passes("Temporal.PlainMonthDay.from.call(null,\"02-29\").day===29");
passes("var log=\"\";Temporal.PlainMonthDay.from({get calendar(){log+=\"c\"},get day(){log+=\"d\";return 29},get month(){log+=\"m\";return 2},get monthCode(){log+=\"k\"},get year(){log+=\"y\";return 2024}},{get overflow(){log+=\"o\"}});log===\"cdmkyo\"");
passes("var marker={},ok=false;try{Temporal.PlainMonthDay.from({},{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var marker={},ok=false;try{Temporal.PlainMonthDay.from({year:2023,monthCode:\"M02\",day:29},{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var touched=false,ok=false;try{Temporal.PlainMonthDay.from(\"bad\",{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched");
passes("var touched=false,ok=false;try{Temporal.PlainMonthDay.prototype.equals.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var d=new Temporal.PlainMonthDay(2,29),marker={},ok=false;try{Temporal.PlainMonthDay.from(d,{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("Temporal.PlainMonthDay.compare===undefined");
passes("var ok=false;try{Temporal.PlainMonthDay.from(undefined)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from(null)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from(1)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({month:2})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({day:29})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({monthCode:2,day:29})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({month:0,day:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({month:2,day:0})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({month:2,monthCode:\"M03\",day:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({monthCode:\"M13\",day:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({monthCode:\"M01L\",day:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({year:Infinity,month:2,day:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from(\"2023-02-29\")}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({month:13,day:1},{overflow:\"reject\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({month:2,day:30},{overflow:\"reject\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainMonthDay.from({year:2023,monthCode:\"M02\",day:29},{overflow:\"reject\"})}catch(e){ok=e instanceof RangeError}ok");
for(const method of ["from","equals"]) {
 const target=method==="equals"?"Temporal.PlainMonthDay.prototype":"Temporal.PlainMonthDay";
 passes('var d=Object.getOwnPropertyDescriptor('+target+',"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
}
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const fn=run('Temporal.PlainMonthDay.from',defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("convert",{value:fn.value});
const result=run('convert("02-29")',calling);
check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalPlainMonthDayPrototype,"defining Realm result");
const failed=run('convert(null)',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
console.log("temporal plain month day conversion passed");

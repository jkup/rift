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
passes("Temporal.PlainYearMonth.from(\"2024-02-29\").toString({calendarName:\"always\"})===\"2024-02-01[u-ca=iso8601]\"");
passes("Temporal.PlainYearMonth.from(\"2024-02-29T23:30-12:00\").toString()===\"2024-02\"");
passes("Temporal.PlainYearMonth.from({year:2024,month:99}).month===12");
passes("Temporal.PlainYearMonth.from({year:2024,monthCode:\"M02\",get day(){throw 1},get era(){throw 2},get eraYear(){throw 3}}).toString()===\"2024-02\"");
passes("var d=new Temporal.PlainYearMonth(2024,2,undefined,29),c=Temporal.PlainYearMonth.from(d);c!==d&&c.equals(d)&&c.toString({calendarName:\"always\"})===\"2024-02-29[u-ca=iso8601]\"");
passes("var d=new Temporal.PlainYearMonth(2024,2,undefined,29);Object.defineProperty(d,\"year\",{get(){throw 1}});Object.defineProperty(d,\"calendar\",{get(){throw 2}});Temporal.PlainYearMonth.from(d).year===2024");
passes("var d=new Temporal.PlainDate(2024,2,29);Object.defineProperty(d,\"calendar\",{get(){throw 1}});Temporal.PlainYearMonth.from(d).toString()===\"2024-02\"");
passes("var d=new Temporal.PlainDateTime(2024,2,29);Object.defineProperty(d,\"calendar\",{get(){throw 1}});Temporal.PlainYearMonth.from(d).toString()===\"2024-02\"");
passes("var d=new Temporal.PlainYearMonth(2024,2);Object.defineProperty(d,\"calendar\",{get(){throw 1}});d.day=29;Temporal.PlainDate.from(d).day===29&&Temporal.PlainDateTime.from(d).day===29");
passes("Temporal.PlainYearMonth.from({year:-271821,month:4}).toString()===\"-271821-04\"&&Temporal.PlainYearMonth.from({year:275760,month:9}).month===9");
passes("Temporal.PlainYearMonth.from(\"-271821-04-01\").month===4&&Temporal.PlainYearMonth.from(\"+275760-09-30\").month===9");
passes("class D extends Temporal.PlainYearMonth{};Object.getPrototypeOf(D.from(\"2024-02\"))===Temporal.PlainYearMonth.prototype");
passes("Temporal.PlainYearMonth.from.call(null,\"2024-02\").month===2");
passes("Temporal.PlainYearMonth.compare(\"2023-12\",\"2024-01\")===-1&&Temporal.PlainYearMonth.compare(\"2024-01\",\"2023-12\")===1&&Temporal.PlainYearMonth.compare(\"2024-02-29\",\"2024-02-01\")===0");
passes("Temporal.PlainYearMonth.compare(new Temporal.PlainYearMonth(2024,2,undefined,29),\"2024-02\")===1");
passes("new Temporal.PlainYearMonth(2024,2).equals(\"2024-02-29\")&&!new Temporal.PlainYearMonth(2024,2,undefined,29).equals(\"2024-02-29\")");
passes("var log=\"\";Temporal.PlainYearMonth.from({get calendar(){log+=\"c\"},get month(){log+=\"m\";return {valueOf(){log+=\"M\";return 2}}},get monthCode(){log+=\"k\";return {toString(){log+=\"K\";return \"M02\"}}},get year(){log+=\"y\";return 2024}},{get overflow(){log+=\"o\";return {toString(){log+=\"O\";return \"reject\"}}}});log===\"cmMkKyoO\"");
passes("var marker={},ok=false;try{Temporal.PlainYearMonth.from({},{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var marker={},ok=false;try{Temporal.PlainYearMonth.from(\"+999999-01\",{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var touched=false,ok=false;try{Temporal.PlainYearMonth.from(\"bad\",{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched");
passes("var touched=false,ok=false;try{Temporal.PlainYearMonth.prototype.equals.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var touched=false,ok=false;try{Temporal.PlainYearMonth.compare(\"bad\",{get calendar(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched");
passes("var d=new Temporal.PlainYearMonth(2024,2),marker={},ok=false;try{Temporal.PlainYearMonth.from(d,{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from(undefined)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from(null)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from(1)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from(true)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:2024})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({month:2})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:2024,monthCode:2})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:2024,month:0})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:2024,month:2,monthCode:\"M03\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:2024,monthCode:\"M13\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:2024,monthCode:\"M01L\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:-271821,month:3})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:275760,month:10})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:Infinity,month:2})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from(\"2024-02-30\")}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from({year:2024,month:13},{overflow:\"reject\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{Temporal.PlainYearMonth.from(\"2024-02\",{overflow:\"bad\"})}catch(e){ok=e instanceof RangeError}ok");
for(const method of ["from","compare","equals"]) {
 const target=method==="equals"?"Temporal.PlainYearMonth.prototype":"Temporal.PlainYearMonth";
 passes('var d=Object.getOwnPropertyDescriptor('+target+',"'+method+'");d.value.name==="'+method+'"&&d.value.length==='+(method==="compare"?2:1)+'&&d.writable&&!d.enumerable&&d.configurable');
}
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const fn=run('Temporal.PlainYearMonth.from',defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("convert",{value:fn.value});
const result=run('convert("2024-02")',calling);
check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalPlainYearMonthPrototype,"defining Realm result");
const failed=run('convert(null)',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
console.log("temporal plain year month conversion passed");

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
passes("var d=new Temporal.PlainMonthDay(2,29);d.monthCode===\"M02\"&&d.day===29&&d.calendarId===\"iso8601\"");
passes("var d=new Temporal.PlainMonthDay(2.9,29.9,\"ISO8601\",2000.9);d.monthCode===\"M02\"&&d.day===29");
passes("new Temporal.PlainMonthDay(4,19,undefined,-271821).day===19&&new Temporal.PlainMonthDay(9,13,undefined,275760).day===13");
passes("new Temporal.PlainMonthDay(2,29,undefined,null).day===29");
passes("var d=new Temporal.PlainMonthDay(2,29);d.year===undefined&&d.month===undefined&&d.era===undefined&&d.daysInMonth===undefined");
passes("var d=new Temporal.PlainMonthDay(2,29);d.day=1;d.day===29&&Object.keys(d).length===0");
passes("class D extends Temporal.PlainMonthDay{};var d=new D(2,29);d instanceof D&&d instanceof Temporal.PlainMonthDay&&d.day===29");
passes("Temporal.PlainMonthDay.name===\"PlainMonthDay\"&&Temporal.PlainMonthDay.length===2&&Temporal.PlainMonthDay.prototype.constructor===Temporal.PlainMonthDay");
passes("Object.prototype.toString.call(new Temporal.PlainMonthDay(2,29))===\"[object Temporal.PlainMonthDay]\"");
passes("var log=\"\";new Temporal.PlainMonthDay({valueOf(){log+=\"m\";return 2}},{valueOf(){log+=\"d\";return 29}},\"iso8601\",{valueOf(){log+=\"y\";return 2000}});log===\"mdy\"");
passes("var touched=false,ok=false;try{new Temporal.PlainMonthDay(2,29,null,{valueOf(){touched=true;return 2000}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var touched=false,ok=false;try{Temporal.PlainMonthDay({valueOf(){touched=true;return 2}},29)}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var marker={},ok=false;try{new Temporal.PlainMonthDay(99,99,\"iso8601\",{valueOf(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var d=new Temporal.PlainMonthDay(2,29);Object.defineProperty(d,\"calendar\",{get(){throw 1}});new Temporal.PlainDate(2024,1,1).withCalendar(d).calendarId===\"iso8601\"");
passes("var d=new Temporal.PlainMonthDay(2,29);Object.defineProperty(d,\"calendar\",{get(){throw 1}});var ok=false;try{new Temporal.PlainDate(2024,1,1).with(d)}catch(e){ok=e instanceof TypeError}ok");
passes("var d=new Temporal.PlainMonthDay(2,29);d.year=2024;Object.defineProperty(d,\"calendar\",{get(){throw 1}});Temporal.PlainDate.from(d).toString()===\"2024-02-29\"&&Temporal.PlainYearMonth.from(d).toString()===\"2024-02\"");
passes("var ok=false;try{+new Temporal.PlainMonthDay(2,29)}catch(e){ok=e instanceof TypeError}ok");
passes("var d=Object.getOwnPropertyDescriptor(Temporal.PlainMonthDay.prototype,\"calendarId\");var bad=false;try{d.get.call(Temporal.PlainMonthDay.prototype)}catch(e){bad=e instanceof TypeError}bad&&d.get.length===0&&d.get.name===\"get calendarId\"&&d.set===undefined&&!d.enumerable&&d.configurable");
passes("var d=Object.getOwnPropertyDescriptor(Temporal.PlainMonthDay.prototype,\"monthCode\");var bad=false;try{d.get.call(Temporal.PlainMonthDay.prototype)}catch(e){bad=e instanceof TypeError}bad&&d.get.length===0&&d.get.name===\"get monthCode\"&&d.set===undefined&&!d.enumerable&&d.configurable");
passes("var d=Object.getOwnPropertyDescriptor(Temporal.PlainMonthDay.prototype,\"day\");var bad=false;try{d.get.call(Temporal.PlainMonthDay.prototype)}catch(e){bad=e instanceof TypeError}bad&&d.get.length===0&&d.get.name===\"get day\"&&d.set===undefined&&!d.enumerable&&d.configurable");
passes("var ok=false;try{new Temporal.PlainMonthDay()}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(0,1)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(13,1)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,0)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,30)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29,undefined,1900)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(4,18,undefined,-271821)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(9,14,undefined,275760)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(1,1,undefined,Infinity)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(Infinity,1)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(1,NaN)}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29,\"gregory\")}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(1n,1)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,Symbol())}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29,null)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29,new String(\"iso8601\"))}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29,undefined,2000n)}catch(e){ok=e instanceof TypeError}ok");
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const getter=run('Object.getOwnPropertyDescriptor(Temporal.PlainMonthDay.prototype,"day").get',defining);
if(getter.type!=="normal")throw new Error("getter lookup");calling.defineScriptGlobal("day",{value:getter.value});
const read=run('day.call(new Temporal.PlainMonthDay(2,29))',calling);
check(read.type==="normal"&&read.value.kind==="number"&&read.value.value===29,"cross-Realm brand");
const failed=run('day.call({})',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
const target=run('var F=function(){};F.prototype=0;F',defining);if(target.type!=="normal")throw new Error("target lookup");calling.defineScriptGlobal("F",{value:target.value});
const constructed=run('Reflect.construct(Temporal.PlainMonthDay,[2,29],F)',calling);
check(constructed.type==="normal"&&constructed.value.kind==="object"&&constructed.value.object.getPrototypeOf()===defining.temporalPlainMonthDayPrototype,"newTarget Realm fallback");
console.log("temporal plain month day core passed");

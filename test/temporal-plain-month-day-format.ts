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
passes("new Temporal.PlainMonthDay(2,29).toString()===\"02-29\"");
passes("new Temporal.PlainMonthDay(2,29).toString({calendarName:\"always\"})===\"1972-02-29[u-ca=iso8601]\"");
passes("new Temporal.PlainMonthDay(2,29,undefined,2000).toString({calendarName:\"critical\"})===\"2000-02-29[!u-ca=iso8601]\"");
passes("new Temporal.PlainMonthDay(1,1,undefined,-1).toString({calendarName:\"always\"})===\"-000001-01-01[u-ca=iso8601]\"");
passes("new Temporal.PlainMonthDay(1,1,undefined,10000).toString({calendarName:\"always\"})===\"+010000-01-01[u-ca=iso8601]\"");
passes("new Temporal.PlainMonthDay(4,19,undefined,-271821).toString({calendarName:\"always\"})===\"-271821-04-19[u-ca=iso8601]\"&&new Temporal.PlainMonthDay(9,13,undefined,275760).toString({calendarName:\"always\"})===\"+275760-09-13[u-ca=iso8601]\"");
passes("var d=new Temporal.PlainMonthDay(2,29,undefined,2000);d.toString({calendarName:\"auto\"})===\"02-29\"&&d.toString({calendarName:\"never\"})===\"02-29\"");
passes("var d=new Temporal.PlainMonthDay(2,29);Object.defineProperty(d,\"day\",{get(){throw 1}});Object.defineProperty(d,\"monthCode\",{get(){throw 2}});d.toString()===\"02-29\"");
passes("var log=\"\";new Temporal.PlainMonthDay(2,29).toString({get calendarName(){log+=\"g\";return {toString(){log+=\"s\";return \"always\"}}}})===\"1972-02-29[u-ca=iso8601]\"&&log===\"gs\"");
passes("var d=new Temporal.PlainMonthDay(2,29);d.toString=function(){throw 1};d.toJSON(null)===\"02-29\"&&d.toLocaleString(null,{get calendarName(){throw 2}})===\"02-29\"");
passes("JSON.stringify(new Temporal.PlainMonthDay(2,29))==='\"02-29\"'");
passes("var touched=false,ok=false;try{Temporal.PlainMonthDay.prototype.toString.call({}, {get calendarName(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toString(null)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toString(1)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toString(\"auto\")}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toString({calendarName:\"bad\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toString({calendarName:\"AUTO\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toString({calendarName:null})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toString({calendarName:1})}catch(e){ok=e instanceof RangeError}ok");
for(const method of ["toString","toJSON","toLocaleString"]) {
 passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainMonthDay.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable');
 const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
 const fn=run('Temporal.PlainMonthDay.prototype.'+method,defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("format",{value:fn.value});
 const result=run('format.call(new Temporal.PlainMonthDay(2,29))',calling);
 check(result.type==="normal"&&result.value.kind==="string"&&result.value.value==="02-29","cross-Realm value");
 const failed=run('format.call({})',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
}
console.log("temporal plain month day format passed");

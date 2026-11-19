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
passes("new Temporal.PlainMonthDay(2,28,undefined,2023).with({day:29}).toString({calendarName:\"always\"})===\"1972-02-29[u-ca=iso8601]\"");
passes("new Temporal.PlainMonthDay(2,29).with({year:2023}).toString()===\"02-28\"");
passes("new Temporal.PlainMonthDay(2,29).with({monthCode:\"M04\"}).toString()===\"04-29\"");
passes("new Temporal.PlainMonthDay(1,31).with({month:2}).toString()===\"02-29\"");
passes("new Temporal.PlainMonthDay(2,29).with({month:99,day:99}).toString()===\"12-31\"");
passes("new Temporal.PlainMonthDay(2,29).with({year:999999,day:28},{overflow:\"reject\"}).toString()===\"02-28\"");
passes("new Temporal.PlainMonthDay(2,29).toPlainDate({year:2023}).toString()===\"2023-02-28\"");
passes("new Temporal.PlainMonthDay(2,29).toPlainDate({year:2024,get day(){throw 1},get month(){throw 2},get monthCode(){throw 3},get calendar(){throw 4}}).toString()===\"2024-02-29\"");
passes("new Temporal.PlainMonthDay(4,19).toPlainDate({year:-271821}).toString()===\"-271821-04-19\"&&new Temporal.PlainMonthDay(9,13).toPlainDate({year:275760}).toString()===\"+275760-09-13\"");
passes("new Temporal.PlainMonthDay(2,29).toPlainDate(new Temporal.PlainDate(2023,1,1)).day===28");
passes("var log=\"\";new Temporal.PlainMonthDay(2,29).with({get calendar(){log+=\"c\"},get timeZone(){log+=\"t\"},get day(){log+=\"d\";return 28},get month(){log+=\"m\"},get monthCode(){log+=\"k\"},get year(){log+=\"y\"}},{get overflow(){log+=\"o\"}});log===\"ctdmkyo\"");
passes("var touched=false,ok=false;try{new Temporal.PlainMonthDay(2,29).with({},{get overflow(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var marker={},ok=false;try{new Temporal.PlainMonthDay(2,29).with({monthCode:\"M13\"},{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var d=new Temporal.PlainMonthDay(2,29);Object.defineProperty(d,\"calendar\",{get(){throw 1}});var ok=false;try{d.with(d)}catch(e){ok=e instanceof TypeError}ok");
passes("class D extends Temporal.PlainMonthDay{};Object.getPrototypeOf(new D(2,29).with({day:28}))===Temporal.PlainMonthDay.prototype");
passes("var proto=Temporal.PlainDate.prototype;Temporal.PlainDate=function(){throw 1};Object.getPrototypeOf(new Temporal.PlainMonthDay(2,29).toPlainDate({year:2024}))===proto");
passes("var touched=false;new Temporal.PlainMonthDay(2,29).toPlainDate({year:2023},{get overflow(){touched=true;throw 1}}).day===28&&!touched");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).with({calendar:\"iso8601\",day:28})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).with(new Temporal.PlainDate(2024,1,1))}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toPlainDate()}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toPlainDate(2024)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toPlainDate({})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).with({year:2023},{overflow:\"reject\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(1,31).with({month:2},{overflow:\"reject\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).with({month:2,monthCode:\"M03\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(4,18).toPlainDate({year:-271821})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(9,14).toPlainDate({year:275760})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toPlainDate({year:Infinity})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainMonthDay(2,29).toPlainDate({year:999999})}catch(e){ok=e instanceof RangeError}ok");
for(const method of ["with","toPlainDate"]) {
 passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainMonthDay.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
 passes('var touched=false,ok=false;try{Temporal.PlainMonthDay.prototype.'+method+'.call({}, {get calendar(){touched=true},get year(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched');
 const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
 const fn=run('Temporal.PlainMonthDay.prototype.'+method,defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("change",{value:fn.value});
 const result=run('change.call(new Temporal.PlainMonthDay(2,29),{year:2024})',calling);
 const proto=method==="with"?defining.temporalPlainMonthDayPrototype:defining.temporalPlainDatePrototype;
 check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===proto,"defining Realm result");
 const failed=run('change.call({})',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
}
console.log("temporal plain month day fields passed");

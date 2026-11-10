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
passes("new Temporal.PlainYearMonth(2024,2).with({year:2023}).toString()===\"2023-02\"");
passes("new Temporal.PlainYearMonth(2024,2).with({monthCode:\"M03\"}).toString()===\"2024-03\"");
passes("new Temporal.PlainYearMonth(2024,2).with({month:99}).toString()===\"2024-12\"");
passes("new Temporal.PlainYearMonth(2024,2,undefined,29).with({year:2024}).toString({calendarName:\"always\"})===\"2024-02-01[u-ca=iso8601]\"");
passes("new Temporal.PlainYearMonth(2024,2).with({year:2023,get day(){throw 1}}).year===2023");
passes("new Temporal.PlainYearMonth(2024,2).toPlainDate({day:99}).toString()===\"2024-02-29\"");
passes("new Temporal.PlainYearMonth(2023,2).toPlainDate({day:29}).toString()===\"2023-02-28\"");
passes("new Temporal.PlainYearMonth(2024,2).toPlainDate({day:1,get year(){throw 1},get month(){throw 2},get monthCode(){throw 3},get calendar(){throw 4}}).toString()===\"2024-02-01\"");
passes("new Temporal.PlainYearMonth(-271821,4).toPlainDate({day:19}).toString()===\"-271821-04-19\"&&new Temporal.PlainYearMonth(275760,9).toPlainDate({day:13}).toString()===\"+275760-09-13\"");
passes("new Temporal.PlainYearMonth(2024,2).toPlainDate(new Temporal.PlainDate(2000,1,5)).day===5");
passes("var log=\"\";new Temporal.PlainYearMonth(2024,2).with({get calendar(){log+=\"c\"},get timeZone(){log+=\"t\"},get month(){log+=\"m\";return 3},get monthCode(){log+=\"k\"},get year(){log+=\"y\"}},{get overflow(){log+=\"o\"}});log===\"ctmkyo\"");
passes("var touched=false,ok=false;try{new Temporal.PlainYearMonth(2024,2).with({day:1},{get overflow(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var marker={},ok=false;try{new Temporal.PlainYearMonth(2024,2).with({monthCode:\"M13\"},{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var d=new Temporal.PlainYearMonth(2024,2);Object.defineProperty(d,\"calendar\",{get(){throw 1}});var ok=false;try{d.with(d)}catch(e){ok=e instanceof TypeError}ok");
passes("class D extends Temporal.PlainYearMonth{};Object.getPrototypeOf(new D(2024,2).with({year:2025}))===Temporal.PlainYearMonth.prototype");
passes("var proto=Temporal.PlainDate.prototype;Temporal.PlainDate=function(){throw 1};Object.getPrototypeOf(new Temporal.PlainYearMonth(2024,2).toPlainDate({day:1}))===proto");
passes("var touched=false;new Temporal.PlainYearMonth(2024,2).toPlainDate({day:99},{get overflow(){touched=true;throw 1}}).day===29&&!touched");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).with({})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).with({calendar:\"iso8601\",year:2025})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).with(new Temporal.PlainDate(2024,1,1))}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).toPlainDate()}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).toPlainDate(1)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).toPlainDate({})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).with({month:13},{overflow:\"reject\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).with({month:2,monthCode:\"M03\"})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(-271821,4).with({month:3})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(-271821,4).toPlainDate({day:18})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(275760,9).toPlainDate({day:14})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).toPlainDate({day:0})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).toPlainDate({day:Infinity})}catch(e){ok=e instanceof RangeError}ok");
for(const method of ["with","toPlainDate"]) {
 passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainYearMonth.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
 passes('var touched=false,ok=false;try{Temporal.PlainYearMonth.prototype.'+method+'.call({}, {get calendar(){touched=true},get day(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched');
 const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
 const fn=run('Temporal.PlainYearMonth.prototype.'+method,defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("change",{value:fn.value});
 const result=run('change.call(new Temporal.PlainYearMonth(2024,2),'+(method==="with"?'{year:2025}':'{day:1}')+')',calling);
 const proto=method==="with"?defining.temporalPlainYearMonthPrototype:defining.temporalPlainDatePrototype;
 check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===proto,"defining Realm result");
 const failed=run('change.call({})',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
}
console.log("temporal plain year month fields passed");

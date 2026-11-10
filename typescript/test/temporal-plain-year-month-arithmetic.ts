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
passes("new Temporal.PlainYearMonth(2024,12).add({months:2}).toString()===\"2025-02\"");
passes("new Temporal.PlainYearMonth(2024,1).subtract({months:2}).toString()===\"2023-11\"");
passes("new Temporal.PlainYearMonth(2024,2).add({years:1,months:13}).toString()===\"2026-03\"");
passes("new Temporal.PlainYearMonth(2024,2).add({months:-13}).toString()===\"2023-01\"&&new Temporal.PlainYearMonth(2024,2).subtract({months:-13}).toString()===\"2025-03\"");
passes("new Temporal.PlainYearMonth(0,1).subtract({months:1}).toString()===\"-000001-12\"");
passes("new Temporal.PlainYearMonth(2024,2,undefined,29).add(\"P1Y\",{overflow:\"reject\"}).toString({calendarName:\"always\"})===\"2025-02-01[u-ca=iso8601]\"");
passes("var d=new Temporal.PlainYearMonth(2024,2,undefined,29);d.add({years:0})!==d&&d.add({years:0}).toString({calendarName:\"always\"})===\"2024-02-01[u-ca=iso8601]\"");
passes("new Temporal.PlainYearMonth(275760,9,undefined,30).subtract({months:1}).toString()===\"+275760-08\"");
passes("new Temporal.PlainYearMonth(275760,8).add({months:1}).month===9");
passes("var log=\"\";new Temporal.PlainYearMonth(2024,2).add({get days(){log+=\"d\"},get hours(){log+=\"h\"},get microseconds(){log+=\"u\"},get milliseconds(){log+=\"l\"},get minutes(){log+=\"m\"},get months(){log+=\"M\";return 1},get nanoseconds(){log+=\"n\"},get seconds(){log+=\"s\"},get weeks(){log+=\"w\"},get years(){log+=\"y\"}},{get overflow(){log+=\"o\"}});log===\"dhulmMnswyo\"");
passes("var marker={},ok=false;try{new Temporal.PlainYearMonth(2024,2).add({days:1},{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var marker={},ok=false;try{new Temporal.PlainYearMonth(-271821,4).add({years:0},{get overflow(){throw marker}})}catch(e){ok=e===marker}ok");
passes("var d=new Temporal.PlainYearMonth(2024,2),v=new Temporal.Duration(1);Object.defineProperty(v,\"years\",{get(){throw 1}});Object.defineProperty(d,\"year\",{get(){throw 2}});d.add(v).year===2025");
passes("class D extends Temporal.PlainYearMonth{};Object.getPrototypeOf(new D(2024,2).add({months:1}))===Temporal.PlainYearMonth.prototype");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).add({weeks:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).add({days:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).add({hours:24})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).add({nanoseconds:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).add({years:1,days:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).add({years:4294967295})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).add({months:4294967295})}catch(e){ok=e instanceof RangeError}ok");
passes("var touched=false,ok=false;try{Temporal.PlainYearMonth.prototype.add.call({}, {get months(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).subtract({weeks:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).subtract({days:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).subtract({hours:24})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).subtract({nanoseconds:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).subtract({years:1,days:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).subtract({years:4294967295})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(2024,2).subtract({months:4294967295})}catch(e){ok=e instanceof RangeError}ok");
passes("var touched=false,ok=false;try{Temporal.PlainYearMonth.prototype.subtract.call({}, {get months(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var ok=false;try{new Temporal.PlainYearMonth(-271821,4).add({years:0})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(-271821,4,undefined,30).add({months:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(-271821,5).subtract({months:1})}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainYearMonth(275760,9).add({months:1})}catch(e){ok=e instanceof RangeError}ok");
for(const method of ["add","subtract"]) {
 passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainYearMonth.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
 const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
 const fn=run('Temporal.PlainYearMonth.prototype.'+method,defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("change",{value:fn.value});
 const result=run('change.call(new Temporal.PlainYearMonth(2024,2),{months:1})',calling);
 check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalPlainYearMonthPrototype,"defining Realm result");
 const failed=run('change.call({})',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
}
console.log("temporal plain year month arithmetic passed");

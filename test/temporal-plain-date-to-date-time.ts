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

passes("new Temporal.PlainDate(2024,2,29).toPlainDateTime().toString()===\"2024-02-29T00:00:00\"");
passes("new Temporal.PlainDate(2024,2,29).toPlainDateTime(undefined).hour===0");
passes("new Temporal.PlainDate(2024,2,29).toPlainDateTime(\"12:34:56.123456789\").toString()===\"2024-02-29T12:34:56.123456789\"");
passes("new Temporal.PlainDate(2024,2,29).toPlainDateTime({hour:99,minute:-1,nanosecond:1001}).toString()===\"2024-02-29T23:00:00.000000999\"");
passes("new Temporal.PlainDate(2024,2,29).toPlainDateTime(new Temporal.PlainDateTime(2000,1,1,12,34)).toString()===\"2024-02-29T12:34:00\"");
passes("var t=new Temporal.PlainTime(12,34);Object.defineProperty(t,\"hour\",{get(){throw 1}});var d=new Temporal.PlainDate(2024,2,29);Object.defineProperty(d,\"year\",{get(){throw 2}});d.toPlainDateTime(t).toString()===\"2024-02-29T12:34:00\"");
passes("var d=new Temporal.PlainDate(2024,2,29);d.toPlainDateTime()!==d.toPlainDateTime()&&d.day===29");
passes("class D extends Temporal.PlainDate{};Object.getPrototypeOf(new D(2024,2,29).toPlainDateTime())===Temporal.PlainDateTime.prototype");
passes("var proto=Temporal.PlainDateTime.prototype;Temporal.PlainDateTime=function(){throw 1};Object.getPrototypeOf(new Temporal.PlainDate(2024,2,29).toPlainDateTime())===proto");
passes("new Temporal.PlainDate(-271821,4,19).toPlainDateTime({nanosecond:1}).toString()===\"-271821-04-19T00:00:00.000000001\"");
passes("new Temporal.PlainDate(275760,9,13).toPlainDateTime(\"23:59:59.999999999\").toString()===\"+275760-09-13T23:59:59.999999999\"");
passes("var log=\"\";new Temporal.PlainDate(2024,1,1).toPlainDateTime({get hour(){log+=\"h\";return {valueOf(){log+=\"H\";return 1}}},get microsecond(){log+=\"u\"},get millisecond(){log+=\"l\"},get minute(){log+=\"m\"},get nanosecond(){log+=\"n\"},get second(){log+=\"s\"}});log===\"hHulmns\"");
passes("var touched=false,ok=false;try{Temporal.PlainDate.prototype.toPlainDateTime.call({}, {get hour(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched");
passes("var sentinel={},ok=false;try{new Temporal.PlainDate(-271821,4,19).toPlainDateTime({get hour(){throw sentinel}})}catch(e){ok=e===sentinel}ok");
passes("var touched=false;new Temporal.PlainDate(2024,1,1).toPlainDateTime({hour:25},{get overflow(){touched=true;throw 1}}).hour===23&&!touched");
passes("var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,\"toPlainDateTime\");d.value.name===\"toPlainDateTime\"&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable");
passes("var ok=false;try{new Temporal.PlainDate(2024,1,1).toPlainDateTime(null)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainDate(2024,1,1).toPlainDateTime(1)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainDate(2024,1,1).toPlainDateTime(true)}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainDate(2024,1,1).toPlainDateTime({})}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainDate(2024,1,1).toPlainDateTime(new Temporal.PlainDate(2024,1,1))}catch(e){ok=e instanceof TypeError}ok");
passes("var ok=false;try{new Temporal.PlainDate(-271821,4,19).toPlainDateTime()}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainDate(2024,1,1).toPlainDateTime(\"24:00\")}catch(e){ok=e instanceof RangeError}ok");
passes("var ok=false;try{new Temporal.PlainDate(2024,1,1).toPlainDateTime({hour:Infinity})}catch(e){ok=e instanceof RangeError}ok");
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const fn=run('Temporal.PlainDate.prototype.toPlainDateTime',defining);if(fn.type!=="normal")throw new Error("lookup");calling.defineScriptGlobal("convert",{value:fn.value});
const result=run('convert.call(new Temporal.PlainDate(2024,1,1))',calling);
check(result.type==="normal"&&result.value.kind==="object"&&result.value.object.getPrototypeOf()===defining.temporalPlainDateTimePrototype,"defining Realm result");
const failed=run('convert.call({})',calling);check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
console.log("temporal plain date to date time passed");

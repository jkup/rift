import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "date-with", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'new Temporal.PlainDate(2024,2,29).with({year:2023}).toString()==="2023-02-28"',
    'new Temporal.PlainDate(2024,1,31).with({month:2}).toString()==="2024-02-29"',
    'new Temporal.PlainDate(2024,1,31).with({monthCode:"M04"}).toString()==="2024-04-30"',
    'new Temporal.PlainDate(2024,1,31).with({month:4,monthCode:"M04",day:15}).toString()==="2024-04-15"',
    'new Temporal.PlainDate(2024,1,1).with({month:99,day:99}).toString()==="2024-12-31"',
    'new Temporal.PlainDate(2024,1,1).with({year:-0,day:2.9}).toString()==="0000-01-02"',
    'var original=new Temporal.PlainDate(2024,2,29);Object.defineProperty(original,"year",{get(){throw 1}});Object.defineProperty(original,"monthCode",{get(){throw 2}});var changed=original.with({day:28});changed!==original&&changed.toString()==="2024-02-28"',
    'class D extends Temporal.PlainDate{};Object.getPrototypeOf(new D(2024,1,1).with({day:2}))===Temporal.PlainDate.prototype',
    'var log="";new Temporal.PlainDate(2024,1,1).with({get calendar(){log+="c"},get timeZone(){log+="t"},get day(){log+="d";return {valueOf(){log+="D";return 2}}},get month(){log+="m"},get monthCode(){log+="C"},get year(){log+="y"}},{get overflow(){log+="o";return "reject"}});log==="ctdDmCyo"',
    'var touched=false,ok=false;try{new Temporal.PlainDate(2024,1,1).with({calendar:null,get timeZone(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var touched=false,ok=false;try{new Temporal.PlainDate(2024,1,1).with({timeZone:null,get day(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var touched=false,ok=false;try{new Temporal.PlainDate(2024,1,1).with({},{get overflow(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var ok=false;try{new Temporal.PlainDate(2024,1,1).with({monthCode:"M13"},{get overflow(){throw 42}})}catch(e){ok=e===42}ok',
    'var touched=false,ok=false;try{new Temporal.PlainDate(2024,1,1).with({monthCode:"M00"},{get overflow(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    'var touched=false,ok=false;try{Temporal.PlainDate.prototype.with.call({}, {get calendar(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var partial=new Temporal.PlainDate(2024,1,1);Object.defineProperty(partial,"calendar",{get(){throw 42}});var ok=false;try{partial.with(partial)}catch(e){ok=e instanceof TypeError}ok',
    'var original=new Temporal.PlainDate(2024,2,29);var copy=original.withCalendar("ISO8601");copy!==original&&copy.toString()==="2024-02-29"',
    'new Temporal.PlainDate(2024,1,1).withCalendar("12:34").calendarId==="iso8601"',
    'new Temporal.PlainDate(2024,1,1).withCalendar(new Temporal.PlainDate(2000,1,1)).year===2024',
    'class D extends Temporal.PlainDate{};Object.getPrototypeOf(new D(2024,1,1).withCalendar("iso8601"))===Temporal.PlainDate.prototype',
    'var touched=false,ok=false;try{Temporal.PlainDate.prototype.withCalendar.call({}, {toString(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'Temporal.PlainDate.prototype.with.length===1&&Temporal.PlainDate.prototype.withCalendar.length===1',
]) passes(text);
for (const partial of ['undefined','null','"2024-01-01"','1','{}','{year:undefined}','{era:"ce"}','new Temporal.PlainDate(2024,1,1)','new Temporal.PlainTime()','{calendar:"iso8601",year:2024}','{timeZone:"UTC",year:2024}'])
    passes('var ok=false;try{new Temporal.PlainDate(2024,1,1).with('+partial+')}catch(e){ok=e instanceof TypeError}ok');
for (const partial of ['{month:1,monthCode:"M02"}','{monthCode:"M13"}','{monthCode:"M01L"}','{day:0}','{year:Infinity}','{year:275760,month:9,day:14}','{year:-271821,month:4,day:18}'])
    passes('var ok=false;try{new Temporal.PlainDate(2024,1,1).with('+partial+')}catch(e){ok=e instanceof RangeError}ok');
passes('var ok=false;try{new Temporal.PlainDate(2024,2,29).with({year:2023},{overflow:"reject"})}catch(e){ok=e instanceof RangeError}ok');
passes('var ok=false;try{new Temporal.PlainDate(2024,1,1).with({day:2},null)}catch(e){ok=e instanceof TypeError}ok');
for (const calendar of ['undefined','null','{}','new Temporal.PlainTime()'])
    passes('var ok=false;try{new Temporal.PlainDate(2024,1,1).withCalendar('+calendar+')}catch(e){ok=e instanceof TypeError}ok');
passes('var ok=false;try{new Temporal.PlainDate(2024,1,1).withCalendar("gregory")}catch(e){ok=e instanceof RangeError}ok');
for (const name of ["with", "withCalendar"]) {
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"'+name+'");d.writable&&!d.enumerable&&d.configurable');
    const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
    const method = run('Temporal.PlainDate.prototype.'+name, defining);
    if (method.type !== "normal") throw new Error("method lookup");
    calling.defineScriptGlobal("replaceDate", { value: method.value });
    const result = run('replaceDate.call(new Temporal.PlainDate(2024,1,1),'+(name === "with" ? '{day:2}' : '"iso8601"')+')', calling);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === defining.temporalPlainDatePrototype, "defining Realm result");
}
console.log("temporal plain date with passed");

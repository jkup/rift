import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value } from "../src/runtime.js";
function run(text: string, realm = new Realm((_line: string) => {}, "script")): Value {
    const prepared = prepareBoundedScript({ id: "duration-total", text }, realm);
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
    'Temporal.Duration.from("P1DT12H").total("hour")===36',
    'Temporal.Duration.from("-P1DT12H").total("days")===-1.5',
    'Temporal.Duration.from("PT0.000000001S").total("seconds")===1e-9',
    'Temporal.Duration.from("PT9007199254740991.999999999S").total("seconds")===9007199254740992',
    'Temporal.Duration.from("P1M").total({unit:"days",relativeTo:"2020-01-31"})===29',
    'Temporal.Duration.from("-P1M").total({unit:"days",relativeTo:"2020-03-31"})===-31',
    'Temporal.Duration.from("P14DT12H").total({unit:"month",relativeTo:"2020-01-31"})===0.5',
    'Temporal.Duration.from("-P15DT12H").total({unit:"month",relativeTo:"2020-03-31"})===-0.5',
    'Temporal.Duration.from("P1M15DT12H").total({unit:"month",relativeTo:"2020-01-31"})===1.5',
    'Temporal.Duration.from("P183D").total({unit:"year",relativeTo:new Temporal.PlainDate(2020,1,1)})===0.5',
    'Temporal.Duration.from("P10DT12H").total({unit:"weeks",relativeTo:{year:2020,month:1,day:31}})===1.5',
    'Temporal.Duration.from("P1M").total({unit:"hour",relativeTo:new Temporal.PlainDateTime(2020,1,31,23)})===696',
    'new Temporal.Duration().total({unit:"year",relativeTo:"-271821-04-19"})===0',
    'new Temporal.Duration().total({unit:"month",relativeTo:"+275760-09-13"})===0',
    'Temporal.Duration.from("PT1H").total({unit:"hours",relativeTo:"+275760-09-13"})===1',
    'Temporal.Duration.from("-PT0.000000001S").total({unit:"nanoseconds",relativeTo:"2020-01-01"})===-1',
    'Temporal.Duration.from({days:104249991374}).total("days")===104249991374',
    'var log="";var d=Temporal.Duration.from("PT1H");d.total({get relativeTo(){log+="r";return "2020-01-01"},get unit(){log+="u";return{toString(){log+="U";return"minutes"}}}})===60&&log==="ruU"',
    "var touched=false,ok=false;try{Temporal.Duration.prototype.total.call({}, {get relativeTo(){touched=true}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var touched=false,ok=false;try{new Temporal.Duration().total({relativeTo:"bad",get unit(){touched=true}})}catch(e){ok=e instanceof RangeError}ok&&!touched',
    "var ok=false;try{new Temporal.Duration().total({get relativeTo(){throw 42}})}catch(e){ok=e===42}ok",
    'var d=Temporal.Duration.from("PT1H");Object.defineProperty(d,"hours",{get(){throw 1}});d.total("minute")===60',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"total");d.writable&&!d.enumerable&&d.configurable&&d.value.name==="total"&&d.value.length===1',
    '1/new Temporal.Duration().total("second")===Infinity',
]) {
    passes(text);
}
for (const options of ["undefined", "null", "1", "true", "{}", "{unit:undefined}"]) {
    passes(
        "var ok=false;try{new Temporal.Duration().total(" +
            options +
            ")}catch(e){ok=e instanceof TypeError}ok",
    );
}
for (const options of [
    '"auto"',
    '"bad"',
    '"year"',
    '"month"',
    '"week"',
    '{unit:"day",relativeTo:"2020-01-01[Invalid/Zone]"}',
]) {
    passes(
        "var ok=false;try{new Temporal.Duration().total(" +
            options +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
for (const expression of [
    'Temporal.Duration.from("P1Y").total("day")',
    'Temporal.Duration.from("P1D").total({unit:"day",relativeTo:"+275760-09-13"})',
    'Temporal.Duration.from("PT1H").total({unit:"month",relativeTo:"+275760-09-13"})',
    'Temporal.Duration.from("PT0.000000001S").total({unit:"nanosecond",relativeTo:"-271821-04-19"})',
    'Temporal.Duration.from({days:104249991374}).total({unit:"day",relativeTo:"2020-01-01"})',
]) {
    passes("var ok=false;try{" + expression + "}catch(e){ok=e instanceof RangeError}ok");
}
const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
caller.defineScriptGlobal("total", { value: run("Temporal.Duration.prototype.total", owner) });
caller.defineScriptGlobal("OwnerRangeError", { value: run("RangeError", owner) });
const cross = run(
    'var ok=false;try{total.call(new Temporal.Duration(1),"day")}catch(e){ok=e instanceof OwnerRangeError&&!(e instanceof RangeError)}ok',
    caller,
);
if (cross.kind !== "boolean" || !cross.value) {
    throw new Error("total error Realm");
}
console.log("temporal duration total passed");

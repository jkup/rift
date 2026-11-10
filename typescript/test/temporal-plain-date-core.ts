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
for (const text of [
    'var d=new Temporal.PlainDate(2024,2,29);d.year===2024&&d.month===2&&d.day===29&&d.monthCode==="M02"&&d.calendarId==="iso8601"',
    'var d=new Temporal.PlainDate(2024,2,29);d.dayOfWeek===4&&d.dayOfYear===60&&d.weekOfYear===9&&d.yearOfWeek===2024&&d.daysInWeek===7&&d.daysInMonth===29&&d.daysInYear===366&&d.monthsInYear===12&&d.inLeapYear&&d.era===undefined&&d.eraYear===undefined',
    'var d=new Temporal.PlainDate(2021,1,1);d.weekOfYear===53&&d.yearOfWeek===2020&&d.daysInYear===365&&!d.inLeapYear',
    'new Temporal.PlainDate(1900,2,28).daysInMonth===28&&new Temporal.PlainDate(2000,2,29).inLeapYear',
    'new Temporal.PlainDate(-271821,4,19).day===19&&new Temporal.PlainDate(275760,9,13).day===13',
    'var d=new Temporal.PlainDate(2024.9,2.9,29.9,"ISO8601");d.year===2024&&d.month===2&&d.day===29&&d.calendarId==="iso8601"',
    'var d=new Temporal.PlainDate(-0.9,true,"1");1/d.year===Infinity&&d.month===1&&d.day===1',
    'new Temporal.PlainDate(null,1,1).year===0',
    'var d=new Temporal.PlainDate(2024,1,1);d.year=9;Object.keys(d).length===0&&d.year===2024',
    'var d=new Temporal.PlainDate(2024,1,1);Object.defineProperty(d,"year",{value:9});Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"year").get.call(d)===2024',
    'class D extends Temporal.PlainDate{}var d=new D(2024,2,29);d instanceof D&&d instanceof Temporal.PlainDate&&d.day===29',
    'Temporal.PlainDate.name==="PlainDate"&&Temporal.PlainDate.length===3&&Temporal.PlainDate.prototype.constructor===Temporal.PlainDate',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate,"prototype");!d.writable&&!d.enumerable&&!d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal,"PlainDate");d.writable&&!d.enumerable&&d.configurable',
    'Object.prototype.toString.call(new Temporal.PlainDate(2024,1,1))==="[object Temporal.PlainDate]"',
    'var log="";function f(n,v){return{valueOf(){log+=n;return v}}}new Temporal.PlainDate(f("y",2024),f("m",2),f("d",29));log==="ymd"',
    'var log="";try{new Temporal.PlainDate(2024,13,{valueOf(){log+="d";throw 42}})}catch(e){log+=e}log==="d42"',
    'var log="";try{new Temporal.PlainDate(NaN,{valueOf(){log+="!";return 1}},1)}catch(e){log+=e instanceof RangeError?"R":"?"}log==="R"',
    'var touched=false,ok=false;try{new Temporal.PlainDate(2024,13,1,{toString(){touched=true;return "iso8601"}})}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var log="",F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){log+="p";return Temporal.PlainDate.prototype}});var d=Reflect.construct(Temporal.PlainDate,[{valueOf(){log+="y";return 2024}},1,1],F);d.year===2024&&log==="yp"',
    'var log="",F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){log+="p";throw 42}});try{Reflect.construct(Temporal.PlainDate,[2023,2,29],F)}catch(e){log+=e instanceof RangeError?"R":"?"}log==="R"',
    'var touched=false,ok=false;try{Temporal.PlainDate({valueOf(){touched=true;return 2024}},1,1)}catch(e){ok=e instanceof TypeError}ok&&!touched',
    'var ok=false;try{Temporal.PlainDate.prototype.valueOf.call(null)}catch(e){ok=e instanceof TypeError}ok',
    'var ok=false;try{+new Temporal.PlainDate(2024,1,1)}catch(e){ok=e instanceof TypeError}ok',
    'var d=new Temporal.PlainDate(2024,1,1);Object.defineProperty(d,"calendar",{get(){throw 42}});var ok=false;try{new Temporal.PlainTime().with(d)}catch(e){ok=e instanceof TypeError}ok',
]) passes(text);
for (const field of ['calendarId','era','eraYear','year','month','monthCode','day','dayOfWeek','dayOfYear','weekOfYear','yearOfWeek','daysInWeek','daysInMonth','daysInYear','monthsInYear','inLeapYear'])
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"'+field+'");var bad=false;try{d.get.call(Temporal.PlainDate.prototype)}catch(e){bad=e instanceof TypeError}bad&&d.get.length===0&&d.get.name==="get '+field+'"&&d.set===undefined&&!d.enumerable&&d.configurable');
for (const args of ['', '2024', '2024,1', '2023,2,29', '2024,0,1', '2024,1,0', '2024,13,1', 'NaN,1,1', 'Infinity,1,1', '-271821,4,18', '275760,9,14', '2024,1,1,"gregory"', '2024,1,1,"bad"', '2024,1,1,"İSO8601"'])
    passes('var ok=false;try{new Temporal.PlainDate('+args+')}catch(e){ok=e instanceof RangeError}ok');
for (const args of ['1n,1,1','2024,Symbol(),1','2024,1,1,null','2024,1,1,1','2024,1,1,new String("iso8601")'])
    passes('var ok=false;try{new Temporal.PlainDate('+args+')}catch(e){ok=e instanceof TypeError}ok');
const defining=new Realm((_line:string)=>{},"script"),calling=new Realm((_line:string)=>{},"script");
const getter=run('Object.getOwnPropertyDescriptor(Temporal.PlainDate.prototype,"year").get',defining);
if(getter.type!=="normal")throw new Error("getter lookup");
calling.defineScriptGlobal("year",{value:getter.value});
const read=run('year.call(new Temporal.PlainDate(2024,1,1))',calling);
check(read.type==="normal"&&read.value.kind==="number"&&read.value.value===2024,"cross-Realm brand");
const failed=run('year.call({})',calling);
check(failed.type==="throw"&&failed.value.kind==="object"&&failed.value.object.getPrototypeOf()===defining.getErrorPrototype("TypeError"),"defining Realm error");
const target=run('var F=function(){};F.prototype=0;F',defining);
if(target.type!=="normal")throw new Error("target lookup");
calling.defineScriptGlobal("F",{value:target.value});
const constructed=run('Reflect.construct(Temporal.PlainDate,[2024,1,1],F)',calling);
check(constructed.type==="normal"&&constructed.value.kind==="object"&&constructed.value.object.getPrototypeOf()===defining.temporalPlainDatePrototype,"newTarget Realm fallback");
console.log("temporal plain date core passed");

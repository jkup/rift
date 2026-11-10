import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "plain-time-core", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
const cases = [
    'var t=new Temporal.PlainTime();t.hour===0&&t.minute===0&&t.second===0&&t.millisecond===0&&t.microsecond===0&&t.nanosecond===0',
    'var t=new Temporal.PlainTime(23,59,59,999,999,999);t.hour===23&&t.minute===59&&t.second===59&&t.millisecond===999&&t.microsecond===999&&t.nanosecond===999',
    'var t=new Temporal.PlainTime(1.9,2.9,3.9,4.9,5.9,6.9);t.hour===1&&t.minute===2&&t.second===3&&t.millisecond===4&&t.microsecond===5&&t.nanosecond===6',
    'var t=new Temporal.PlainTime(-0.9,-0,-0.1,-0.9,-0,-0.9);1/t.hour===Infinity&&1/t.minute===Infinity&&1/t.second===Infinity&&1/t.millisecond===Infinity&&1/t.microsecond===Infinity&&1/t.nanosecond===Infinity',
    'var t=new Temporal.PlainTime(undefined,null,true,"4",false,"");t.hour===0&&t.minute===0&&t.second===1&&t.millisecond===4&&t.microsecond===0&&t.nanosecond===0',
    'var t=new Temporal.PlainTime(1);t.hour=9;Object.keys(t).length===0&&t.hour===1',
    'var t=new Temporal.PlainTime(1);Object.defineProperty(t,"hour",{value:9});Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"hour").get.call(t)===1',
    'Object.getPrototypeOf(new Temporal.PlainTime())===Temporal.PlainTime.prototype&&Object.getPrototypeOf(Temporal.PlainTime.prototype)===Object.prototype',
    'class T extends Temporal.PlainTime{}var t=new T(4);t instanceof T&&t instanceof Temporal.PlainTime&&t.hour===4',
    'Temporal.PlainTime.name==="PlainTime"&&Temporal.PlainTime.length===0&&Temporal.PlainTime.prototype.constructor===Temporal.PlainTime',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime,"prototype");!d.writable&&!d.enumerable&&!d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal,"PlainTime");d.writable&&!d.enumerable&&d.configurable',
    'Object.prototype.toString.call(new Temporal.PlainTime())==="[object Temporal.PlainTime]"',
    'var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,Symbol.toStringTag);d.value==="Temporal.PlainTime"&&!d.writable&&!d.enumerable&&d.configurable',
    'var t="";function field(n){return{valueOf(){t+=n;return 0}}}new Temporal.PlainTime(field(1),field(2),field(3),field(4),field(5),field(6));t==="123456"',
    'var t="";try{new Temporal.PlainTime(24,{valueOf(){t+="M";return 0}},0,0,0,{valueOf(){t+="N";return 0}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="MNR"',
    'var t="";try{new Temporal.PlainTime(NaN,{valueOf(){t+="!";return 0}})}catch(e){t+=e instanceof RangeError?"R":"?"}t==="R"',
    'var t="";try{new Temporal.PlainTime(24,{valueOf(){t+="M";throw 7}})}catch(e){t+=e}t==="M7"',
    'var t="",o={valueOf(){t+="V";return{}},toString(){t+="S";return "2"}};new Temporal.PlainTime(o).hour===2&&t==="VS"',
    'var t="",F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){t+="P";return Temporal.PlainTime.prototype}});var x=Reflect.construct(Temporal.PlainTime,[{valueOf(){t+="H";return 1}}],F);x.hour===1&&t==="HP"',
    'var t="",F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){t+="P";throw 7}});try{Reflect.construct(Temporal.PlainTime,[24],F)}catch(e){t+=e instanceof RangeError?"R":"?"}t==="R"',
    'var t="";try{Temporal.PlainTime({valueOf(){t+="!";return 0}})}catch(e){t+=e instanceof TypeError?"T":"?"}t==="T"',
    'var ok=false;try{Temporal.PlainTime.prototype.valueOf.call(null)}catch(e){ok=e instanceof TypeError}ok',
    'var ok=false;try{+new Temporal.PlainTime()}catch(e){ok=e instanceof TypeError}ok',
];
for (const text of cases) {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const field of ['hour','minute','second','millisecond','microsecond','nanosecond']) {
    const result = run('var d=Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"'+field+'");var bad=false;try{d.get.call(Temporal.PlainTime.prototype)}catch(e){bad=e instanceof TypeError}bad&&d.get.length===0&&d.get.name==="get '+field+'"&&d.set===undefined&&!d.enumerable&&d.configurable');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "accessor " + field);
}
for (const args of ['24','-1','0,60','0,0,60','0,0,0,1000','0,0,0,0,1000','0,0,0,0,0,1000','NaN','Infinity','-Infinity','"bad"']) {
    const result = run('var ok=false;try{new Temporal.PlainTime('+args+')}catch(e){ok=e instanceof RangeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "range " + args);
}
for (const args of ['1n','Symbol()','0,1n','0,0,0,0,0,Symbol()']) {
    const result = run('var ok=false;try{new Temporal.PlainTime('+args+')}catch(e){ok=e instanceof TypeError}ok');
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "numeric kind " + args);
}
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
const getter = run('Object.getOwnPropertyDescriptor(Temporal.PlainTime.prototype,"hour").get', defining);
if (getter.type !== "normal") throw new Error("getter lookup");
calling.defineScriptGlobal("hour", { value: getter.value });
const read = run('hour.call(new Temporal.PlainTime(7))', calling);
check(read.type === "normal" && read.value.kind === "number" && read.value.value === 7, "cross-Realm brand");
const failed = run('hour.call({})', calling);
check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"), "defining Realm errors");
const target = run('var F=function(){};F.prototype=0;F', defining);
if (target.type !== "normal") throw new Error("target lookup");
calling.defineScriptGlobal("F", { value: target.value });
const constructed = run('Reflect.construct(Temporal.PlainTime,[1],F)', calling);
check(constructed.type === "normal" && constructed.value.kind === "object" && constructed.value.object.getPrototypeOf() === defining.temporalPlainTimePrototype, "newTarget Realm fallback");
console.log("temporal plain time core passed");

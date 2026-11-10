import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm = new Realm((_line: string) => {}, "script")): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "duration-arithmetic", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, text);
}
for (const text of [
    'Temporal.Duration.from("PT1H30M").add("PT2H45M").toString()==="PT4H15M"',
    'Temporal.Duration.from("P1D").subtract("PT1H").toString()==="PT23H"',
    'Temporal.Duration.from("PT1H").subtract("P1D").toString()==="-PT23H"',
    'Temporal.Duration.from("PT23H").add("PT2H").toString()==="PT25H"',
    'Temporal.Duration.from("P1DT23H").add("PT2H").toString()==="P2DT1H"',
    'Temporal.Duration.from("-P1DT23H").subtract("PT2H").toString()==="-P2DT1H"',
    'Temporal.Duration.from("PT1M").add("-PT61S").toString()==="-PT1S"',
    'Temporal.Duration.from("PT61S").subtract("PT1M").toString()==="PT1S"',
    'Temporal.Duration.from("PT1.000000001S").subtract({nanoseconds:2}).toString()==="PT0.999999999S"',
    'var d=Temporal.Duration.from({nanoseconds:9007199254740992}).add({nanoseconds:1});d.nanoseconds===9007199254740992&&d.seconds===0',
    'var d=Temporal.Duration.from({nanoseconds:9007199254740992}).add({nanoseconds:3});d.nanoseconds===9007199254740996&&d.seconds===0',
    'Temporal.Duration.from({milliseconds:999}).add({microseconds:1001}).milliseconds===1000',
    'Temporal.Duration.from("PT1H").subtract("PT1H").blank',
    'var d=Temporal.Duration.from("PT1H"),r=d.add({seconds:0});d!==r&&r.hours===1&&d.hours===1',
    'class D extends Temporal.Duration{}var r=new D(0,0,0,0,1).add("PT1H");!(r instanceof D)&&Object.getPrototypeOf(r)===Temporal.Duration.prototype&&r.hours===2',
    'var d=Temporal.Duration.from("PT1H");Object.defineProperty(d,"hours",{get(){throw 1}});Object.defineProperty(d,"constructor",{get(){throw 2}});d.add(d).hours===2',
    'new Temporal.Duration().add("PT1S",{get relativeTo(){throw 1}}).seconds===1',
    'var ok=false;try{new Temporal.Duration(1).add({get hours(){throw 42}})}catch(e){ok=e===42}ok',
    'var log="";var r=new Temporal.Duration().add({get days(){log+="d";return 1},get hours(){log+="h";return {valueOf(){log+="H";return 2}}},get years(){log+="y";return 0}});r.days===1&&r.hours===2&&log==="dhHy"',
    'var ok=false;try{Temporal.Duration.from({nanoseconds:9007199254740991000000000}).add({nanoseconds:536870912})}catch(e){ok=e instanceof RangeError}ok',
]) passes(text);
for (const method of ["add", "subtract"]) {
    passes('var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"'+method+'");d.value.name==="'+method+'"&&d.value.length===1&&d.writable&&!d.enumerable&&d.configurable');
    passes('var touched=false,ok=false;try{Temporal.Duration.prototype.'+method+'.call({}, {get hours(){touched=true;return 1}})}catch(e){ok=e instanceof TypeError}ok&&!touched');
    for (const value of ['undefined','null','1','{}','{hours:1n}'])
        passes('var ok=false;try{new Temporal.Duration().'+method+'('+value+')}catch(e){ok=e instanceof TypeError}ok');
    for (const value of ['"P1Y"','"P1M"','"P1W"','{hours:0.5}','{hours:Infinity}','{hours:1,seconds:-1}'])
        passes('var ok=false;try{new Temporal.Duration().'+method+'('+value+')}catch(e){ok=e instanceof RangeError}ok');
    for (const value of ['"P1Y"','"P1M"','"P1W"'])
        passes('var ok=false;try{Temporal.Duration.from('+value+').'+method+'('+value+')}catch(e){ok=e instanceof RangeError}ok');
    const amount = method === "add" ? 1 : -1;
    passes('var ok=false;try{new Temporal.Duration(0,0,0,0,0,0,9007199254740991,999,999,999).'+method+'({nanoseconds:'+amount+'})}catch(e){ok=e instanceof RangeError}ok');
    const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
    const fn = run('Temporal.Duration.prototype.'+method, defining);
    if (fn.type !== "normal") throw new Error("method lookup");
    calling.defineScriptGlobal("arithmetic", { value: fn.value });
    const result = run('arithmetic.call(new Temporal.Duration(), "PT1S")', calling);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === defining.temporalDurationPrototype, "defining Realm result");
    const failed = run('arithmetic.call(new Temporal.Duration(), "P1Y")', calling);
    check(failed.type === "throw" && failed.value.kind === "object" && failed.value.object.getPrototypeOf() === defining.getErrorPrototype("RangeError"), "defining Realm error");
}
console.log("temporal duration arithmetic passed");

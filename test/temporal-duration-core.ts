import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void {
    if (!ok) {
        throw new Error(message);
    }
}
function run(
    text: string,
    realm: Realm = new Realm((_line: string) => {}, "script"),
): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "duration-core", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function passes(text: string): void {
    const r = run(text);
    check(r.type === "normal" && r.value.kind === "boolean" && r.value.value, text);
}
const cases = [
    "var d=new Temporal.Duration();d.blank&&Object.is(d.sign,0)&&d.years===0&&d.nanoseconds===0",
    "var d=new Temporal.Duration(1,2,3,4,5,6,7,8,9,10);d.years===1&&d.months===2&&d.weeks===3&&d.days===4&&d.hours===5&&d.minutes===6&&d.seconds===7&&d.milliseconds===8&&d.microseconds===9&&d.nanoseconds===10&&d.sign===1&&!d.blank",
    "var d=new Temporal.Duration(-1,-2,-3,-4,-5,-6,-7,-8,-9,-10);d.years===-1&&d.nanoseconds===-10&&d.sign===-1&&!d.blank",
    'var d=new Temporal.Duration(undefined,null,true,"4",false,"");d.years===0&&d.months===0&&d.weeks===1&&d.days===4&&d.hours===0&&d.minutes===0',
    "var d=new Temporal.Duration(-0,-0,-0,-0,-0,-0,-0,-0,-0,-0);Object.is(d.years,0)&&Object.is(d.nanoseconds,0)&&Object.is(d.sign,0)&&d.blank",
    "new Temporal.Duration(0,0,0,0,0,0,9007199254740991,999,999,999).seconds===9007199254740991",
    "new Temporal.Duration(4294967295,4294967295,4294967295).years===4294967295",
    "new Temporal.Duration(0,0,0,0,0,0,0,9007199254740992).milliseconds===9007199254740992",
    "var d=new Temporal.Duration(1);d.years=9;d.sign=-1;Object.keys(d).length===0&&d.years===1&&d.sign===1",
    'var d=new Temporal.Duration(1);Object.defineProperty(d,"years",{value:9});Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"years").get.call(d)===1&&d.sign===1',
    "class D extends Temporal.Duration{}var d=new D(1);d instanceof D&&d instanceof Temporal.Duration&&d.years===1",
    "Object.getPrototypeOf(new Temporal.Duration())===Temporal.Duration.prototype&&Object.getPrototypeOf(Temporal.Duration.prototype)===Object.prototype",
    'Temporal.Duration.name==="Duration"&&Temporal.Duration.length===0&&Temporal.Duration.prototype.constructor===Temporal.Duration',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration,"prototype");!d.writable&&!d.enumerable&&!d.configurable',
    'var d=Object.getOwnPropertyDescriptor(Temporal,"Duration");d.writable&&!d.enumerable&&d.configurable',
    'Object.prototype.toString.call(new Temporal.Duration())==="[object Temporal.Duration]"',
    'var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,Symbol.toStringTag);d.value==="Temporal.Duration"&&!d.writable&&!d.enumerable&&d.configurable',
    'var log="";function f(n){return{valueOf(){log+=n;return 0}}}new Temporal.Duration(f(0),f(1),f(2),f(3),f(4),f(5),f(6),f(7),f(8),f(9));log==="0123456789"',
    'var log="";var ok=false;try{new Temporal.Duration(4294967296,{valueOf(){log+="m";return 0}},0,0,0,0,0,0,0,{valueOf(){log+="n";return 0}})}catch(e){ok=e instanceof RangeError}ok&&log==="mn"',
    "var touched=false;var ok=false;try{new Temporal.Duration(0.5,{valueOf(){touched=true;return 0}})}catch(e){ok=e instanceof RangeError}ok&&!touched",
    "var ok=false;try{new Temporal.Duration(4294967296,{valueOf(){throw 42}})}catch(e){ok=e===42}ok",
    "var touched=false;var ok=false;try{Temporal.Duration({valueOf(){touched=true;return 0}})}catch(e){ok=e instanceof TypeError}ok&&!touched",
    'var log="",F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){log+="p";return Temporal.Duration.prototype}});Reflect.construct(Temporal.Duration,[{valueOf(){log+="y";return 1}}],F).years===1&&log==="yp"',
    'var touched=false,F=(function(){}).bind(null);Object.defineProperty(F,"prototype",{get(){touched=true;throw 7}});var ok=false;try{Reflect.construct(Temporal.Duration,[1,-1],F)}catch(e){ok=e instanceof RangeError}ok&&!touched',
    "var ok=false;try{Temporal.Duration.prototype.valueOf.call(null)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{+new Temporal.Duration()}catch(e){ok=e instanceof TypeError}ok",
];
for (const text of cases) {
    passes(text);
}
const names = [
    "years",
    "months",
    "weeks",
    "days",
    "hours",
    "minutes",
    "seconds",
    "milliseconds",
    "microseconds",
    "nanoseconds",
];
let prefix = "";
for (const name of names) {
    passes("new Temporal.Duration(" + prefix + "1)." + name + "===1");
    for (const value of ["0.5", "-0.5", "NaN", "Infinity", "-Infinity", '"bad"', "1e300"]) {
        passes(
            "var ok=false;try{new Temporal.Duration(" +
                prefix +
                value +
                ")}catch(e){ok=e instanceof RangeError}ok",
        );
    }
    for (const value of ["1n", "Symbol()"]) {
        passes(
            "var ok=false;try{new Temporal.Duration(" +
                prefix +
                value +
                ")}catch(e){ok=e instanceof TypeError}ok",
        );
    }
    prefix += "0,";
}
for (const name of [...names, "sign", "blank"]) {
    passes(
        'var d=Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"' +
            name +
            '");var ok=false;try{d.get.call(Temporal.Duration.prototype)}catch(e){ok=e instanceof TypeError}ok&&d.get.length===0&&d.get.name==="get ' +
            name +
            '"&&d.set===undefined&&!d.enumerable&&d.configurable',
    );
}
for (const args of [
    "1,-1",
    "-1,1",
    "4294967296",
    "0,4294967296",
    "0,0,4294967296",
    "0,0,0,0,0,0,9007199254740992",
    "0,0,0,0,0,0,9007199254740991,999,999,1000",
]) {
    passes(
        "var ok=false;try{new Temporal.Duration(" +
            args +
            ")}catch(e){ok=e instanceof RangeError}ok",
    );
}
const defining = new Realm((_line: string) => {}, "script"),
    calling = new Realm((_line: string) => {}, "script");
const getter = run(
    'Object.getOwnPropertyDescriptor(Temporal.Duration.prototype,"years").get',
    defining,
);
if (getter.type !== "normal") {
    throw new Error("getter lookup");
}
calling.defineScriptGlobal("years", { value: getter.value });
const result = run("years.call(new Temporal.Duration(7))", calling);
check(
    result.type === "normal" && result.value.kind === "number" && result.value.value === 7,
    "cross-Realm brand",
);
const failed = run("years.call({})", calling);
check(
    failed.type === "throw" &&
        failed.value.kind === "object" &&
        failed.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"),
    "defining Realm error",
);
const target = run("var F=function(){};F.prototype=0;F", defining);
if (target.type !== "normal") {
    throw new Error("target lookup");
}
calling.defineScriptGlobal("F", { value: target.value });
const constructed = run("Reflect.construct(Temporal.Duration,[1],F)", calling);
check(
    constructed.type === "normal" &&
        constructed.value.kind === "object" &&
        constructed.value.object.getPrototypeOf() === defining.temporalDurationPrototype,
    "newTarget Realm fallback",
);
console.log("temporal duration core passed");

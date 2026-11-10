import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { Value, ValueCompletion } from "../src/runtime.js";
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
function run(text: string, realm: Realm): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "bigint-locale", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    return evaluateScript(createScriptSession(), prepared.record).completion;
}
function own(realm: Realm, name: string): Value {
    const descriptor = realm.globalObject.getOwnProperty(name);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("missing " + name);
    return descriptor.value;
}
const cases = [
    "BigInt.prototype.hasOwnProperty(\"toLocaleString\")&&BigInt.prototype.toLocaleString.name===\"toLocaleString\"&&BigInt.prototype.toLocaleString.length===0",
    "0n.toLocaleString()===\"0\"&&(-9007199254740993n).toLocaleString()===\"-9007199254740993\"",
    "Object(18446744073709551617n).toLocaleString()===\"18446744073709551617\"",
    "var b=Object(7n);b.toString=function(){throw 1};b.valueOf=function(){throw 2};b.toLocaleString()===\"7\"",
    "var args={get length(){throw 1},toString(){throw 2}};7n.toLocaleString(args,{get useGrouping(){throw 3}})===\"7\"",
    "var d=Object.getOwnPropertyDescriptor(BigInt.prototype,\"toLocaleString\");d.writable&&!d.enumerable&&d.configurable",
    "var ok=false;try{BigInt.prototype.toLocaleString.call({})}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.prototype.toLocaleString.call(BigInt.prototype)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.prototype.toLocaleString.call(7)}catch(e){ok=e instanceof TypeError}ok",
    "var ok=false;try{BigInt.prototype.toLocaleString.call(null)}catch(e){ok=e instanceof TypeError}ok"
];
for (let i = 0; i < cases.length; i++) {
    const result = run(cases[i], new Realm((_line: string) => {}, "script"));
    check(result.type === "normal" && result.value.kind === "boolean" && result.value.value, "BigInt locale case " + i);
}
const defining = new Realm((_line: string) => {}, "script"), calling = new Realm((_line: string) => {}, "script");
run("var format=BigInt.prototype.toLocaleString", defining);
calling.defineScriptGlobal("format", { value: own(defining, "format") });
const result = run("format.call(Object(9007199254740993n))", calling);
check(result.type === "normal" && result.value.kind === "string" && result.value.value === "9007199254740993", "cross-Realm BigInt brand");
const invalid = run("format.call({})", calling);
check(invalid.type === "throw" && invalid.value.kind === "object" && invalid.value.object.getPrototypeOf() === defining.getErrorPrototype("TypeError"), "locale error defining Realm");
console.log("bigint locale passed");

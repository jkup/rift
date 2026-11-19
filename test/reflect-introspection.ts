import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import { GuestObject, type ValueCompletion } from "../src/runtime.js";

function run(realm: Realm, text: string, steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "reflect-introspection", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare: " + text);
    }
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    if (session.inspect().active !== null || session.inspect().calls !== 0) {
        throw new Error("Reflect session restoration");
    }
    return result;
}
for (const text of [
    '(()=>{var s=Symbol(),o={b:1,2:2,1:3,a:4};o[s]=5;Object.defineProperty(o,"hidden",{value:6});var k=Reflect.ownKeys(o);return k.length===6&&k[0]==="1"&&k[1]==="2"&&k[2]==="b"&&k[3]==="a"&&k[4]==="hidden"&&k[5]===s})()',
    '(()=>{var o=Object.create({inherited:1});o.x=2;return Reflect.ownKeys(o).join(",")==="x"})()',
    '(()=>{var o={a:1,b:2};delete o.a;o.a=3;return Reflect.ownKeys(o).join(",")==="b,a"})()',
    '(()=>{var a=[];a[2]=1;return Reflect.ownKeys(a).join(",")==="2,length"})()',
    '(()=>{var o=new String("ab");return Reflect.ownKeys(o).join(",")==="0,1,length"})()',
    "(()=>{class C{#x;#m(){}}return Reflect.ownKeys(new C()).length===0})()",
    '(()=>{var n=0,o={get x(){n++;throw 1}},d=Reflect.getOwnPropertyDescriptor(o,"x");return n===0&&typeof d.get==="function"&&d.set===undefined&&!Object.hasOwn(d,"value")})()',
    '(()=>{var o={x:1},d=Reflect.getOwnPropertyDescriptor(o,"x");d.value=9;return o.x===1&&d.writable&&d.enumerable&&d.configurable&&Reflect.getOwnPropertyDescriptor(o,"missing")===undefined})()',
    "(()=>{var s=Symbol(),o={[s]:7};return Reflect.getOwnPropertyDescriptor(o,s).value===7})()",
    '(()=>{var log="",key={[Symbol.toPrimitive](hint){log+=hint;return "x"}};return Reflect.getOwnPropertyDescriptor({x:3},key).value===3&&log==="string"})()',
    "(()=>{var n=0,key={toString(){n++;throw 1}};try{Reflect.getOwnPropertyDescriptor(null,key)}catch(e){return e instanceof TypeError&&n===0}return false})()",
    '(()=>{var o={x:1},key={toString(){delete o.x;return "x"}};return Reflect.getOwnPropertyDescriptor(o,key)===undefined})()',
    "(()=>{var p={},o=Object.create(p);return Reflect.getPrototypeOf(o)===p&&Reflect.getPrototypeOf(Object.create(null))===null})()",
    "(()=>{var o={};return Reflect.isExtensible(o)&&!Reflect.isExtensible(Object.preventExtensions(o))})()",
    '(()=>{var o={x:1},a=Reflect.ownKeys(o),b=Reflect.ownKeys(o);a.push("y");return a!==b&&b.length===1})()',
    '(()=>{var values=[undefined,null,true,1,1n,"x",Symbol()];return ["ownKeys","getOwnPropertyDescriptor","getPrototypeOf","isExtensible"].every(name=>values.every(v=>{try{Reflect[name](v)}catch(e){return e instanceof TypeError}return false}))})()',
    "(()=>{return Reflect.ownKeys.length===1&&Reflect.getOwnPropertyDescriptor.length===2&&Reflect.getPrototypeOf.length===1&&Reflect.isExtensible.length===1})()",
    "Reflect.getOwnPropertyDescriptor({undefined:7}).value===7",
    'var s=Symbol("x"),t=Symbol("x"),o={};o[s]=1;o[t]=2;var k=Reflect.ownKeys(o);k.length===2&&k[0]===s&&k[1]===t',
    'var o={x:1},d=Reflect.getOwnPropertyDescriptor(o,"x");Object.keys(d).join(",")==="value,writable,enumerable,configurable"&&Object.keys(d).every(k=>{var p=Object.getOwnPropertyDescriptor(d,k);return p.writable&&p.enumerable&&p.configurable})',
    'function f(a){a=9;return Reflect.getOwnPropertyDescriptor(arguments,"0").value===9}f(1)',
    'var methods=["ownKeys","getOwnPropertyDescriptor","getPrototypeOf","isExtensible"];methods.every(name=>{var d=Object.getOwnPropertyDescriptor(Reflect,name);return d.writable&&!d.enumerable&&d.configurable&&d.value.name===name})',
    "var bad=false;try{new Reflect.ownKeys({})}catch(e){bad=e instanceof TypeError}bad",
]) {
    const result = run(new Realm((_line: string) => {}, "script"), text);
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) {
        throw new Error("execute: " + text);
    }
}

const owner = new Realm((_line: string) => {}, "script"),
    caller = new Realm((_line: string) => {}, "script");
for (const name of ["ownKeys", "getOwnPropertyDescriptor", "getPrototypeOf", "isExtensible"]) {
    const method = run(owner, "Reflect." + name);
    if (method.type !== "normal") {
        throw new Error("Reflect method export");
    }
    caller.defineScriptGlobal(name, { value: method.value });
    const error = run(caller, name + "(null)");
    if (
        error.type !== "throw" ||
        error.value.kind !== "object" ||
        error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")
    ) {
        throw new Error("Reflect error Realm");
    }
}
const keys = run(caller, "ownKeys({x:1})"),
    descriptor = run(caller, 'getOwnPropertyDescriptor({x:1},"x")');
if (
    keys.type !== "normal" ||
    keys.value.kind !== "object" ||
    keys.value.object.getPrototypeOf() !== owner.arrayPrototype
) {
    throw new Error("Reflect key-array Realm");
}
if (
    descriptor.type !== "normal" ||
    descriptor.value.kind !== "object" ||
    descriptor.value.object.getPrototypeOf() !== owner.objectPrototype
) {
    throw new Error("Reflect descriptor Realm");
}
const prototype = caller.createObject(),
    target = new GuestObject(prototype);
caller.defineScriptGlobal("target", { value: { kind: "object", object: target } });
const reflected = run(caller, "getPrototypeOf(target)");
if (
    reflected.type !== "normal" ||
    reflected.value.kind !== "object" ||
    reflected.value.object !== prototype
) {
    throw new Error("Reflect preserves foreign prototype identity");
}

const budgetRealm = new Realm((_line: string) => {}, "script"),
    many = budgetRealm.createObject();
for (let i = 0; i < 100; i++) {
    many.bootstrapDefine("k" + i, { value: { kind: "number", value: i } });
}
budgetRealm.defineScriptGlobal("many", { value: { kind: "object", object: many } });
const cutoff = run(budgetRealm, "Reflect.ownKeys(many)", 30);
if (
    cutoff.type !== "throw" ||
    cutoff.origin.kind !== "resource-limit" ||
    cutoff.origin.guardCode !== "steps"
) {
    throw new Error("Reflect key budget");
}
if (many.ownPropertyKeys().length !== 100) {
    throw new Error("Reflect budget mutated input");
}
console.log("reflect introspection passed");

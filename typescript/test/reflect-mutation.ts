import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function run(realm: Realm, text: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "reflect-mutation", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    if (session.inspect().active !== null || session.inspect().calls !== 0) throw new Error("Reflect mutation restoration");
    return result;
}
for (const text of [
    "(()=>{var o={};return Reflect.defineProperty(o,\"x\",{value:3})===true&&o.x===3&&!Object.getOwnPropertyDescriptor(o,\"x\").writable})()",
    "(()=>{var o=Object.freeze({x:1});return Reflect.defineProperty(o,\"x\",{value:2})===false&&o.x===1})()",
    "(()=>{var o=Object.preventExtensions({});return !Reflect.defineProperty(o,\"x\",{value:1})&&!Object.hasOwn(o,\"x\")})()",
    "(()=>{var s=Symbol(),o={};return Reflect.defineProperty(o,s,{value:7})&&o[s]===7})()",
    "(()=>{var o={},n=0,key={toString(){n++;return \"x\"}};try{Reflect.defineProperty(o,key,{get:1})}catch(e){return e instanceof TypeError&&n===1&&!Object.hasOwn(o,\"x\")}return false})()",
    "(()=>{var n=0,key={toString(){n++;throw 1}},desc={get value(){n++;throw 2}};try{Reflect.defineProperty(null,key,desc)}catch(e){return e instanceof TypeError&&n===0}return false})()",
    "(()=>{var log=\"\",o={},key={toString(){log+=\"k\";return \"x\"}},desc={get enumerable(){log+=\"e\";return true},get configurable(){log+=\"c\";return true},get value(){log+=\"v\";return 2},get writable(){log+=\"w\";return true}};return Reflect.defineProperty(o,key,desc)&&log===\"kecvw\"&&o.x===2})()",
    "(()=>{var a=[0,1,2,3];Object.defineProperty(a,\"2\",{configurable:false});var result=Reflect.defineProperty(a,\"length\",{value:1,writable:false});return result===false&&a.length===3&&!(3 in a)&&a[2]===2&&!Object.getOwnPropertyDescriptor(a,\"length\").writable})()",
    "(()=>{var o=new String(\"x\");return Reflect.defineProperty(o,\"0\",{value:\"x\"})&&!Reflect.defineProperty(o,\"0\",{value:\"y\"})})()",
    "(()=>{var o={x:1};return Reflect.deleteProperty(o,\"x\")&&!Object.hasOwn(o,\"x\")&&Reflect.deleteProperty(o,\"missing\")})()",
    "(()=>{var o=Object.freeze({x:1});return Reflect.deleteProperty(o,\"x\")===false&&Reflect.deleteProperty(o,\"missing\")===true})()",
    "(()=>{var n=0,o={get x(){n++;throw 1}};return Reflect.deleteProperty(o,\"x\")&&n===0})()",
    "(()=>{var n=0,key={toString(){n++;return \"x\"}};try{Reflect.deleteProperty(1,key)}catch(e){return e instanceof TypeError&&n===0}return false})()",
    "(()=>{var o={x:1},key={toString(){Object.defineProperty(o,\"x\",{configurable:false});return \"x\"}};return Reflect.deleteProperty(o,key)===false&&o.x===1})()",
    "(()=>{var s=Symbol(),o={[s]:1};return Reflect.deleteProperty(o,s)&&!Object.hasOwn(o,s)})()",
    "(()=>{var o={x:1};return Reflect.preventExtensions(o)===true&&Reflect.preventExtensions(o)===true&&!Object.isExtensible(o)&&o.x===1})()",
    "(()=>{var o={},p={};return Reflect.setPrototypeOf(o,p)===true&&Object.getPrototypeOf(o)===p&&Reflect.setPrototypeOf(o,null)===true&&Object.getPrototypeOf(o)===null})()",
    "(()=>{var o={},p=Object.getPrototypeOf(o);Object.preventExtensions(o);return Reflect.setPrototypeOf(o,p)===true&&Reflect.setPrototypeOf(o,{})===false&&Object.getPrototypeOf(o)===p})()",
    "(()=>{var a={},b=Object.create(a);return Reflect.setPrototypeOf(a,b)===false&&Object.getPrototypeOf(a)===Object.prototype&&Reflect.setPrototypeOf(a,a)===false})()",
    "(()=>{var n=0,p={valueOf(){n++;throw 1},toString(){n++;throw 2}},o={};return Reflect.setPrototypeOf(o,p)&&Object.getPrototypeOf(o)===p&&n===0})()",
    "(()=>{try{Reflect.setPrototypeOf({},1)}catch(e){return e instanceof TypeError}return false})()",
    "(()=>{var values=[undefined,null,true,1,1n,\"x\",Symbol()];return [\"defineProperty\",\"deleteProperty\",\"preventExtensions\",\"setPrototypeOf\"].every(name=>values.every(v=>{try{Reflect[name](v)}catch(e){return e instanceof TypeError}return false}))})()",
    "(()=>{return Reflect.defineProperty.length===3&&Reflect.deleteProperty.length===2&&Reflect.preventExtensions.length===1&&Reflect.setPrototypeOf.length===2})()",
    "var p={value:7,writable:true},d=Object.create(p),o={};Reflect.defineProperty(o,\"x\",d)&&o.x===7&&Object.getOwnPropertyDescriptor(o,\"x\").writable",
    "var marker={},o={},d={get value(){throw marker}},same=false;try{Reflect.defineProperty(o,\"x\",d)}catch(e){same=e===marker}same&&!Object.hasOwn(o,\"x\")",
    "var n=0,key={toString(){n++;return \"x\"}},bad=false;try{Reflect.defineProperty({},key)}catch(e){bad=e instanceof TypeError}bad&&n===1",
    "Reflect.setPrototypeOf(Object.prototype,null)&&!Reflect.setPrototypeOf(Object.prototype,{})",
    "function f(a){Reflect.defineProperty(arguments,\"0\",{value:8});return a===8&&Reflect.deleteProperty(arguments,\"0\")&&(a=9,arguments[0]===undefined)}f(1)"
]) {
    const result = run(new Realm((_line: string) => {}, "script"), text);
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error("execute: " + text);
}

const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
for (const name of ["defineProperty", "deleteProperty", "preventExtensions", "setPrototypeOf"]) {
    const method = run(owner, "Reflect." + name);
    if (method.type !== "normal") throw new Error("Reflect mutation export");
    caller.defineScriptGlobal(name, { value: method.value });
    const error = run(caller, name + "(null)");
    if (error.type !== "throw" || error.value.kind !== "object" || error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("Reflect mutation error Realm");
}
const invalid = run(caller, 'defineProperty({},"x",{get:1})');
if (invalid.type !== "throw" || invalid.value.kind !== "object" || invalid.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("Reflect descriptor error Realm");
const borrowed = run(caller, 'var o={};defineProperty(o,"x",{value:7,configurable:true})&&o.x===7&&deleteProperty(o,"x")&&preventExtensions(o)&&!Object.isExtensible(o)');
if (borrowed.type !== "normal" || borrowed.value.kind !== "boolean" || !borrowed.value.value) throw new Error("Reflect foreign object mutation");

for (const name of ["defineProperty", "deleteProperty", "preventExtensions", "setPrototypeOf"]) {
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 45; steps++) {
        const realm = new Realm((_line: string) => {}, "script"), target = realm.createObject(), attrs = realm.createObject();
        target.bootstrapDefine("x", { value: { kind: "number", value: 1 }, writable: true, configurable: true });
        attrs.bootstrapDefine("value", { value: { kind: "number", value: 7 } });
        realm.defineScriptGlobal("target", { value: { kind: "object", object: target } });
        realm.defineScriptGlobal("attrs", { value: { kind: "object", object: attrs } });
        const args = name === "defineProperty" ? 'target,"x",attrs' : name === "deleteProperty" ? 'target,"x"' : name === "setPrototypeOf" ? "target,null" : "target";
        const result = run(realm, "Reflect." + name + "(" + args + ")", steps);
        const property = target.getOwnProperty("x");
        if (result.type === "throw") {
            if (result.origin.kind !== "resource-limit" || result.origin.guardCode !== "steps") throw new Error("Reflect mutation budget cutoff");
            if (property?.kind !== "data" || property.value.kind !== "number" || property.value.value !== 1 || !target.isExtensible() || target.getPrototypeOf() !== realm.objectPrototype) throw new Error("Reflect budget changed target");
            interrupted = true;
        } else {
            if (result.value.kind !== "boolean" || !result.value.value) throw new Error("Reflect budget completion");
            if (name === "defineProperty" && (property?.kind !== "data" || property.value.kind !== "number" || property.value.value !== 7)) throw new Error("bounded Reflect definition");
            if (name === "deleteProperty" && property !== undefined) throw new Error("bounded Reflect deletion");
            if (name === "preventExtensions" && target.isExtensible()) throw new Error("bounded Reflect integrity");
            if (name === "setPrototypeOf" && target.getPrototypeOf() !== null) throw new Error("bounded Reflect prototype");
            completed = true;
        }
    }
    if (!interrupted || !completed) throw new Error("Reflect mutation budget boundary");
}
console.log("reflect mutation passed");

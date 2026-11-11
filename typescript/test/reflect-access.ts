import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function run(realm: Realm, text: string, steps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "reflect-access", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const session = createScriptSession({ maxSteps: steps, maxCalls: 64 });
    const result = evaluateScript(session, prepared.record).completion;
    if (session.inspect().active !== null || session.inspect().calls !== 0) throw new Error("Reflect access restoration");
    return result;
}
for (const text of [
    "(()=>{var p={x:3},o=Object.create(p);return Reflect.get(o,\"x\")===3&&Reflect.get(o,\"missing\")===undefined})()",
    "(()=>{var o={get x(){\"use strict\";return this}};return Reflect.get(o,\"x\")===o&&Reflect.get(o,\"x\",undefined)===undefined&&Reflect.get(o,\"x\",null)===null})()",
    "(()=>{var r={},o={get x(){return this}};return Reflect.get(o,\"x\",r)===r})()",
    "(()=>{var o={x:7};return Reflect.get(o,\"x\",undefined)===7&&Reflect.get(o,\"x\",null)===7})()",
    "(()=>{var s=Symbol(),o={[s]:9};return Reflect.get(o,s)===9&&Reflect.has(o,s)})()",
    "(()=>{var marker={},o={get x(){throw marker}};try{Reflect.get(o,\"x\")}catch(e){return e===marker}return false})()",
    "(()=>{var n=0,key={toString(){n++;return \"x\"}};try{Reflect.get(null,key)}catch(e){return e instanceof TypeError&&n===0}return false})()",
    "(()=>{var o={x:1},key={toString(){o.x=2;return \"x\"}};return Reflect.get(o,key)===2})()",
    "(()=>{var o={x:1};return Reflect.set(o,\"x\",2)===true&&o.x===2})()",
    "(()=>{var o={x:1},r={};return Reflect.set(o,\"x\",3,r)===true&&o.x===1&&r.x===3})()",
    "(()=>{var p={x:1},o=Object.create(p),r={};return Reflect.set(o,\"x\",4,r)&&p.x===1&&!Object.hasOwn(o,\"x\")&&r.x===4})()",
    "(()=>{var o={x:1};return Reflect.set(o,\"x\",2,undefined)===false&&Reflect.set(o,\"x\",2,null)===false&&o.x===1})()",
    "(()=>{var p={};Object.defineProperty(p,\"x\",{value:1});var r={x:2};return !Reflect.set(p,\"x\",3,r)&&r.x===2})()",
    "(()=>{var n=0,p={x:1},r={set x(v){n++}};return Reflect.set(p,\"x\",3,r)===false&&n===0})()",
    "(()=>{var p={set x(v){this.y=v}},r={};return Reflect.set(p,\"x\",7,r)===true&&r.y===7&&!Object.hasOwn(p,\"y\")})()",
    "(()=>{var receiver,value,p={set x(v){\"use strict\";receiver=this;value=v;return false}};return Reflect.set(p,\"x\",8,undefined)===true&&receiver===undefined&&value===8})()",
    "(()=>{var p={get x(){return 1}};return Reflect.set(p,\"x\",2)===false})()",
    "(()=>{var r=Object.preventExtensions({});return Reflect.set({},\"x\",1,r)===false&&!Object.hasOwn(r,\"x\")})()",
    "(()=>{var o={},key={toString(){Object.preventExtensions(o);return \"x\"}};return Reflect.set(o,key,1)===false&&!Object.hasOwn(o,\"x\")})()",
    "(()=>{var n=0,key={toString(){n++;return \"x\"}};try{Reflect.set(1,key,2)}catch(e){return e instanceof TypeError&&n===0}return false})()",
    "(()=>{var n=0,p={get x(){n++;throw 1}},o=Object.create(p);return Reflect.has(o,\"x\")&&n===0&&!Reflect.has(o,\"missing\")})()",
    "(()=>{var o={x:undefined};return Reflect.has(o,\"x\")&&Reflect.has(Object.create(o),\"x\")})()",
    "(()=>{var o={x:1},key={toString(){delete o.x;return \"x\"}};return Reflect.has(o,key)===false})()",
    "(()=>{var n=0,key={toString(){n++;return \"x\"}};try{Reflect.has(\"x\",key)}catch(e){return e instanceof TypeError&&n===0}return false})()",
    "(()=>{var values=[undefined,null,true,1,1n,\"x\",Symbol()];return [\"get\",\"set\",\"has\"].every(name=>values.every(v=>{try{Reflect[name](v,\"x\")}catch(e){return e instanceof TypeError}return false}))})()",
    "(()=>{return Reflect.get.length===2&&Reflect.set.length===3&&Reflect.has.length===2})()",
    "var s=new String(\"x\");Reflect.get(s,\"0\")===\"x\"&&Reflect.has(s,\"0\")&&!Reflect.set(s,\"0\",\"y\")&&!Reflect.set(s,\"length\",2)",
    "var a=[0,1,2,3];Object.defineProperty(a,\"2\",{configurable:false});Reflect.set(a,\"length\",1)===false&&a.length===3&&!(3 in a)&&a[2]===2",
    "function f(a){return Reflect.set(arguments,\"0\",7)&&a===7&&Reflect.get(arguments,\"0\")===7}f(1)",
    "var marker={},o={set x(v){throw marker}},same=false;try{Reflect.set(o,\"x\",1)}catch(e){same=e===marker}same",
    "Reflect.get({undefined:7})===7&&Reflect.has({undefined:7})",
    "var o={};Reflect.set(o)&&Object.hasOwn(o,\"undefined\")&&o.undefined===undefined"
]) {
    const result = run(new Realm((_line: string) => {}, "script"), text);
    if (result.type !== "normal" || result.value.kind !== "boolean" || !result.value.value) throw new Error("execute: " + text);
}

const owner = new Realm((_line: string) => {}, "script"), caller = new Realm((_line: string) => {}, "script");
for (const name of ["get", "set", "has"]) {
    const method = run(owner, "Reflect." + name);
    if (method.type !== "normal") throw new Error("Reflect access export");
    caller.defineScriptGlobal(name, { value: method.value });
    const error = run(caller, name + "(null)");
    if (error.type !== "throw" || error.value.kind !== "object" || error.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("Reflect access error Realm");
}
const owned = run(owner, '({get x(){throw new TypeError("owner")}})');
if (owned.type !== "normal") throw new Error("Reflect accessor owner");
caller.defineScriptGlobal("owned", { value: owned.value });
const foreign = run(caller, 'Reflect.get(owned,"x")');
if (foreign.type !== "throw" || foreign.value.kind !== "object" || foreign.value.object.getPrototypeOf() !== owner.getErrorPrototype("TypeError")) throw new Error("Reflect preserves getter error Realm");
const local = run(caller, 'get({get x(){throw new TypeError("caller")}},"x")');
if (local.type !== "throw" || local.value.kind !== "object" || local.value.object.getPrototypeOf() !== caller.getErrorPrototype("TypeError")) throw new Error("borrowed Reflect preserves local getter error");
const borrowed = run(caller, 'var p={set x(v){this.y=v}},r={};set(p,"x",7,r)&&get(r,"y")===7&&has(r,"y")');
if (borrowed.type !== "normal" || borrowed.value.kind !== "boolean" || !borrowed.value.value) throw new Error("Reflect foreign receiver");

for (const name of ["get", "set", "has"]) {
    let interrupted = false, completed = false;
    for (let steps = 0; steps < 40; steps++) {
        const realm = new Realm((_line: string) => {}, "script"), target = realm.createObject();
        target.bootstrapDefine("x", { value: { kind: "number", value: 1 }, writable: true, configurable: true });
        realm.defineScriptGlobal("target", { value: { kind: "object", object: target } });
        const result = run(realm, "Reflect." + name + '(target,"x"' + (name === "set" ? ",7)" : ")"), steps);
        const property = target.getOwnProperty("x");
        if (property?.kind !== "data" || property.value.kind !== "number") throw new Error("Reflect access target descriptor");
        if (result.type === "throw") {
            if (result.origin.kind !== "resource-limit" || result.origin.guardCode !== "steps" || property.value.value !== 1) throw new Error("Reflect access budget cutoff");
            interrupted = true;
        } else {
            if (name === "get" ? result.value.kind !== "number" || result.value.value !== 1 : result.value.kind !== "boolean" || !result.value.value) throw new Error("Reflect access budget completion");
            if (property.value.value !== (name === "set" ? 7 : 1)) throw new Error("Reflect access budget mutation");
            completed = true;
        }
    }
    if (!interrupted || !completed) throw new Error("Reflect access budget boundary");
}
console.log("reflect access passed");

import { nativeFunctionString } from "../src/builtins/function.js";
import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownHasInstance, wellKnownIsConcatSpreadable, wellKnownSpecies, wellKnownSplit, wellKnownToPrimitive, wellKnownToStringTag } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name, {value, writable: true, configurable: true}); }
function own(object: GuestObject, key: string): Value {
    const d = object.getOwnProperty(key);
    if (d === undefined || d.kind !== "data") throw new Error("own " + key);
    return d.value;
}
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "symbol-factory", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({maxSteps: steps, maxCalls: 64}), prepared.record).completion;
}
for (const source of [
    "typeof Symbol==='function'&&Symbol.length===0&&Symbol.name==='Symbol'&&Symbol.prototype.constructor===Symbol;",
    "let a=Symbol('x');let b=Symbol('x');typeof a==='symbol'&&a!==b&&a.description==='x'&&b.description==='x';",
    "Symbol().description===undefined&&Symbol(undefined).description===undefined&&Symbol('').description==='';",
    "Symbol(null).description==='null'&&Symbol(false).description==='false'&&Symbol(7).description==='7';",
    "let trace='';let s=Symbol({toString:function(){trace+='S';return 'x';},valueOf:function(){throw 1;}});trace==='S'&&s.description==='x';",
    "let trace='';let s=Symbol({toString:function(){trace+='S';return {};},valueOf:function(){trace+='V';return 7;}});trace==='SV'&&s.description==='7';",
    "let calls=0;let o={};o[Symbol.toPrimitive]=function(h){calls++;return h;};Symbol(o).description==='string'&&calls===1;",
    "let marker={};try{Symbol({toString:function(){throw marker;}});}catch(e){e===marker;}",
    "let calls=0;try{new Symbol({toString:function(){calls++;return 'x';}});}catch(e){e instanceof TypeError&&calls===0;}",
    "let s=Symbol('x');let o=Object(s);o.valueOf()===s&&o.description==='x'&&o.toString()==='Symbol(x)'&&String(s)==='Symbol(x)';",
    "let s=Symbol('x');let o={};o[s]=7;Object.keys(o).length===0&&Object.getOwnPropertySymbols(o)[0]===s&&o[s]===7;",
    "let s=Symbol('x');let o=Object(s);Object.setPrototypeOf(o,null);Object.getOwnPropertyDescriptor(Symbol.prototype,'description').get.call(o)==='x';",
    "let d=Object.getOwnPropertyDescriptor(Symbol.prototype,'description');typeof d.get==='function'&&d.get.name==='get description'&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable;",
    "let d=Object.getOwnPropertyDescriptor(Symbol,'prototype');!d.writable&&!d.enumerable&&!d.configurable&&d.value===Symbol.prototype;",
    "let s=Symbol('x');Symbol.prototype.valueOf.call(s)===s&&Object.prototype.toString.call(s)==='[object Symbol]';",
    "let o={};o[Symbol.toStringTag]='Custom';Object.prototype.toString.call(o)==='[object Custom]';",
    "let o={};o[Symbol.split]=function(s,n){return s+n;};'abc'.split(o,2)==='abc2';",
    "let o={length:1,0:7};o[Symbol.isConcatSpreadable]=true;[].concat(o)[0]===7;",
    "Object.getOwnPropertyDescriptor(Symbol.prototype,'description').get.toString()==='function get description() { [native code] }';",
    "Symbol.prototype[Symbol.toPrimitive].call(Symbol('x'),'ignored').description==='x';",
    "let s=Symbol('x');Object.assign({},Object.defineProperty({},s,{value:7,enumerable:true}))[s]===7;"
]) {
    const result = run(source);
    check(result.type === "normal" && sameValue(result.value, {kind: "boolean", value: true}), source);
}
for (const source of [
    "Symbol(Symbol('x'));", "Symbol(Object(Symbol('x')));", "new Symbol();",
    "Symbol.prototype.description;", "Object.create(Symbol.prototype).description;",
    "Object.getOwnPropertyDescriptor(Symbol.prototype,'description').get.call({});",
    "Object.getOwnPropertyDescriptor(Symbol.prototype,'description').get.call(null);",
    "'use strict'; Symbol.hasInstance=7;"
]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
{
    const a = fresh(), b = fresh(), factory = own(a.globalObject, "Symbol");
    check(factory.kind === "object" && factory.object.constructorSlot !== null, "factory with rejecting construct slot");
    if (factory.kind !== "object") throw new Error("factory");
    for (const entry of [
        {name: "hasInstance", symbol: wellKnownHasInstance},
        {name: "isConcatSpreadable", symbol: wellKnownIsConcatSpreadable},
        {name: "species", symbol: wellKnownSpecies},
        {name: "split", symbol: wellKnownSplit},
        {name: "toPrimitive", symbol: wellKnownToPrimitive},
        {name: "toStringTag", symbol: wellKnownToStringTag},
    ]) {
        const d = factory.object.getOwnProperty(entry.name);
        check(d !== undefined && d.kind === "data" && d.value.kind === "symbol" && d.value.value === entry.symbol && !d.writable && !d.enumerable && !d.configurable, "well-known identity/flags " + entry.name);
    }
    seed(b, "foreignSymbol", factory);
    const getter = a.symbolPrototype.getOwnProperty("description");
    if (getter === undefined || getter.kind !== "accessor") throw new Error("getter");
    seed(b, "foreignDescription", getter.get);
    for (const source of ["foreignSymbol(Symbol());", "new foreignSymbol();", "foreignDescription.call({});"]) {
        const result = run(source, b);
        check(result.type === "throw" && result.value.kind === "object" && result.value.object.getPrototypeOf() === a.getErrorPrototype("TypeError"), "defining Realm errors");
    }
    const result = run("foreignSymbol!==Symbol&&foreignSymbol.prototype!==Symbol.prototype&&foreignSymbol.toPrimitive===Symbol.toPrimitive&&foreignSymbol('x')!==Symbol('x')&&foreignDescription.call(Object(Symbol('x')))==='x';", b);
    check(result.type === "normal" && sameValue(result.value, {kind: "boolean", value: true}), "cross-Realm identity and boxes");
}
{
    const result = run("while(true){Symbol('x');}", fresh(), 100);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "bounded allocation loop");
}
for (const text of ["a\u0000\ud800", "\udfff", ""]) {
    const realm = fresh();
    seed(realm, "input", {kind: "string", value: text});
    const result = run("Symbol(input).description===input;", realm);
    check(result.type === "normal" && sameValue(result.value, {kind: "boolean", value: true}), "UTF-16 description");
}
const legacy = new Realm((_line: string) => {});
check(!legacy.global.bindings.has("Symbol") && legacy.symbolPrototype.getOwnProperty("description") === undefined, "legacy unchanged");
for (const name of ["get x", "set x", "get [Symbol.toPrimitive]"]) {
    check(nativeFunctionString(name) === "function " + name + "() { [native code] }", "accessor native text");
}
for (const name of ["get ", "set ", "get 1x", "get x y", "set x) {}", "get [bad]"]) {
    let rejected = false;
    try { nativeFunctionString(name); }
    catch (error) { rejected = error instanceof Error && error.message === "invalid builtin initial name"; }
    check(rejected, "invalid accessor metadata");
}
console.log("Symbol factory passed");

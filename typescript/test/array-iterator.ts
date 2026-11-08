import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { wellKnownIterator, wellKnownToStringTag } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name, {value, writable: true, configurable: true}); }
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("own " + key);
    return descriptor.value;
}
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "array-iterator", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({maxSteps: steps, maxCalls: 64}), prepared.record).completion;
}
for (const source of [
    "let i=[7,8].values();let a=i.next();let b=i.next();let c=i.next();a.value===7&&!a.done&&b.value===8&&!b.done&&c.value===undefined&&c.done;",
    "let i=[7,8].keys();i.next().value===0&&i.next().value===1&&i.next().done;",
    "let i=[7,8].entries();let a=i.next();let b=i.next();Array.isArray(a.value)&&a.value.join(',')==='0,7'&&b.value.join(',')==='1,8'&&a.value!==b.value&&i.next().done;",
    "Array.prototype.values===Array.prototype[Symbol.iterator]&&[7][Symbol.iterator]().next().value===7;",
    "let i=[].values();i[Symbol.iterator]()===i&&Object.getOwnPropertyNames(i).length===0&&Object.getOwnPropertySymbols(i).length===0;",
    "let i=[].values();Object.prototype.toString.call(i)==='[object Array Iterator]';",
    "let i=[].values();let a=i.next();let b=i.next();a!==b&&a.done&&b.done&&a.value===undefined&&Object.keys(a).join(',')==='value,done';",
    "let r=[7].values().next();let a=Object.getOwnPropertyDescriptor(r,'value');let b=Object.getOwnPropertyDescriptor(r,'done');a.writable&&a.enumerable&&a.configurable&&b.writable&&b.enumerable&&b.configurable;",
    "let a=[7];let i=a.values();let first=i.next();a.push(8);first.value===7&&i.next().value===8&&i.next().done;",
    "let a=[7,8];let i=a.values();i.next();a.length=0;let end=i.next();a.push(9,10);end.done&&i.next().done;",
    "let a=[];a.length=2;let i=a.values();let x=i.next();let y=i.next();!x.done&&!y.done&&x.value===undefined&&y.value===undefined&&i.next().done;",
    "let a=[];a.length=1;Object.setPrototypeOf(a,{0:7});Array.prototype.values.call(a).next().value===7;",
    "let o={length:2,0:7,1:8};let i=Array.prototype.values.call(o);delete o[0];let a=i.next();o[1]=9;a.value===undefined&&i.next().value===9;",
    "Array.prototype.values.call('ab').next().value==='a'&&Array.prototype.keys.call('ab').next().value===0;",
    "Array.prototype.values.call(7).next().done&&Array.prototype.values.call(Symbol()).next().done;",
    "let calls=0;let o={};Object.defineProperty(o,'length',{get:function(){calls++;return 1;}});let i=Array.prototype.values.call(o);calls===0&&!i.next().done&&calls===1&&i.next().done&&calls===2&&i.next().done&&calls===2;",
    "let count=0;let o={length:1};Object.defineProperty(o,'0',{get:function(){count++;return 7;}});let i=Array.prototype.keys.call(o);i.next().value===0&&i.next().done&&count===0;",
    "let marker={};let o={length:2,1:8};Object.defineProperty(o,'0',{get:function(){throw marker;}});let i=Array.prototype.values.call(o);let caught=false;try{i.next();}catch(e){caught=e===marker;}caught&&i.next().value===8&&i.next().done;",
    "let calls=0;let marker={};let o={0:7};Object.defineProperty(o,'length',{get:function(){calls++;if(calls===1)throw marker;return 1;}});let i=Array.prototype.values.call(o);let caught=false;try{i.next();}catch(e){caught=e===marker;}caught&&i.next().value===7;",
    "let calls=0;let o={0:7,length:{valueOf:function(){calls++;return 1.9;}}};let i=Array.prototype.values.call(o);i.next().value===7&&i.next().done&&calls===2;",
    "let calls=0;let inner;let i;let o={0:7,1:8};Object.defineProperty(o,'length',{get:function(){calls++;if(calls===1)inner=i.next();return 2;}});i=Array.prototype.values.call(o);let outer=i.next();inner.value===7&&outer.value===7&&i.next().value===8&&i.next().done;",
    "let calls=0;let inner;let i;let o={0:7};Object.defineProperty(o,'length',{get:function(){calls++;if(calls===1){inner=i.next();return 1;}return 0;}});i=Array.prototype.values.call(o);let outer=i.next();inner.done&&outer.value===7&&!outer.done&&i.next().done&&calls===2;",
    "let inner;let i;let o={length:2,1:8};Object.defineProperty(o,'0',{get:function(){inner=i.next();return 7;}});i=Array.prototype.values.call(o);let outer=i.next();inner.value===8&&outer.value===7&&i.next().done;",
    "let i=[7].values();let next=i.next;Object.setPrototypeOf(i,null);next.call(i).value===7&&next.call(i).done;",
    "let i=Object.freeze([7].values());i.next().value===7&&i.next().done;",
    "let i=[7].values();let identity=i[Symbol.iterator];identity.call(7)===7&&identity.call(null)===null&&identity.name==='[Symbol.iterator]'&&identity.length===0;",
    "Array.prototype.keys.name==='keys'&&Array.prototype.keys.length===0&&Array.prototype.values.name==='values'&&Array.prototype.values.length===0&&Array.prototype.entries.name==='entries'&&Array.prototype.entries.length===0;",
    "let i=[].values();let p=Object.getPrototypeOf(i);let root=Object.getPrototypeOf(p);Object.getPrototypeOf(root)===Object.prototype&&p.next.name==='next'&&p.next.length===0;",
    "let p=Object.getPrototypeOf([].values());let root=Object.getPrototypeOf(p);let d=Object.getOwnPropertyDescriptor(root,Symbol.iterator);Object.getOwnPropertyNames(p).join(',')==='next'&&Object.getOwnPropertySymbols(p)[0]===Symbol.toStringTag&&Object.getOwnPropertyNames(root).length===0&&Object.getOwnPropertySymbols(root)[0]===Symbol.iterator&&d.writable&&!d.enumerable&&d.configurable;",
    "let d=Object.getOwnPropertyDescriptor(Array.prototype,Symbol.iterator);d.value===Array.prototype.values&&d.writable&&!d.enumerable&&d.configurable;",
    "let p=Object.getPrototypeOf([].values());let d=Object.getOwnPropertyDescriptor(p,Symbol.toStringTag);d.value==='Array Iterator'&&!d.writable&&!d.enumerable&&d.configurable;"
]) {
    const result = run(source);
    check(result.type === "normal" && sameValue(result.value, {kind: "boolean", value: true}), source);
}
for (const source of [
    "Array.prototype.values.call(null);", "Array.prototype.keys.call(undefined);",
    "Array.prototype.entries.call(null);", "[].values().next.call({});", "[].values().next.call(null);",
    "let i=[].values();i.next.call(Object.create(Object.getPrototypeOf(i)));",
    "new Array.prototype.values();", "new Array.prototype.keys();", "new Array.prototype.entries();",
    "Array.prototype.values.call({length:Symbol()}).next();"
]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
{
    const owner = fresh(), caller = fresh();
    seed(caller, "values", own(owner.arrayPrototype, "values"));
    seed(caller, "entries", own(owner.arrayPrototype, "entries"));
    seed(caller, "foreignNext", own(owner.arrayIteratorPrototype, "next"));
    const iterator = run("values.call([7]);", caller);
    check(iterator.type === "normal" && iterator.value.kind === "object" && iterator.value.object.getPrototypeOf() === owner.arrayIteratorPrototype, "iterator allocation Realm");
    const result = run("foreignNext.call([7].entries());", caller);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object.getPrototypeOf() === owner.objectPrototype, "result allocation Realm");
    if (result.type !== "normal" || result.value.kind !== "object") throw new Error("entry result");
    const pair = own(result.value.object, "value");
    check(pair.kind === "object" && pair.object.getPrototypeOf() === owner.arrayPrototype, "entry pair Realm");
    for (const source of ["values.call(null);", "foreignNext.call({});"]) {
        const failure = run(source, caller);
        check(failure.type === "throw" && failure.value.kind === "object" && failure.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "iterator error Realm");
    }
    check(owner.iteratorPrototype !== caller.iteratorPrototype && owner.arrayIteratorPrototype !== caller.arrayIteratorPrototype, "fresh iterator prototypes");
    const tag = owner.arrayIteratorPrototype.getOwnProperty(wellKnownToStringTag);
    check(tag !== undefined && tag.kind === "data" && sameValue(tag.value, {kind: "string", value: "Array Iterator"}), "iterator tag");
}
{
    const result = run("let i=Array.prototype.values.call({length:Infinity});while(true){i.next();}", fresh(), 100);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "large live iterator budget");
}
const legacy = new Realm((_line: string) => {});
check(legacy.arrayPrototype.getOwnProperty("values") === undefined && legacy.arrayPrototype.getOwnProperty(wellKnownIterator) === undefined, "legacy iterator absent");
console.log("Array iterators passed");

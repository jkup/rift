import { Realm } from "../src/realm.js";
import {
    sameValue,
    type GuestObject,
    type PropertyKey,
    type Value,
    type ValueCompletion,
} from "../src/runtime.js";
import { wellKnownIterator } from "../src/symbols.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void {
    if (!ok) {
        throw new Error(label);
    }
}
function fresh(): Realm {
    return new Realm((_line: string) => {}, "script");
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, { value, writable: true, configurable: true });
}
function own(object: GuestObject, key: PropertyKey): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("own property");
    }
    return descriptor.value;
}
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "string-iterator", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function resultObject(result: ValueCompletion): GuestObject {
    if (result.type !== "normal" || result.value.kind !== "object") {
        throw new Error("object completion");
    }
    return result.value.object;
}
for (const source of [
    "let i='ab'[Symbol.iterator]();let a=i.next();let b=i.next();let c=i.next();a.value==='a'&&!a.done&&b.value==='b'&&!b.done&&c.value===undefined&&c.done;",
    "let i=''[Symbol.iterator]();let a=i.next();let b=i.next();a!==b&&a.done&&b.done&&a.value===undefined&&Object.keys(a).join(',')==='value,done';",
    "let i='x'[Symbol.iterator]();i[Symbol.iterator]()===i&&Object.getOwnPropertyNames(i).length===0&&Object.getOwnPropertySymbols(i).length===0;",
    "Object.prototype.toString.call('x'[Symbol.iterator]())==='[object String Iterator]';",
    "let f=String.prototype[Symbol.iterator];f.call(7).next().value==='7'&&f.call(true).next().value==='t'&&f.call(Object('x')).next().value==='x';",
    "let calls=0;let o={toString:function(){calls++;return 'ab';}};let i=String.prototype[Symbol.iterator].call(o);o.toString=function(){throw 1;};calls===1&&i.next().value==='a'&&i.next().value==='b'&&i.next().done&&calls===1;",
    "let trace='';let o={toString:function(){trace+='S';return {};},valueOf:function(){trace+='V';return 'x';}};String.prototype[Symbol.iterator].call(o).next().value==='x'&&trace==='SV';",
    "let hint='';let o={};o[Symbol.toPrimitive]=function(h){hint=h;return 'x';};String.prototype[Symbol.iterator].call(o).next().value==='x'&&hint==='string';",
    "let marker={};try{String.prototype[Symbol.iterator].call({toString:function(){throw marker;}});}catch(e){e===marker;}",
    "let o={toString:function(){return 'x';}};Object.defineProperty(o,'length',{get:function(){throw 1;}});String.prototype[Symbol.iterator].call(o).next().value==='x';",
    "let i=Object.freeze('x'[Symbol.iterator]());i.next().value==='x'&&i.next().done;",
    "let i='x'[Symbol.iterator]();let next=i.next;Object.setPrototypeOf(i,null);next.call(i).value==='x'&&next.call(i).done;",
    "let d=Object.getOwnPropertyDescriptor(String.prototype,Symbol.iterator);d.value.name==='[Symbol.iterator]'&&d.value.length===0&&d.writable&&!d.enumerable&&d.configurable;",
    "let p=Object.getPrototypeOf(''[Symbol.iterator]());let a=Object.getPrototypeOf([].values());Object.getPrototypeOf(p)===Object.getPrototypeOf(a)&&p.next.name==='next'&&p.next.length===0;",
    "let p=Object.getPrototypeOf(''[Symbol.iterator]());let d=Object.getOwnPropertyDescriptor(p,Symbol.toStringTag);d.value==='String Iterator'&&!d.writable&&!d.enumerable&&d.configurable;",
    "let r='x'[Symbol.iterator]().next();let v=Object.getOwnPropertyDescriptor(r,'value');let d=Object.getOwnPropertyDescriptor(r,'done');v.writable&&v.enumerable&&v.configurable&&d.writable&&d.enumerable&&d.configurable;",
]) {
    const result = run(source);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        source,
    );
}
for (const source of [
    "String.prototype[Symbol.iterator].call(null);",
    "String.prototype[Symbol.iterator].call(undefined);",
    "String.prototype[Symbol.iterator].call(Symbol());",
    "String.prototype[Symbol.iterator].call(Object(Symbol()));",
    "''[Symbol.iterator]().next.call({});",
    "''[Symbol.iterator]().next.call(null);",
    "let i=''[Symbol.iterator]();i.next.call(Object.create(Object.getPrototypeOf(i)));",
    "''[Symbol.iterator]().next.call([].values());",
    "[].values().next.call(''[Symbol.iterator]());",
    "new String.prototype[Symbol.iterator]();",
]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
const unicodeCases = [
    { input: "", parts: [] },
    { input: "ab", parts: ["a", "b"] },
    { input: "a\u0000b", parts: ["a", "\u0000", "b"] },
    { input: "\u00e9\u0301", parts: ["\u00e9", "\u0301"] },
    { input: "\ud83d\ude00", parts: ["\ud83d\ude00"] },
    { input: "\ud800", parts: ["\ud800"] },
    { input: "\udfff", parts: ["\udfff"] },
    { input: "\ud800A\udc00", parts: ["\ud800", "A", "\udc00"] },
    { input: "\ud800\ud800\udc00", parts: ["\ud800", "\ud800\udc00"] },
    { input: "\udc00\ud800\udc00", parts: ["\udc00", "\ud800\udc00"] },
    { input: "\udbff\udfff", parts: ["\udbff\udfff"] },
    { input: "a\ud834\udd1ez", parts: ["a", "\ud834\udd1e", "z"] },
];
for (const sample of unicodeCases) {
    const realm = fresh();
    seed(realm, "input", { kind: "string", value: sample.input });
    const output = resultObject(
        run(
            "let a=[];let i=input[Symbol.iterator]();let r=i.next();while(!r.done){a.push(r.value);r=i.next();}a;",
            realm,
        ),
    );
    check(
        sameValue(own(output, "length"), { kind: "number", value: sample.parts.length }),
        "code-point count",
    );
    for (let i = 0; i < sample.parts.length; i++) {
        check(
            sameValue(own(output, String(i)), { kind: "string", value: sample.parts[i] }),
            "literal code-point value",
        );
    }
}
{
    const realm = fresh();
    seed(realm, "input", { kind: "string", value: "\ud83d\ude00" });
    const result = run(
        "input[Symbol.iterator]().next().value.length===2&&Array.prototype.values.call(input).next().value.length===1;",
        realm,
    );
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        "String code points versus generic Array code units",
    );
}
{
    const owner = fresh(),
        caller = fresh();
    seed(caller, "foreignFactory", own(owner.stringPrototype, wellKnownIterator));
    seed(caller, "foreignNext", own(owner.stringIteratorPrototype, "next"));
    seed(caller, "localNext", own(caller.stringIteratorPrototype, "next"));
    const iterator = resultObject(
        run("var foreignIterator=foreignFactory.call('x');foreignIterator;", caller),
    );
    check(iterator.getPrototypeOf() === owner.stringIteratorPrototype, "factory Realm prototype");
    check(
        resultObject(run("localNext.call(foreignIterator);", caller)).getPrototypeOf() ===
            owner.objectPrototype,
        "yield uses captured factory Realm",
    );
    check(
        resultObject(run("localNext.call(foreignIterator);", caller)).getPrototypeOf() ===
            caller.objectPrototype,
        "first done uses next Realm",
    );
    check(
        resultObject(run("foreignNext.call(foreignIterator);", caller)).getPrototypeOf() ===
            owner.objectPrototype,
        "repeated done uses each next Realm",
    );
    run("var localIterator='x'[Symbol.iterator]();", caller);
    check(
        resultObject(run("foreignNext.call(localIterator);", caller)).getPrototypeOf() ===
            caller.objectPrototype,
        "borrowed next preserves yielded Realm",
    );
    check(
        resultObject(run("foreignNext.call(localIterator);", caller)).getPrototypeOf() ===
            owner.objectPrototype,
        "borrowed next owns completion result",
    );
    for (const source of ["foreignFactory.call(null);", "foreignNext.call({});"]) {
        const result = run(source, caller);
        check(
            result.type === "throw" &&
                result.value.kind === "object" &&
                result.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"),
            "String iterator error Realm",
        );
    }
}
{
    const realm = fresh();
    seed(realm, "input", { kind: "string", value: "x".repeat(1000) });
    const result = run("let i=input[Symbol.iterator]();while(true){i.next();}", realm, 100);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "String iteration budget",
    );
}
check(
    new Realm((_line: string) => {}).stringPrototype.getOwnProperty(wellKnownIterator) ===
        undefined,
    "legacy iterator absent",
);
console.log("String iterators passed");

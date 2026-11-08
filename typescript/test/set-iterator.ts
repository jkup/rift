import { Realm } from "../src/realm.js";
import { GuestSet } from "../src/set-object.js";
import { sameValue, UNDEFINED, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "set-iterator", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({maxSteps: steps, maxCalls: 64}), prepared.record).completion;
}
function passes(text: string, realm = fresh()): void {
    const result = run(text, realm);
    check(result.type === "normal" && sameValue(result.value, {kind: "boolean", value: true}), text);
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("own " + key);
    return descriptor.value;
}
function object(value: Value): GuestObject {
    if (value.kind !== "object") throw new Error("object value");
    return value.object;
}
function resultObject(result: ValueCompletion): GuestObject {
    if (result.type !== "normal") throw new Error("object completion");
    return object(result.value);
}
function seed(realm: Realm, name: string, value: Value): void {
    realm.defineScriptGlobal(name, {value, writable: true, enumerable: true, configurable: true});
}

for (const source of [
    "Set.prototype.keys===Set.prototype.values&&Set.prototype[Symbol.iterator]===Set.prototype.values&&Set.prototype.keys.name==='values';",
    "let s=new Set([3,1,3,2]);let i=s.values();i.next().value===3&&i.next().value===1&&i.next().value===2&&i.next().done;",
    "let s=new Set([1,2]);let i=s.entries();let a=i.next();let b=i.next();a!==b&&a.value!==b.value&&a.value.join(',')==='1,1'&&b.value.join(',')==='2,2'&&!a.done&&!b.done&&i.next().done;",
    "let x={};let s=Symbol();let i=new Set([x,s,-0,NaN]).entries();let a=i.next().value;let b=i.next().value;let c=i.next().value;let d=i.next().value;a[0]===x&&a[1]===x&&b[0]===s&&b[1]===s&&1/c[0]===Infinity&&1/c[1]===Infinity&&Number.isNaN(d[0])&&Number.isNaN(d[1]);",
    "let s=new Set([1,2]);let i=s.values();i.next();s.delete(2);s.add(3);i.next().value===3&&i.next().done;",
    "let s=new Set([1,2]);let i=s.values();i.next();s.clear();s.add(3);i.next().value===3&&i.next().done;",
    "let s=new Set([1,2]);let i=s.values();i.next();s.delete(1);s.add(1);i.next().value===2&&i.next().value===1&&i.next().done;",
    "let s=new Set([1]);let i=s.values();i.next();s.add(2);i.next().value===2&&i.next().done;",
    "let s=new Set([1]);let i=s.values();i.next();i.next();s.add(2);let a=i.next();let b=i.next();a!==b&&a.done&&b.done&&a.value===undefined;",
    "let s=new Set();let i=s.values();i.next();s.add(1);i.next().done;",
    "let s=new Set([1]);let i=s.values();s.clear();s.add(2);i.next().value===2&&i.next().done;",
    "let s=new Set([1,2]);let a=s.keys();let b=s.values();a.next().value===1&&a.next().value===2&&b.next().value===1;",
    "let s=new Set([1,2]);let i=s.entries();let a=i.next().value;a[0]=9;a.push(7);s.has(1)&&!s.has(9)&&i.next().value.join(',')==='2,2';",
    "let s=new Set([1,2]);let copy=new Set(s);copy!==s&&copy.size===2&&copy.has(1)&&copy.has(2);",
    "let s=new Set(['a','b']);let m=new Map(s.entries());let o=Object.fromEntries(s.entries());m.get('a')==='a'&&m.get('b')==='b'&&o.a==='a'&&o.b==='b';",
    "let s=new Set([1,2,3]);let g=Object.groupBy(s,function(v){return v%2;});g[0].join(',')==='2'&&g[1].join(',')==='1,3';",
    "let i=new Set([1]).values();i[Symbol.iterator]()===i&&Object.getOwnPropertyNames(i).length===0&&Object.getOwnPropertySymbols(i).length===0;",
    "let i=new Set([1]).values();let next=i.next;Object.setPrototypeOf(i,null);Object.freeze(i);next.call(i).value===1&&next.call(i).done;",
    "Object.prototype.toString.call(new Set().values())==='[object Set Iterator]'&&Object.getPrototypeOf(Object.getPrototypeOf(new Set().values()))===Object.getPrototypeOf(Object.getPrototypeOf(new Map().keys()));",
    "let p=Object.getPrototypeOf(new Set().values());let d=Object.getOwnPropertyDescriptor(p,Symbol.toStringTag);d.value==='Set Iterator'&&!d.writable&&!d.enumerable&&d.configurable&&p.next.name==='next'&&p.next.length===0;",
    "let r=new Set([1]).values().next();let v=Object.getOwnPropertyDescriptor(r,'value');let d=Object.getOwnPropertyDescriptor(r,'done');Object.keys(r).join(',')==='value,done'&&v.writable&&v.enumerable&&v.configurable&&d.writable&&d.enumerable&&d.configurable;",
    "Object.defineProperty(Array.prototype,'0',{set:function(){throw 1;}});new Set([7]).entries().next().value[0]===7;",
]) passes(source);
for (const name of ["values", "keys", "entries"]) {
    passes("let d=Object.getOwnPropertyDescriptor(Set.prototype,'"+name+"');d.value.name==='"+(name === "keys" ? "values" : name)+"'&&d.value.length===0&&!Object.hasOwn(d.value,'prototype')&&d.writable&&!d.enumerable&&d.configurable;");
    for (const receiver of ["undefined", "null", "1", "{}", "Set.prototype", "Object.create(Set.prototype)", "new Map()"]) {
        const result = run("Set.prototype."+name+".call("+receiver+");");
        check(result.type === "throw" && result.diagnostic.name === "TypeError", "factory brand " + name);
    }
}
for (const source of [
    "new Set().values().next.call({});", "let i=new Set().values();i.next.call(Object.create(Object.getPrototypeOf(i)));",
    "new Set().values().next.call(new Map().values());", "new Map().values().next.call(new Set().values());",
    "[].values().next.call(new Set().values());", "new Set.prototype.values();", "new (Object.getPrototypeOf(new Set().values()).next)();",
]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
{
    const owner = fresh(), caller = fresh();
    seed(caller,"foreignEntries",own(owner.setPrototype,"entries"));
    seed(caller,"foreignNext",own(owner.setIteratorPrototype,"next"));
    seed(caller,"localNext",own(caller.setIteratorPrototype,"next"));
    const iterator = resultObject(run("var foreignIterator=foreignEntries.call(new Set([1]));foreignIterator;",caller));
    check(iterator.getPrototypeOf() === owner.setIteratorPrototype, "iterator factory Realm");
    const yielded = resultObject(run("localNext.call(foreignIterator);",caller));
    check(yielded.getPrototypeOf() === owner.objectPrototype && object(own(yielded,"value")).getPrototypeOf() === owner.arrayPrototype, "captured yield/pair Realm");
    check(resultObject(run("localNext.call(foreignIterator);",caller)).getPrototypeOf() === caller.objectPrototype, "first done Realm");
    check(resultObject(run("foreignNext.call(foreignIterator);",caller)).getPrototypeOf() === owner.objectPrototype, "repeated done Realm");
    run("var localIterator=new Set([1]).entries();",caller);
    const localYield = resultObject(run("foreignNext.call(localIterator);",caller));
    check(localYield.getPrototypeOf() === caller.objectPrototype && object(own(localYield,"value")).getPrototypeOf() === caller.arrayPrototype, "borrowed next yields local pair");
    check(resultObject(run("foreignNext.call(localIterator);",caller)).getPrototypeOf() === owner.objectPrototype, "borrowed next completion Realm");
    for (const source of ["foreignEntries.call({});", "foreignNext.call({});"]) {
        const error = run(source,caller);
        check(error.type === "throw" && object(error.value).getPrototypeOf() === owner.getErrorPrototype("TypeError"), "iterator error Realm");
    }
}
{
    const realm = fresh(), set = new GuestSet(realm.setPrototype);
    set.data.set({kind:"string",value:"seed"},UNDEFINED);
    seed(realm,"s",{kind:"object",object:set});
    run("var old=s.values();old.next();var fresh=s.values();",realm);
    for (let i=0;i<2000;i++) {
        const key: Value = {kind:"number",value:i};
        set.data.set(key,UNDEFINED);
        set.data.delete(key);
    }
    set.data.set({kind:"string",value:"live"},UNDEFINED);
    const stopped = run("old.next();",realm,50);
    check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "deleted-node traversal budget");
    const freshValue = run("fresh.next().value;",realm,50);
    check(freshValue.type === "normal" && sameValue(freshValue.value,{kind:"string",value:"seed"}), "lazy cursor starts at live head");
}
check(new Realm((_line: string) => {}).setIteratorPrototype.ownPropertyKeys().length === 0, "legacy iterator absent");
console.log("Set iterators passed");

import { Realm } from "../src/realm.js";
import { GuestMap } from "../src/map-object.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function seed(realm: Realm, name: string, value: Value): void { realm.defineScriptGlobal(name, {value, writable: true, configurable: true}); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "map-iterator", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({maxSteps: steps, maxCalls: 64}), prepared.record).completion;
}
function passes(text: string): void {
    const result = run(text);
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
    if (result.type !== "normal") throw new Error("normal object result expected");
    return object(result.value);
}

for (const source of [
    "let m=new Map([['a',1],['b',2]]);let k=m.keys();let v=m.values();let e=m.entries();k.next().value==='a'&&k.next().value==='b'&&k.next().done&&v.next().value===1&&v.next().value===2&&v.next().done&&e.next().value.join(',')==='a,1'&&e.next().value.join(',')==='b,2'&&e.next().done;",
    "let m=new Map([['a',1]]);Map.prototype[Symbol.iterator]===Map.prototype.entries&&m[Symbol.iterator]().next().value.join(',')==='a,1';",
    "let m=new Map([['a',1],['b',2]]);let copy=new Map(m);let o=Object.fromEntries(m);copy!==m&&copy.size===2&&copy.get('a')===1&&copy.get('b')===2&&o.a===1&&o.b===2;",
    "let s=Symbol('s');let k={};let m=new Map([[s,k],[-0,NaN]]);let i=m.entries();let a=i.next().value;let b=i.next().value;a[0]===s&&a[1]===k&&1/b[0]===Infinity&&Number.isNaN(b[1]);",
    "let m=new Map([['a',1]]);let i=m.values();m.set('a',2);m.set('b',3);i.next().value===2&&i.next().value===3&&i.next().done;",
    "let m=new Map([['a',1],['b',2],['c',3]]);let i=m.keys();let a=i.next().value;m.delete('a');m.delete('b');m.set('a',4);m.set('b',5);a==='a'&&i.next().value==='c'&&i.next().value==='a'&&i.next().value==='b'&&i.next().done;",
    "let m=new Map([['a',1],['b',2]]);let i=m.keys();i.next();m.clear();m.set('x',3);m.set('a',4);i.next().value==='x'&&i.next().value==='a'&&i.next().done;",
    "let m=new Map([['a',1]]);let i=m.keys();m.clear();m.set('x',2);i.next().value==='x'&&i.next().done;",
    "let m=new Map();let i=m.keys();m.set('a',1);i.next().value==='a'&&i.next().done;",
    "let m=new Map();let i=m.keys();let a=i.next();m.set('a',1);let b=i.next();a.done&&b.done&&a.value===undefined&&b.value===undefined&&a!==b;",
    "let m=new Map([['a',1]]);let i=m.keys();i.next();m.delete('a');m.set('b',2);i.next().value==='b'&&i.next().done;",
    "let m=new Map([['a',1]]);let i=m.keys();i.next();i.next();m.set('b',2);i.next().done;",
    "let m=new Map([['a',1]]);let i=m.entries();let a=i.next().value;a[0]='changed';a[1]=8;m.get('a')===1&&m.entries().next().value.join(',')==='a,1';",
    "let i=new Map([['a',1]]).keys();let next=i.next;Object.setPrototypeOf(i,null);Object.freeze(i);next.call(i).value==='a'&&next.call(i).done;",
    "let m=new Map([['a',1]]);let keys=m.keys;Object.setPrototypeOf(m,null);keys.call(m).next().value==='a';",
    "let i=new Map().keys();let p=Object.getPrototypeOf(i);let root=Object.getPrototypeOf(p);root===Object.getPrototypeOf(Object.getPrototypeOf([].values()))&&i[Symbol.iterator]()===i&&Object.getOwnPropertyNames(i).length===0&&Object.getOwnPropertySymbols(i).length===0&&Object.prototype.toString.call(i)==='[object Map Iterator]';",
    "let i=new Map([['a',1]]).entries();let r=i.next();let d=Object.getOwnPropertyDescriptor(r,'done');let v=Object.getOwnPropertyDescriptor(r,'value');Object.keys(r).join(',')==='value,done'&&!r.done&&d.writable&&d.enumerable&&d.configurable&&v.writable&&v.enumerable&&v.configurable&&Array.isArray(r.value)&&r.value.length===2;",
    "let p=Object.getPrototypeOf(new Map().keys());let d=Object.getOwnPropertyDescriptor(p,Symbol.toStringTag);let n=Object.getOwnPropertyDescriptor(p,'next');d.value==='Map Iterator'&&!d.writable&&!d.enumerable&&d.configurable&&n.writable&&!n.enumerable&&n.configurable&&n.value.name==='next'&&n.value.length===0;",
    "let m=new Map([['a',1],['b',2]]);let a=m.keys();let b=m.keys();a.next().value==='a'&&a.next().value==='b'&&b.next().value==='a'&&b.next().value==='b';",
]) passes(source);

for (const name of ["keys", "values", "entries"]) {
    passes("let d=Object.getOwnPropertyDescriptor(Map.prototype,'" + name + "');d.value.name==='" + name + "'&&d.value.length===0&&!Object.hasOwn(d.value,'prototype')&&d.writable&&!d.enumerable&&d.configurable;");
    for (const receiver of ["null", "3", "{}", "Map.prototype", "Object.create(Map.prototype)"]) {
        passes("let caught=false;try{Map.prototype['" + name + "'].call(" + receiver + ");}catch(e){caught=e instanceof TypeError;}caught;");
    }
    passes("let caught=false;try{new Map.prototype['" + name + "']();}catch(e){caught=e instanceof TypeError;}caught;");
}
for (const receiver of ["null", "{}", "new Map()", "[].values()", "'x'[Symbol.iterator]()", "Object.create(Object.getPrototypeOf(new Map().keys()))"]) {
    passes("let next=Object.getPrototypeOf(new Map().keys()).next;let caught=false;try{next.call(" + receiver + ");}catch(e){caught=e instanceof TypeError;}caught;");
}
{
    const owner = fresh(), caller = fresh();
    seed(caller, "foreignEntries", own(owner.mapPrototype, "entries"));
    seed(caller, "foreignNext", own(owner.mapIteratorPrototype, "next"));
    seed(caller, "localNext", own(caller.mapIteratorPrototype, "next"));
    const iterator = resultObject(run("var foreignIterator=foreignEntries.call(new Map([['x',1]]));foreignIterator;", caller));
    check(iterator.getPrototypeOf() === owner.mapIteratorPrototype, "iterator factory Realm");
    const yielded = resultObject(run("localNext.call(foreignIterator);", caller));
    check(yielded.getPrototypeOf() === owner.objectPrototype && object(own(yielded, "value")).getPrototypeOf() === owner.arrayPrototype, "yield and pair use captured Realm");
    check(resultObject(run("localNext.call(foreignIterator);", caller)).getPrototypeOf() === caller.objectPrototype, "first done uses next Realm");
    check(resultObject(run("foreignNext.call(foreignIterator);", caller)).getPrototypeOf() === owner.objectPrototype, "repeated done uses next Realm");
    run("var localIterator=new Map([['x',1]]).entries();", caller);
    const localYield = resultObject(run("foreignNext.call(localIterator);", caller));
    check(localYield.getPrototypeOf() === caller.objectPrototype && object(own(localYield, "value")).getPrototypeOf() === caller.arrayPrototype, "borrowed next retains local yielded Realm");
    check(resultObject(run("foreignNext.call(localIterator);", caller)).getPrototypeOf() === owner.objectPrototype, "borrowed next completion Realm");
    for (const source of ["foreignEntries.call({});", "foreignNext.call({});"]) {
        const error = run(source, caller);
        check(error.type === "throw" && object(error.value).getPrototypeOf() === owner.getErrorPrototype("TypeError"), "iterator error Realm");
    }
}
{
    const realm = fresh(), map = new GuestMap(realm.mapPrototype);
    map.data.set({kind: "string", value: "seed"}, {kind: "number", value: 1});
    seed(realm, "m", {kind: "object", object: map});
    run("var old=m.keys();old.next();var fresh=m.keys();", realm);
    for (let i = 0; i < 2000; i++) {
        const key: Value = {kind: "number", value: i};
        map.data.set(key, key);
        map.data.delete(key);
    }
    map.data.set({kind: "string", value: "live"}, {kind: "number", value: 2});
    const stopped = run("old.next();", realm, 50);
    check(stopped.type === "throw" && stopped.origin.kind === "resource-limit", "deleted-node traversal budget");
    const freshValue = run("fresh.next().value;", realm, 50);
    check(freshValue.type === "normal" && sameValue(freshValue.value, {kind: "string", value: "seed"}), "unstarted iterator initializes at live head");
}
check(new Realm((_line: string) => {}).mapIteratorPrototype.ownPropertyKeys().length === 0, "legacy iterator unregistered");
console.log("Map iterators passed");

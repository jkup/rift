import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "map-upsert", text}, realm);
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

for (const source of [
    "let m=new Map();m.getOrInsert('x',1)===1&&m.getOrInsert('x',2)===1&&m.get('x')===1&&m.size===1;",
    "let m=new Map();m.getOrInsert()===undefined&&m.has(undefined)&&m.size===1&&m.getOrInsert(undefined,7)===undefined;",
    "let m=new Map([['x',undefined]]);m.getOrInsertComputed('x',function(){throw 1;})===undefined&&m.size===1;",
    "let m=new Map();let count=0;let result=m.getOrInsertComputed('x',function(k){'use strict';count++;if(this!==undefined||k!=='x')throw 1;return 7;});result===7&&count===1&&m.get('x')===7&&m.getOrInsertComputed('x',function(){throw 2;})===7;",
    "let m=new Map();m.getOrInsertComputed('x',function(){})===undefined&&m.has('x')&&m.getOrInsert('x',7)===undefined;",
    "let m=new Map();let caught=false;try{m.getOrInsertComputed('x',null);}catch(e){caught=e instanceof TypeError;}caught&&!m.has('x');",
    "let m=new Map([['x',1]]);let caught=false;try{m.getOrInsertComputed('x',7);}catch(e){caught=e instanceof TypeError;}caught&&m.get('x')===1;",
    "let m=new Map();let k={toString:function(){throw 1;},valueOf:function(){throw 2;}};let v={};m.getOrInsert(k,v)===v&&m.getOrInsert(k,0)===v&&m.get(k)===v;",
    "let m=new Map();let k={};k[Symbol.toPrimitive]=function(){throw 1;};m.getOrInsertComputed(k,function(x){return x;})===k&&m.get(k)===k;",
    "let m=new Map();m.getOrInsert(NaN,1);m.getOrInsert(NaN,2)===1&&m.size===1;",
    "let m=new Map();m.getOrInsert(-0,1);m.getOrInsert(0,2)===1&&1/m.keys().next().value===Infinity;",
    "let m=new Map();m.getOrInsertComputed(-0,function(k){return 1/k;})===Infinity&&m.get(0)===Infinity&&1/m.keys().next().value===Infinity;",
    "let m=new Map();let s=Symbol();m.getOrInsert(s,1);m.getOrInsert('1',2);m.getOrInsert(1,3);m.size===3&&m.get(s)===1&&m.get('1')===2&&m.get(1)===3;",
    "let m=new Map([['a',1]]);let r=m.getOrInsertComputed('x',function(k){m.set(k,2);m.set('b',3);return 9;});let i=m.keys();r===9&&m.get('x')===9&&m.size===3&&i.next().value==='a'&&i.next().value==='x'&&i.next().value==='b'&&i.next().done;",
    "let m=new Map([['a',1]]);let r=m.getOrInsertComputed('x',function(k){m.set(k,2);m.delete(k);m.set('b',3);return 9;});let i=m.keys();r===9&&m.get('x')===9&&i.next().value==='a'&&i.next().value==='b'&&i.next().value==='x'&&i.next().done;",
    "let m=new Map([['a',1]]);let r=m.getOrInsertComputed('x',function(k){m.clear();m.set('b',3);return 9;});let i=m.keys();r===9&&m.size===2&&i.next().value==='b'&&i.next().value==='x'&&i.next().done;",
    "let m=new Map();let r=m.getOrInsertComputed('x',function(k){return m.getOrInsertComputed(k,function(){return 2;})+1;});r===3&&m.get('x')===3&&m.size===1;",
    "let m=new Map();let marker={};let caught=false;try{m.getOrInsertComputed('x',function(k){m.set(k,2);throw marker;});}catch(e){caught=e===marker;}caught&&m.get('x')===2;",
    "let m=new Map();let marker={};let caught=false;try{m.getOrInsertComputed('x',function(){throw marker;});}catch(e){caught=e===marker;}caught&&!m.has('x');",
    "let m=new Map([['a',1]]);let i=m.keys();i.next();m.getOrInsertComputed('x',function(){m.clear();m.set('b',2);return 3;});i.next().value==='b'&&i.next().value==='x'&&i.next().done;",
    "let m=Object.freeze(new Map());m.getOrInsert('x',1)===1&&m.getOrInsertComputed('y',function(){return 2;})===2&&m.size===2;",
    "let m=new Map();let a=m.getOrInsert;let b=m.getOrInsertComputed;let get=m.get;Object.setPrototypeOf(m,null);a.call(m,'x',1)===1&&b.call(m,'y',function(){return 2;})===2&&get.call(m,'y')===2;",
    "let m=new Map();let get=m.get;m.get=function(){throw 1;};m.has=function(){throw 2;};m.set=function(){throw 3;};m.getOrInsert('x',1)===1&&m.getOrInsertComputed('y',function(){return 2;})===2&&get.call(m,'y')===2;",
]) passes(source);
for (const name of ["getOrInsert", "getOrInsertComputed"]) {
    passes("let d=Object.getOwnPropertyDescriptor(Map.prototype,'"+name+"');d.value.name==='"+name+"'&&d.value.length===2&&!Object.hasOwn(d.value,'prototype')&&d.writable&&!d.enumerable&&d.configurable;");
    for (const receiver of ["null", "undefined", "1", "{}", "Map.prototype", "Object.create(Map.prototype)"]) {
        const result = run("Map.prototype."+name+".call("+receiver+",'x',function(){throw 1;});");
        check(result.type === "throw" && result.diagnostic.name === "TypeError", "Map brand " + name);
    }
    const constructed = run("new Map.prototype."+name+"();");
    check(constructed.type === "throw" && constructed.diagnostic.name === "TypeError", "not constructible " + name);
    const owner = fresh(), caller = fresh();
    caller.defineScriptGlobal("foreign", {value: own(owner.mapPrototype,name)});
    passes("let m=new Map();foreign.call(m,'x',"+(name === "getOrInsert" ? "7" : "function(){return 7;}")+")===7&&m.get('x')===7;",caller);
    const error = run("foreign.call({});",caller);
    check(error.type === "throw" && error.value.kind === "object" && error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "error Realm " + name);
    check(new Realm((_line: string) => {}).mapPrototype.getOwnProperty(name) === undefined, "legacy method absent");
}
for (const source of [
    "let m=new Map();m.getOrInsertComputed('x',function(){while(true){}});",
    "let m=new Map();while(true){m.getOrInsert('x',1);}",
    "let m=new Map();function f(){return m.getOrInsertComputed('x',f);}m.getOrInsertComputed('x',f);",
]) {
    const result = run(source, fresh(), 300);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "bounded insertion");
}
console.log("Map insert-if-absent methods passed");

import { Realm } from "../src/realm.js";
import { GuestMap } from "../src/map-object.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
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
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({ id: "map-object", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
function passes(text: string): void {
    const result = run(text);
    check(
        result.type === "normal" && sameValue(result.value, { kind: "boolean", value: true }),
        text,
    );
}
function own(object: GuestObject, key: string): Value {
    const descriptor = object.getOwnProperty(key);
    if (descriptor === undefined || descriptor.kind !== "data") {
        throw new Error("own " + key);
    }
    return descriptor.value;
}
function object(value: Value): GuestObject {
    if (value.kind !== "object") {
        throw new Error("object value");
    }
    return value.object;
}

for (const source of [
    "let m=new Map();m instanceof Map&&m.size===0&&m.set('a',1)===m&&m.get('a')===1&&m.has('a')&&!m.has('b')&&m.size===1;",
    "let m=new Map([['a',1],['b',2],['a',3]]);m.size===2&&m.get('a')===3&&m.get('b')===2;",
    "new Map(null).size===0&&new Map(undefined).size===0&&new Map('').size===0;",
    "let m=new Map();m.set();m.has(undefined)&&m.get(undefined)===undefined&&m.size===1&&m.delete(undefined)&&!m.delete(undefined)&&m.size===0;",
    "let m=new Map();m.set(NaN,1);m.set(NaN,2);m.set(-0,3);m.set(0,4);m.size===2&&m.get(NaN)===2&&m.get(-0)===4;",
    "let m=new Map();m.set(1,'number');m.set('1','string');m.set(false,1);m.set(null,2);m.set(undefined,3);m.size===5&&m.get(1)==='number'&&m.get('1')==='string';",
    "let s=Symbol('x');let t=Symbol('x');let a={};let b={};let m=new Map([[s,1],[t,2],[a,3],[b,4]]);m.size===4&&m.get(s)===1&&m.get(t)===2&&m.get(a)===3&&m.get(b)===4;",
    "let k={toString:function(){throw 1;},valueOf:function(){throw 2;}};k[Symbol.toPrimitive]=function(){throw 3;};let m=new Map([[k,7]]);m.has(k)&&m.get(k)===7&&m.delete(k);",
    "let m=new Map([['a',1]]);Object.freeze(m);m.set('b',2);m.delete('a');m.size===1&&m.get('b')===2&&Object.getOwnPropertyNames(m).length===0;",
    "let m=new Map();let set=m.set;let get=m.get;Object.setPrototypeOf(m,null);set.call(m,'x',1);get.call(m,'x')===1;",
    "let m=new Map([['a',1]]);m.clear()===undefined&&m.size===0&&!m.has('a');",
    "let m=new Map([['a',1],['b',2]]);let trace='';let self={};let result=m.forEach(function(v,k,owner){'use strict';trace+=k+v; if(this!==self||owner!==m)throw 1;},self);trace==='a1b2'&&result===undefined;",
    "let m=new Map([['a',1],['b',2],['c',3]]);let trace='';m.forEach(function(v,k){trace+=k+v;if(k==='a'){m.delete('b');m.set('c',9);m.set('d',4);}});trace==='a1c9d4';",
    "let m=new Map([['a',1],['b',2]]);let trace='';let once=false;m.forEach(function(v,k){trace+=k;if(!once){once=true;m.clear();m.set('x',3);m.set('a',4);}});trace==='axa';",
    "let m=new Map([['a',1],['b',2]]);let trace='';let once=false;m.forEach(function(v,k){trace+=k;if(!once){once=true;m.delete('a');m.set('a',3);}});trace==='aba';",
    "let m=new Map([[0,1]]);let positive=false;m.forEach(function(v,k){positive=1/k===Infinity;});positive;",
    "let m=new Map([['a',1]]);let n=0;m.forEach(function(v,k){m.forEach(function(){n++;});});n===1;",
    "let marker={};let caught=false;try{new Map([['x',1]]).forEach(function(){throw marker;});}catch(e){caught=e===marker;}caught;",
    "let seen='';Object.defineProperty(Map.prototype,'set',{get:function(){seen+='s';return function(k,v){seen+='a'+k+v;};}});let input={};input[Symbol.iterator]=function(){seen+='i';return [['x',1]][Symbol.iterator]();};new Map(input);seen==='siax1';",
    "let seen=0;Object.defineProperty(Map.prototype,'set',{get:function(){seen++;throw 1;}});new Map();new Map(null);new Map(undefined);seen===0;",
    "let input={};let seen=0;input[Symbol.iterator]=function(){seen++;throw 1;};Map.prototype.set=7;let caught=false;try{new Map(input);}catch(e){caught=e instanceof TypeError;}caught&&seen===0;",
    "let calls=0;let original=Map.prototype.set;Map.prototype.set=function(k,v){calls++;Map.prototype.set=function(){throw 1;};return original.call(this,k,v);};let m=new Map([['a',1],['b',2]]);calls===2&&m.get('a')===1&&m.get('b')===2;",
    "let trace='';let e={};Object.defineProperty(e,'0',{get:function(){trace+='k';return 'x';}});Object.defineProperty(e,'1',{get:function(){trace+='v';return 1;}});let original=Map.prototype.set;Map.prototype.set=function(k,v){trace+='s';return original.call(this,k,v);};new Map([e]);trace==='kvs';",
    "let m=new Map([{}]);m.size===1&&m.has(undefined)&&m.get(undefined)===undefined;",
    "let p={0:'x',1:2};new Map([Object.create(p)]).get('x')===2;",
    "Map.name==='Map'&&Map.length===0&&Map.prototype.constructor===Map&&Map[Symbol.species]===Map;",
    "let d=Object.getOwnPropertyDescriptor(Map,Symbol.species);let x={};d.get.call(x)===x&&d.get.name==='get [Symbol.species]'&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable;",
    "let d=Object.getOwnPropertyDescriptor(Map.prototype,'size');d.get.name==='get size'&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable;",
    "Object.prototype.toString.call(new Map())==='[object Map]'&&Object.prototype.toString.call(Map.prototype)==='[object Map]';",
    "'use strict';let m=new Map();let caught=false;try{m.size=9;}catch(e){caught=e instanceof TypeError;}caught&&!Object.hasOwn(m,'size')&&m.size===0;",
    "let m=new Map();m.size=9;!Object.hasOwn(m,'size')&&m.size===0;",
]) {
    passes(source);
}

for (const name of ["get", "set", "has", "delete", "clear", "forEach"]) {
    let length: 0 | 1 | 2;
    if (name === "set") {
        length = 2;
    } else if (name === "clear") {
        length = 0;
    } else {
        length = 1;
    }
    passes(
        "let f=Map.prototype['" +
            name +
            "'];let d=Object.getOwnPropertyDescriptor(Map.prototype,'" +
            name +
            "');f.name==='" +
            name +
            "'&&f.length===" +
            length +
            "&&!Object.hasOwn(f,'prototype')&&d.writable&&!d.enumerable&&d.configurable;",
    );
    for (const receiver of [
        "undefined",
        "null",
        "3",
        "{}",
        "Map.prototype",
        "Object.create(Map.prototype)",
    ]) {
        passes(
            "let caught=false;try{Map.prototype['" +
                name +
                "'].call(" +
                receiver +
                ");}catch(e){caught=e instanceof TypeError;}caught;",
        );
    }
}
for (const source of [
    "Map();",
    "Map.call({});",
    "new Map(7);",
    "new Map({});",
    "new Map('x');",
    "new Map([3]);",
    "new Map().forEach(7);",
    "Object.getOwnPropertyDescriptor(Map.prototype,'size').get.call(Map.prototype);",
]) {
    passes("let caught=false;try{" + source + "}catch(e){caught=e instanceof TypeError;}caught;");
}
for (const failure of [
    "Object.defineProperty(entry,'0',{get:function(){throw marker;}});",
    "Object.defineProperty(entry,'1',{get:function(){throw marker;}});",
    "Map.prototype.set=function(){throw marker;};",
]) {
    passes(
        "let marker={};let entry={0:'x',1:1};" +
            failure +
            "let closed=0;let i={next:function(){return {done:false,value:entry};}};i['return']=function(){closed++;throw 9;};let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{new Map(a);}catch(e){caught=e===marker;}caught&&closed===1;",
    );
}
passes(
    "let marker={};let closed=0;let i={next:function(){throw marker;}};i['return']=function(){closed++;return {};};let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{new Map(a);}catch(e){caught=e===marker;}caught&&closed===0;",
);
{
    const owner = fresh(),
        caller = fresh();
    caller.defineScriptGlobal("ForeignMap", { value: own(owner.globalObject, "Map") });
    caller.defineScriptGlobal("foreignGet", { value: own(owner.mapPrototype, "get") });
    const result = run("var m=new ForeignMap([['x',1]]);m;", caller);
    check(
        result.type === "normal" &&
            result.value.kind === "object" &&
            result.value.object instanceof GuestMap &&
            result.value.object.getPrototypeOf() === owner.mapPrototype,
        "Map allocation Realm",
    );
    const read = run("Map.prototype.get.call(m,'x');", caller);
    check(
        read.type === "normal" && sameValue(read.value, { kind: "number", value: 1 }),
        "cross-Realm Map brand",
    );
    for (const source of ["ForeignMap();", "new ForeignMap([3]);", "foreignGet.call({});"]) {
        const error = run(source, caller);
        check(
            error.type === "throw" &&
                object(error.value).getPrototypeOf() === owner.getErrorPrototype("TypeError"),
            "Map error Realm",
        );
    }
    check(
        owner.mapPrototype !== caller.mapPrototype &&
            own(owner.mapPrototype, "set") !== own(caller.mapPrototype, "set"),
        "fresh Map roots and methods",
    );
}
for (const source of [
    "let m=new Map([['x',1]]);m.forEach(function(v,k){m.delete(k);m.set(k,v);});",
    "let a={};a[Symbol.iterator]=function(){return {next:function(){return {done:false,value:['x',1]};}};};new Map(a);",
]) {
    const result = run(source, fresh(), 300);
    check(
        result.type === "throw" && result.origin.kind === "resource-limit",
        "Map work is bounded",
    );
}
check(
    new Realm((_line: string) => {}).global.bindings.get("Map") === undefined,
    "legacy Map absent",
);
console.log("Map ordinary methods passed");

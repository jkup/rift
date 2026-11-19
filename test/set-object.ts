import { Realm } from "../src/realm.js";
import { GuestSet } from "../src/set-object.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "set-object", text}, realm);
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
    "let s=new Set();s.size===0&&Object.getPrototypeOf(s)===Set.prototype&&s instanceof Set&&Object.keys(s).length===0;",
    "let s=new Set([3,1,3,2]);let order='';s.forEach(function(v){order+=v;});s.size===3&&order==='312'&&s.has(1)&&!s.has(9);",
    "let s=new Set();s.add(1)===s&&s.add(1)===s&&s.size===1&&s.delete(1)&&!s.delete(1)&&s.size===0;",
    "let s=new Set([1,2]);s.clear()===undefined&&s.size===0&&!s.has(1)&&s.add(3)===s&&s.size===1;",
    "let s=new Set();s.add();s.size===1&&s.has()&&s.delete();",
    "let a={};let b={};let x=Symbol('x');let y=Symbol('x');let s=new Set([1,'1',true,null,undefined,a,b,a,x,y,x]);s.size===9&&s.has(a)&&s.has(b)&&s.has(x)&&s.has(y)&&!s.has({});",
    "let k={toString:function(){throw 1;},valueOf:function(){throw 2;}};let s=new Set([k]);s.has(k)&&s.delete(k);",
    "let s=new Set([NaN,NaN,-0,0]);let zero=false;s.forEach(function(v){if(v===0)zero=1/v===Infinity;});s.size===2&&s.has(NaN)&&zero;",
    "let s=new Set('abba');s.size===2&&s.has('a')&&s.has('b');",
    "let s=new Set([,,1]);s.size===2&&s.has(undefined)&&s.has(1);",
    "let a=[1];let add=Set.prototype.add;Set.prototype.add=function(v){if(v===1)a.push(2);return add.call(this,v);};let s=new Set(a);s.size===2&&s.has(2);",
    "Object.defineProperty(Set.prototype,'add',{get:function(){throw 1;}});new Set().size===0&&new Set(undefined).size===0&&new Set(null).size===0;",
    "let trace='';let add=Set.prototype.add;Object.defineProperty(Set.prototype,'add',{get:function(){trace+='A';return add;}});let a={};Object.defineProperty(a,Symbol.iterator,{get:function(){trace+='I';return function(){return {next:function(){trace+='N';return {done:true};}};};}});new Set(a).size===0&&trace==='AIN';",
    "let touched=0;Set.prototype.add=7;let a={};Object.defineProperty(a,Symbol.iterator,{get:function(){touched++;throw 1;}});let caught=false;try{new Set(a);}catch(e){caught=e instanceof TypeError;}caught&&touched===0;",
    "let saved=Set.prototype.add;let calls=0;Set.prototype.add=function(v){calls++;Set.prototype.add=function(){throw 1;};return saved.call(this,v);};let s=new Set([1,2]);s.size===2&&calls===2;",
    "let n=0;let i={next:function(){n++;i.next=function(){throw 1;};return {done:n>2,value:n};}};let a={};a[Symbol.iterator]=function(){return i;};let s=new Set(a);s.size===2&&s.has(1)&&s.has(2);",
    "let s=new Set([1,2]);let receiver={};let trace='';let result=s.forEach(function(v,k,collection){'use strict';if(this!==receiver||v!==k||collection!==s)throw 1;trace+=v;},receiver);result===undefined&&trace==='12';",
    "let s=new Set([1]);let ok=false;s.forEach(function(){'use strict';ok=this===undefined;});ok;",
    "let s=new Set([1,2,3]);let trace='';s.forEach(function(v){trace+=v;if(v===1){s.delete(2);s.add(4);}});trace==='134';",
    "let s=new Set([1,2]);let trace='';s.forEach(function(v){trace+=v;if(v===1){s.clear();s.add(3);}});trace==='13';",
    "let s=new Set([1,2]);let trace='';let once=false;s.forEach(function(v){trace+=v;if(!once){once=true;s.delete(1);s.add(1);}});trace==='121';",
    "let s=new Set([1,2]);let trace='';s.forEach(function(v){s.forEach(function(w){trace+=v+':'+w+',';});});trace==='1:1,1:2,2:1,2:2,';",
    "let s=new Set([1,2]);let marker={};let calls=0;let caught=false;try{s.forEach(function(){calls++;throw marker;});}catch(e){caught=e===marker;}caught&&calls===1;",
    "let s=Object.freeze(new Set());s.add(1)===s&&s.has(1)&&s.delete(1);",
    "let s=new Set();let add=s.add;let has=s.has;Object.setPrototypeOf(s,null);add.call(s,1)===s&&has.call(s,1);",
    "let d=Object.getOwnPropertyDescriptor(Set.prototype,'size');d.get.name==='get size'&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable;",
    "let s=new Set();s.size=9;s.size===0&&!Object.hasOwn(s,'size');",
    "'use strict';let s=new Set();let caught=false;try{s.size=9;}catch(e){caught=e instanceof TypeError;}caught&&s.size===0;",
    "let d=Object.getOwnPropertyDescriptor(Set,Symbol.species);let x={};Set[Symbol.species]===Set&&d.get.call(x)===x&&d.get.name==='get [Symbol.species]'&&d.get.length===0&&d.set===undefined&&!d.enumerable&&d.configurable;",
    "let d=Object.getOwnPropertyDescriptor(Set.prototype,Symbol.toStringTag);d.value==='Set'&&!d.writable&&!d.enumerable&&d.configurable&&Object.prototype.toString.call(new Set())==='[object Set]';",
    "Set.length===0&&Set.name==='Set'&&Set.prototype.constructor===Set&&Object.getPrototypeOf(Set)===Object.getPrototypeOf(Map);",
]) passes(source);
for (const name of ["add", "has", "delete", "clear", "forEach"]) {
    passes("let d=Object.getOwnPropertyDescriptor(Set.prototype,'"+name+"');d.value.name==='"+name+"'&&d.value.length==="+(name === "clear" ? 0 : 1)+"&&!Object.hasOwn(d.value,'prototype')&&d.writable&&!d.enumerable&&d.configurable;");
    for (const receiver of ["null", "undefined", "1", "{}", "Set.prototype", "Object.create(Set.prototype)", "new Map()"]) {
        const result = run("Set.prototype."+name+".call("+receiver+");");
        check(result.type === "throw" && result.diagnostic.name === "TypeError", "Set brand " + name);
    }
}
for (const source of ["Set();", "Set.call({});", "new Set(1);", "new Set({});", "new Set().forEach(7);", "Object.getOwnPropertyDescriptor(Set.prototype,'size').get.call(Set.prototype);", "Map.prototype.has.call(new Set(),1);"]) {
    const result = run(source);
    check(result.type === "throw" && result.diagnostic.name === "TypeError", source);
}
passes("let marker={};let closed=0;Set.prototype.add=function(){throw marker;};let i={next:function(){return {done:false,value:1};}};i['return']=function(){closed++;throw 9;};let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{new Set(a);}catch(e){caught=e===marker;}caught&&closed===1;");
for (const step of ["throw marker;", "let r={};Object.defineProperty(r,'done',{get:function(){throw marker;}});return r;", "let r={done:false};Object.defineProperty(r,'value',{get:function(){throw marker;}});return r;"]) {
    passes("let marker={};let closed=0;let i={next:function(){"+step+"}};i['return']=function(){closed++;return {};};let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{new Set(a);}catch(e){caught=e===marker;}caught&&closed===0;");
}
{
    const owner = fresh(), caller = fresh();
    caller.defineScriptGlobal("ForeignSet", {value: own(owner.globalObject,"Set")});
    caller.defineScriptGlobal("foreignHas", {value: own(owner.setPrototype,"has")});
    const result = run("var s=new ForeignSet([1]);s;",caller);
    check(result.type === "normal" && result.value.kind === "object" && result.value.object instanceof GuestSet && result.value.object.getPrototypeOf() === owner.setPrototype, "Set allocation Realm");
    passes("Set.prototype.has.call(s,1)&&foreignHas.call(new Set([1]),1);",caller);
    for (const source of ["ForeignSet();", "new ForeignSet(1);", "foreignHas.call({});"]) {
        const error = run(source,caller);
        check(error.type === "throw" && error.value.kind === "object" && error.value.object.getPrototypeOf() === owner.getErrorPrototype("TypeError"), "Set error Realm");
    }
    check(owner.setPrototype !== caller.setPrototype && own(owner.setPrototype,"add") !== own(caller.setPrototype,"add"), "fresh Set roots");
}
for (const source of [
    "let s=new Set([1]);s.forEach(function(v){s.delete(v);s.add(v);});",
    "let a={};a[Symbol.iterator]=function(){return {next:function(){return {done:false,value:1};}};};new Set(a);",
]) {
    const result = run(source,fresh(),300);
    check(result.type === "throw" && result.origin.kind === "resource-limit", "bounded Set traversal");
}
check(new Realm((_line: string) => {}).global.bindings.get("Set") === undefined, "legacy Set absent");
console.log("Set ordinary methods passed");

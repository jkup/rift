import { Realm } from "../src/realm.js";
import { sameValue, type GuestObject, type Value, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(text: string, realm = fresh(), steps = 10000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "group-by", text}, realm);
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

for (const source of [
    "let g=Object.groupBy([1,2,3,4],function(v){return v%2;});Object.getPrototypeOf(g)===null&&g[0].join(',')==='2,4'&&g[1].join(',')==='1,3';",
    "let g=Map.groupBy([1,2,3,4],function(v){return v%2;});g instanceof Map&&g.size===2&&g.get(0).join(',')==='2,4'&&g.get(1).join(',')==='1,3'&&g.keys().next().value===1;",
    "let g=Object.groupBy([1,2],function(){return '__proto__';});Object.getPrototypeOf(g)===null&&g.__proto__.join(',')==='1,2'&&Object.hasOwn(g,'__proto__');",
    "let g=Object.groupBy([1],function(){return 'x';});let d=Object.getOwnPropertyDescriptor(g,'x');d.writable&&d.enumerable&&d.configurable&&Array.isArray(d.value)&&d.value[0]===1;",
    "let s=Symbol('s');let g=Object.groupBy([1,2],function(){return s;});Object.getOwnPropertySymbols(g)[0]===s&&Object.keys(g).length===0&&g[s].join(',')==='1,2';",
    "let calls=0;let hints='';let key={};key[Symbol.toPrimitive]=function(h){calls++;hints+=h;return 'x';};let g=Object.groupBy([1,2],function(){return key;});calls===2&&hints==='stringstring'&&g.x.join(',')==='1,2';",
    "let a={toString:function(){throw 1;}};let b={};let g=Map.groupBy([a,b,a],function(v){return v;});g.size===2&&g.get(a).length===2&&g.get(a)[0]===a&&g.get(b)[0]===b;",
    "let g=Map.groupBy([NaN,NaN,-0,0,1,'1'],function(v){return v;});let i=g.keys();Number.isNaN(i.next().value)&&1/i.next().value===Infinity&&g.size===4&&g.get(NaN).length===2&&g.get(0).length===2&&g.get(1)[0]===1&&g.get('1')[0]==='1';",
    "let g=Object.groupBy([2,1,2],function(v){return v;});Object.keys(g).join(',')==='1,2'&&g[2].length===2;",
    "let value={x:1};let g=Object.groupBy([value],function(){return 'x';});value.x=2;g.x[0]===value&&g.x[0].x===2;",
    "let g=Object.groupBy('aab',function(v){return v;});g.a.join('')==='aa'&&g.b[0]==='b';",
    "let g=Map.groupBy('aab',function(v){return v;});g.get('a').join('')==='aa'&&g.get('b')[0]==='b';",
    "let a=[,,1];let g=Object.groupBy(a,function(v){return typeof v;});g.undefined.length===2&&Object.hasOwn(g.undefined,0)&&Object.hasOwn(g.undefined,1)&&g.number[0]===1;",
    "let a=[1];let g=Object.groupBy(a,function(v,i){if(i===0)a.push(2);return 'x';});g.x.join(',')==='1,2';",
    "let g=Object.groupBy.call(null,[1],function(){return 'x';});Object.getPrototypeOf(g)===null&&g.x[0]===1;",
    "let g=Map.groupBy.call(function(){throw 1;},[1],function(){return 'x';});g instanceof Map&&g.get('x')[0]===1;",
    "let group=Map.groupBy;let proto=Map.prototype;Map.prototype.set=function(){throw 1;};Object.defineProperty(Map,Symbol.species,{get:function(){throw 2;}});Map=function(){throw 3;};Array=function(){throw 4;};let g=group([1,2],function(){return 'x';});Object.getPrototypeOf(g)===proto&&g.get('x').join(',')==='1,2';",
    "Object.defineProperty(Array.prototype,'0',{set:function(v){throw 1;},get:function(){throw 2;}});let g=Object.groupBy([7],function(){return 'x';});g.x[0]===7&&Object.hasOwn(g.x,'0');",
]) passes(source);

for (const owner of ["Object", "Map"]) {
    passes("let d=Object.getOwnPropertyDescriptor(" + owner + ",'groupBy');d.value.name==='groupBy'&&d.value.length===2&&!Object.hasOwn(d.value,'prototype')&&d.writable&&!d.enumerable&&d.configurable;");
    passes("let calls=0;let g=" + owner + ".groupBy([],function(){calls++;});calls===0&&" + (owner === "Object" ? "Object.keys(g).length===0&&Object.getPrototypeOf(g)===null" : "g.size===0") + ";");
    passes("let trace='';" + owner + ".groupBy([8,9],function(v,i){'use strict';if(this!==undefined)throw 1;trace+=v+':'+i+',';return 'x';});trace==='8:0,9:1,';");
    passes("let touched=0;let a={};Object.defineProperty(a,Symbol.iterator,{get:function(){touched++;throw 1;}});let caught=false;try{" + owner + ".groupBy(a,7);}catch(e){caught=e instanceof TypeError;}caught&&touched===0;");
    passes("let n=0;let i={next:function(){n++;return {done:n>2,value:n};}};let a={};a[Symbol.iterator]=function(){return i;};let g=" + owner + ".groupBy(a,function(v){i.next=function(){throw 1;};return 'x';});" + (owner === "Object" ? "g.x" : "g.get('x')") + ".join(',')==='1,2';");
    for (const source of ["undefined,function(){}", "null,function(){}", "1,function(){}", "{},function(){}", "[],null"]) {
        passes("let caught=false;try{" + owner + ".groupBy(" + source + ");}catch(e){caught=e instanceof TypeError;}caught;");
    }
    passes("let marker={};let closed=0;let i={next:function(){return {done:false,value:1};}};i['return']=function(){closed++;throw 9;};let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{" + owner + ".groupBy(a,function(){throw marker;});}catch(e){caught=e===marker;}caught&&closed===1;");
    for (const step of [
        "throw marker;",
        "let r={};Object.defineProperty(r,'done',{get:function(){throw marker;}});return r;",
        "let r={done:false};Object.defineProperty(r,'value',{get:function(){throw marker;}});return r;",
    ]) {
        passes("let marker={};let closed=0;let i={next:function(){" + step + "}};i['return']=function(){closed++;return {};};let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{" + owner + ".groupBy(a,function(){return 'x';});}catch(e){caught=e===marker;}caught&&closed===0;");
    }
    const loop = run("let a={};a[Symbol.iterator]=function(){return {next:function(){return {done:false,value:1};}};};" + owner + ".groupBy(a,function(){return 'x';});", fresh(), 300);
    check(loop.type === "throw" && loop.origin.kind === "resource-limit", "grouping budget " + owner);
    const cleanup = run("let i={next:function(){return {done:false,value:1};}};i['return']=function(){while(true){}};let a={};a[Symbol.iterator]=function(){return i;};try{" + owner + ".groupBy(a,function(){throw 1;});}catch(e){true;}", fresh(), 300);
    check(cleanup.type === "throw" && cleanup.origin.kind === "resource-limit", "cleanup cannot hide engine stop " + owner);
}
passes("let marker={};let key={toString:function(){throw marker;}};let closed=0;let i={next:function(){return {done:false,value:1};}};i['return']=function(){closed++;return 3;};let a={};a[Symbol.iterator]=function(){return i;};let caught=false;try{Object.groupBy(a,function(){return key;});}catch(e){caught=e===marker;}caught&&closed===1;");
{
    const realm = fresh();
    const source = "var closed=0;let i={next:function(){return {done:false,value:1};}};i['return']=function(){closed++;return {};};let a={};a[Symbol.iterator]=function(){return i;};Object.groupBy(a,function(){let x=[1];x.constructor={};x.constructor[Symbol.species]=function(){};x.map(function(v){return v;});});";
    const result = run(source, realm);
    check(result.type === "throw" && result.origin.kind === "unsupported-operation" && sameValue(own(realm.globalObject, "closed"), {kind: "number", value: 0}), "unsupported callback stops without cleanup");
}
{
    const owner = fresh(), caller = fresh();
    for (const name of ["Object", "Map"]) {
        caller.defineScriptGlobal("group", {value: own(object(own(owner.globalObject, name)), "groupBy"), writable: true, configurable: true});
        const result = run("group([1,2],function(){return 'x';});", caller);
        check(result.type === "normal", "foreign grouping result");
        if (result.type !== "normal") throw new Error("normal grouping result");
        const grouped = object(result.value);
        check(grouped.getPrototypeOf() === (name === "Map" ? owner.mapPrototype : null), "grouped result prototype");
        caller.defineScriptGlobal("grouped", {value: result.value, writable: true, configurable: true});
        const elements = run(name === "Map" ? "grouped.get('x');" : "grouped.x;", caller);
        check(elements.type === "normal" && object(elements.value).getPrototypeOf() === owner.arrayPrototype, "group array Realm");
        const error = run("group([],null);", caller);
        check(error.type === "throw" && object(error.value).getPrototypeOf() === owner.getErrorPrototype("TypeError"), "grouping error Realm");
    }
}
console.log("Object and Map grouping passed");

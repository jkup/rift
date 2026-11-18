import { Realm } from "../src/realm.js";
import { sameValue } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string) {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "weak-map-object", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare " + text);
    return evaluateScript(createScriptSession({ maxSteps: 10000, maxCalls: 64 }), prepared.record).completion;
}

const cases = [
    "let k={},m=new WeakMap();m.set(k,undefined)===m&&m.has(k)&&m.get(k)===undefined&&m.delete(k)&&!m.has(k)&&!m.delete(k);",
    "let a={},b={},f=function(){};let m=new WeakMap([[a,1],[b,2],[a,3],[f,4]]);m.get(a)===3&&m.get(b)===2&&m.get(f)===4&&!m.has({});",
    "let m=new WeakMap();[undefined,null,false,1,NaN,'x',1n,Symbol.for('x')].every(k=>m.get(k)===undefined&&!m.has(k)&&!m.delete(k));",
    "let k={toString(){throw 1},valueOf(){throw 2},[Symbol.toPrimitive](){throw 3}};let m=new WeakMap([[k,7]]);m.get(k)===7&&m.delete(k);",
    "let m=new WeakMap(),k={};Object.freeze(m);m.set(k,m);m.get(k)===m&&Object.getOwnPropertyNames(m).length===0;",
    "class Sub extends WeakMap{};let k={},m=new Sub([[k,5]]);m instanceof Sub&&m instanceof WeakMap&&m.get(k)===5;",
    "let k={},m=new WeakMap([[k,1]]),get=m.get;Object.setPrototypeOf(m,null);get.call(m,k)===1;",
    "let p=WeakMap.prototype;Object.getPrototypeOf(p)===Object.prototype&&Object.prototype.toString.call(new WeakMap())==='[object WeakMap]'&&!('size' in p)&&!('clear' in p)&&!(Symbol.iterator in p)&&!(Symbol.species in WeakMap);",
    "let original=WeakMap.prototype.set;WeakMap.prototype.set=null;let a=new WeakMap(null),b=new WeakMap(undefined),caught=false;try{new WeakMap([])}catch(e){caught=e instanceof TypeError}WeakMap.prototype.set=original;a instanceof WeakMap&&b instanceof WeakMap&&caught;",
    "let trace='',caught=false;try{new WeakMap({[Symbol.iterator](){return {next(){return {done:false,value:[1,2]}},return(){trace+='close';return {}}}}})}catch(e){caught=e instanceof TypeError}caught&&trace==='close';",
];
for (const text of cases) {
    const result = run(text);
    if (result.type !== "normal" || !sameValue(result.value, {kind: "boolean", value: true})) throw new Error(text);
}
for (const source of ["WeakMap();", "WeakMap.prototype.get.call({},{});", "WeakMap.prototype.has.call(WeakMap.prototype,{});", "new WeakMap().set(1,2);", "new WeakMap().set(Symbol.for('x'),2);"]) {
    const result = run("let caught=false;try{" + source + "}catch(e){caught=e instanceof TypeError}caught;");
    if (result.type !== "normal" || !sameValue(result.value, {kind: "boolean", value: true})) throw new Error(source);
}
for (const method of ["get", "has", "delete", "set"]) {
    const result = run("new WeakMap()." + method + "(Symbol('key'),1);");
    if (result.type !== "throw" || result.origin.kind !== "unsupported-operation" || result.origin.capabilityCode !== "runtime.weak-symbol-key") throw new Error("symbol " + method);
}
console.log("weak-map prototype: 19 checks passed");

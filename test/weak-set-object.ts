import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string): ValueCompletion {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "weak-set-object", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: 10000, maxCalls: 64 }), prepared.record)
        .completion;
}
let checks = 0;
for (const text of [
    "let k={},s=new WeakSet();s.add(k)===s&&s.add(k)===s&&s.has(k)&&!s.has({})&&s.delete(k)&&!s.delete(k)&&!s.has(k);",
    "let a={},f=function(){},s=new WeakSet([a,f,a]);s.has(a)&&s.has(f)&&!s.has({});",
    "let s=new WeakSet();[undefined,null,false,1,NaN,'x',1n,Symbol.for('x')].every(k=>!s.has(k)&&!s.delete(k));",
    "let k={[Symbol.toPrimitive](){throw 1}},s=Object.freeze(new WeakSet());s.add(k)===s&&s.has(k)&&Object.getOwnPropertyNames(s).length===0;",
    "class Sub extends WeakSet{};let k={},s=new Sub([k]);s instanceof Sub&&s instanceof WeakSet&&s.has(k);",
    "let k={},s=new WeakSet([k]),has=s.has;Object.setPrototypeOf(s,null);has.call(s,k);",
    "let p=WeakSet.prototype;Object.getPrototypeOf(p)===Object.prototype&&Object.prototype.toString.call(new WeakSet())==='[object WeakSet]'&&!('size' in p)&&!('clear' in p)&&!(Symbol.iterator in p)&&!(Symbol.species in WeakSet);",
    "WeakSet.prototype.add=null;let a=new WeakSet(null),b=new WeakSet(undefined),caught=false;try{new WeakSet([])}catch(e){caught=e instanceof TypeError}a instanceof WeakSet&&b instanceof WeakSet&&caught;",
    "let closed=0,caught=false;try{new WeakSet({[Symbol.iterator](){return {next(){return {done:false,value:1}},return(){closed++;return {}}}}})}catch(e){caught=e instanceof TypeError}caught&&closed===1;",
    "let closed=0,token={},caught=false;try{new WeakSet({[Symbol.iterator](){return {next(){throw token},return(){closed++;return {}}}}})}catch(e){caught=e===token}caught&&closed===0;",
    "let k={},calls=0,original=WeakSet.prototype.add;WeakSet.prototype.add=function(value){calls++;WeakSet.prototype.add=null;return original.call(this,value)};let s=new WeakSet([k,k]);calls===2&&s.has(k);",
    "let token={},caught=false;class Sub extends WeakSet{add(){throw token}}try{new Sub([{}])}catch(e){caught=e===token}caught;",
]) {
    const result = run(text);
    if (result.type !== "normal" || !sameValue(result.value, { kind: "boolean", value: true })) {
        throw new Error(text);
    }
    checks++;
}
for (const text of [
    "WeakSet();",
    "new WeakSet().add(1);",
    "new WeakSet().add(Symbol.for('key'));",
    "WeakSet.prototype.has.call(WeakSet.prototype,{});",
    "WeakSet.prototype.add.call(new WeakMap(),{});",
    "WeakMap.prototype.get.call(new WeakSet(),{});",
]) {
    const result = run(
        "let caught=false;try{" + text + "}catch(e){caught=e instanceof TypeError}caught;",
    );
    if (result.type !== "normal" || !sameValue(result.value, { kind: "boolean", value: true })) {
        throw new Error(text);
    }
    checks++;
}
for (const name of ["add", "has", "delete"]) {
    const result = run("new WeakSet()." + name + "(Symbol());");
    if (
        result.type !== "throw" ||
        result.origin.kind !== "unsupported-operation" ||
        result.origin.capabilityCode !== "runtime.weak-symbol-key"
    ) {
        throw new Error("symbol " + name);
    }
    checks++;
}
console.log("weak-set prototype:", checks, "checks passed");

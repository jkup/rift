import { Realm } from "../src/realm.js";
import { sameValue, type ValueCompletion } from "../src/runtime.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function run(text: string, steps = 10000): ValueCompletion {
    const realm = new Realm((_line: string) => {}, "script");
    const prepared = prepareBoundedScript({ id: "weak-map-upsert", text }, realm);
    if (prepared.kind !== "ready") {
        throw new Error("prepare " + text);
    }
    return evaluateScript(createScriptSession({ maxSteps: steps, maxCalls: 64 }), prepared.record)
        .completion;
}
for (const text of [
    "let k={},m=new WeakMap();m.getOrInsert(k,1)===1&&m.getOrInsert(k,2)===1&&m.get(k)===1;",
    "let k={},m=new WeakMap([[k,undefined]]);m.getOrInsert(k,7)===undefined&&m.getOrInsertComputed(k,()=>{throw 1})===undefined;",
    "let k={},m=new WeakMap(),calls=0;let v=m.getOrInsertComputed(k,function(key){'use strict';calls++;if(this!==undefined||key!==k)throw 1;return 7});v===7&&calls===1&&m.get(k)===7;",
    "let k={},m=new WeakMap();m.getOrInsertComputed(k,()=>{})===undefined&&m.has(k)&&m.getOrInsert(k,7)===undefined;",
    "let k={},m=new WeakMap([[k,1]]),caught=false;try{m.getOrInsertComputed(k,null)}catch(e){caught=e instanceof TypeError}caught&&m.get(k)===1;",
    "let k={},m=new WeakMap();let v=m.getOrInsertComputed(k,key=>{m.set(key,2);return 9});v===9&&m.get(k)===9;",
    "let k={},m=new WeakMap();let v=m.getOrInsertComputed(k,key=>{m.set(key,2);m.delete(key);return 9});v===9&&m.get(k)===9;",
    "let k={},m=new WeakMap();let v=m.getOrInsertComputed(k,key=>m.getOrInsertComputed(key,()=>2)+1);v===3&&m.get(k)===3;",
    "let k={},m=new WeakMap(),token={},caught=false;try{m.getOrInsertComputed(k,key=>{m.set(key,2);throw token})}catch(e){caught=e===token}caught&&m.get(k)===2;",
    "let k={},m=new WeakMap(),token={},caught=false;try{m.getOrInsertComputed(k,()=>{throw token})}catch(e){caught=e===token}caught&&!m.has(k);",
    "let k={[Symbol.toPrimitive](){throw 1}},m=Object.freeze(new WeakMap());m.getOrInsertComputed(k,key=>key)===k&&m.get(k)===k;",
    "let k={},m=new WeakMap(),insert=m.getOrInsert;Object.setPrototypeOf(m,null);insert.call(m,k,3)===3;",
]) {
    const result = run(text);
    if (result.type !== "normal" || !sameValue(result.value, { kind: "boolean", value: true })) {
        throw new Error(text);
    }
}
for (const name of ["getOrInsert", "getOrInsertComputed"]) {
    for (const source of [
        "WeakMap.prototype." + name + ".call({},{});",
        "new WeakMap()." + name + "(1,()=>1);",
        "new WeakMap()." + name + "(Symbol.for('key'),()=>1);",
    ]) {
        const result = run(
            "let caught=false;try{" + source + "}catch(e){caught=e instanceof TypeError}caught;",
        );
        if (
            result.type !== "normal" ||
            !sameValue(result.value, { kind: "boolean", value: true })
        ) {
            throw new Error(source);
        }
    }
    const symbol = run("new WeakMap()." + name + "(Symbol(),()=>1);");
    if (
        symbol.type !== "throw" ||
        symbol.origin.kind !== "unsupported-operation" ||
        symbol.origin.capabilityCode !== "runtime.weak-symbol-key"
    ) {
        throw new Error("symbol " + name);
    }
}
const bounded = run("new WeakMap().getOrInsertComputed({},()=>{while(true){}});", 300);
if (bounded.type !== "throw" || bounded.origin.kind !== "resource-limit") {
    throw new Error("bounded callback");
}
console.log("weak-map upsert: 21 checks passed");

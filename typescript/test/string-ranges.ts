import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";
import type { ValueCompletion } from "../src/runtime.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function run(realm: Realm, text: string, maxSteps = 100000): ValueCompletion {
    const prepared = prepareBoundedScript({id: "string-ranges", text}, realm);
    if (prepared.kind !== "ready") throw new Error("prepare ranges: " + text);
    return evaluateScript(createScriptSession({maxSteps, maxCalls: 64}), prepared.record).completion;
}
const cases = [
    ["'abcdef'.substring()", "abcdef"], ["'abcdef'.substr()", "abcdef"],
    ["'abcdef'.substring(2)", "cdef"], ["'abcdef'.substr(2)", "cdef"],
    ["'abcdef'.substring(4,1)", "bcd"], ["'abcdef'.substr(4,1)", "e"],
    ["'abcdef'.substring(-3,2)", "ab"], ["'abcdef'.substr(-3,2)", "de"],
    ["'abcdef'.substring(2,-1)", "ab"], ["'abcdef'.substr(2,-1)", ""],
    ["'abcdef'.substring(Infinity,2)", "cdef"], ["'abcdef'.substr(Infinity,2)", ""],
    ["'abcdef'.substring(-Infinity,Infinity)", "abcdef"], ["'abcdef'.substr(-Infinity,Infinity)", "abcdef"],
    ["'abcdef'.substring(NaN,2)", "ab"], ["'abcdef'.substr(NaN,2)", "ab"],
    ["'abcdef'.substring(1.9,3.9)", "bc"], ["'abcdef'.substr(1.9,3.9)", "bcd"],
    ["'abcdef'.substring(2,undefined)", "cdef"], ["'abcdef'.substr(2,undefined)", "cdef"],
    ["'abcdef'.substr(-99,99)", "abcdef"], ["'abcdef'.substr(-0,0)", ""],
    ["String.prototype.substring.call(12345,1,3)", "23"], ["String.prototype.substr.call(12345,1,3)", "234"],
    ["var log='';var r={toString(){log+='r';return 'abc'}},s={valueOf(){log+='s';return 1}},n={valueOf(){log+='n';return 1}};String.prototype.substr.call(r,s,n)+':'+log", "b:rsn"],
    ["var log='';var r={toString(){log+='r';return 'abc'}},s={valueOf(){log+='s';return 2}},n={valueOf(){log+='n';return 1}};String.prototype.substring.call(r,s,n)+':'+log", "b:rsn"],
    ["var marker={};try{''.substr(Infinity,{valueOf(){throw marker}})}catch(e){e===marker?'same':'wrong'}", "same"],
    ["var marker={};try{''.substring(Infinity,{valueOf(){throw marker}})}catch(e){e===marker?'same':'wrong'}", "same"],
    ["'😀'.substring(0,1)", "\ud83d"], ["'😀'.substr(1,1)", "\ude00"],
    ["'a\0b'.substring(1,2)", "\0"], ["'a\0b'.substr(1,1)", "\0"],
];
for (const [source, expected] of cases) {
    const result = run(fresh(), source);
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected) throw new Error(source);
}
for (const name of ["substring", "substr"]) {
    for (const call of [".call(null)", ".call(undefined)", ".call(Symbol())", ".call('a',Symbol())", ".call('a',0,Symbol())"]) {
        const result = run(fresh(), "try{String.prototype."+name+call+"}catch(e){e.name}");
        if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== "TypeError") throw new Error(name+call);
    }
    const metadata = run(fresh(), "var d=Object.getOwnPropertyDescriptor(String.prototype,'"+name+"'),r='';try{new d.value()}catch(e){r=e.name}d.value.name+':'+d.value.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r");
    if (metadata.type !== "normal" || metadata.value.kind !== "string" || metadata.value.value !== name+":2:true:false:true:TypeError") throw new Error("range metadata");
    const realm = fresh();
    realm.defineScriptGlobal("input", {value: {kind: "string", value: "x".repeat(2000)}});
    const bounded = run(realm, "try{input."+name+"()}catch(e){'caught'}", 50);
    if (bounded.type !== "throw" || bounded.origin.kind !== "resource-limit") throw new Error("range budget");
}
console.log("String ranges passed");

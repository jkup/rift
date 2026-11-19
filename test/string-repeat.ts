import { Realm } from "../src/realm.js";
import { prepareBoundedScript } from "../src/script-record.js";
import { createScriptSession, evaluateScript } from "../src/script-execution.js";

function fresh(): Realm { return new Realm((_line: string) => {}, "script"); }
function string(text: string, expected: string, realm: Realm = fresh()): void {
    const prepared = prepareBoundedScript({ id: "string-repeat", text }, realm);
    if (prepared.kind !== "ready") throw new Error("prepare: " + text);
    const result = evaluateScript(createScriptSession(), prepared.record).completion;
    if (result.type !== "normal" || result.value.kind !== "string" || result.value.value !== expected)
        throw new Error(text + " expected " + expected);
}
const cases: { source: string; expected: string }[] = [
    { source: "'ab'.repeat(3)", expected: "ababab" },
    { source: "'ab'.repeat(2.9)", expected: "abab" },
    { source: "'ab'.repeat('2')", expected: "abab" },
    { source: "'ab'.repeat(true)", expected: "ab" },
    { source: "'ab'.repeat()+'x'+'ab'.repeat(NaN)+'ab'.repeat(null)+'ab'.repeat(-0.5)", expected: "x" },
    { source: "''.repeat(1e300)", expected: "" },
    { source: "String.prototype.repeat.call(12,2)", expected: "1212" },
    { source: "String.prototype.repeat.call(new String('ab'),2)", expected: "abab" },
    { source: "'😀'.repeat(3)", expected: "😀😀😀" },
    { source: "var s='\\ud800'.repeat(2);s.length+':'+s.charCodeAt(0)+':'+s.charCodeAt(1)", expected: "2:55296:55296" },
    { source: "var order='',s={toString(){order+='s';return 'ab'}},n={valueOf(){order+='n';return 2}};String.prototype.repeat.call(s,n)+':'+order", expected: "abab:sn" },
    { source: "var order='',s={toString(){order+='s';throw 7}},n={valueOf(){order+='bad';return 0}},r='';try{String.prototype.repeat.call(s,n)}catch(e){r=String(e)}r+':'+order", expected: "7:s" },
    { source: "var order='',n={valueOf(){order+='bad';return 0}},r='';try{String.prototype.repeat.call(null,n)}catch(e){r=e.name}r+':'+order", expected: "TypeError:" },
    { source: "var r='';try{''.repeat({valueOf(){throw 7}})}catch(e){r=String(e)}r", expected: "7" },
    { source: "var d=Object.getOwnPropertyDescriptor(String.prototype,'repeat'),r='';try{new String.prototype.repeat()}catch(e){r=e.name}String.prototype.repeat.name+':'+String.prototype.repeat.length+':'+d.writable+':'+d.enumerable+':'+d.configurable+':'+r", expected: "repeat:1:true:false:true:TypeError" },
];
for (const c of cases) string(c.source, c.expected);
for (const source of ["'x'.repeat(-1)", "'x'.repeat(-Infinity)", "'x'.repeat(Infinity)", "''.repeat(Infinity)", "''.repeat(-1)"])
    string("var r='';try{" + source + "}catch(e){r=e.name}r", "RangeError");
for (const source of ["'x'.repeat(Symbol())", "String.prototype.repeat.call(Symbol(),0)", "String.prototype.repeat.call(undefined,1)"])
    string("var r='';try{" + source + "}catch(e){r=e.name}r", "TypeError");
for (const count of [1, 2, 3, 7, 16, 31, 64, 1000]) string("'abc'.repeat(" + count + ")", "abc".repeat(count));
{
    const realm = fresh(), foreign = fresh();
    const descriptor = foreign.stringPrototype.getOwnProperty("repeat");
    if (descriptor === undefined || descriptor.kind !== "data") throw new Error("foreign repeat");
    realm.defineScriptGlobal("foreignRepeat", { value: descriptor.value });
    realm.defineScriptGlobal("foreignRangeErrorPrototype", { value: { kind: "object", object: foreign.getErrorPrototype("RangeError") } });
    string("var r=false;try{foreignRepeat.call('x',-1)}catch(e){r=Object.getPrototypeOf(e)===foreignRangeErrorPrototype}String(r)", "true", realm);
}
for (const source of ["'x'.repeat(1e300)", "'abcd'.repeat(1000000)"]) {
    const prepared = prepareBoundedScript({ id: "repeat-budget", text: "try{" + source + "}catch(e){'caught'}" }, fresh());
    if (prepared.kind !== "ready") throw new Error("budget prepare");
    const result = evaluateScript(createScriptSession({ maxSteps: 200, maxCalls: 32 }), prepared.record).completion;
    if (result.type !== "throw" || result.origin.kind !== "resource-limit") throw new Error("output budget");
}
console.log("String repeat passed");
